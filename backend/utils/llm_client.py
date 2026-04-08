from typing import Generator, Literal, List, Dict

from config import (
    GROQ_API_KEYS,
    OPENAI_API_KEY,
    GROQ_DEFAULT_MODEL,
    OPENAI_DEFAULT_MODEL,
)

# Errors that signal a Groq key should be skipped (rate-limit / quota exhausted).
_GROQ_SKIP_ERRORS = ("rate_limit_exceeded", "rate limit", "429", "quota")


def _is_groq_rate_limit(exc: Exception) -> bool:
    """Return True if the exception indicates a Groq rate-limit or quota error."""
    msg = str(exc).lower()
    return any(marker in msg for marker in _GROQ_SKIP_ERRORS)


def _try_groq(messages: List[Dict[str, str]], model: str) -> str:
    """
    Attempt the request against each Groq key in order.
    Returns the assistant reply on success, or raises if all keys are exhausted.
    """
    from groq import Groq  # lazy import

    if not GROQ_API_KEYS:
        raise ValueError("No GROQ_API_KEY_* keys configured.")

    last_exc: Exception | None = None
    for key in GROQ_API_KEYS:
        try:
            client = Groq(api_key=key)
            response = client.chat.completions.create(model=model, messages=messages)
            return response.choices[0].message.content
        except Exception as exc:  # noqa: BLE001
            last_exc = exc
            if _is_groq_rate_limit(exc):
                continue  # try next key
            raise  # non-rate-limit error – propagate immediately

    raise last_exc  # all keys exhausted


def _stream_groq(
    messages: List[Dict[str, str]], model: str
) -> Generator[str, None, None]:
    """Stream tokens from Groq, trying each key in order on rate-limit errors."""
    from groq import Groq

    if not GROQ_API_KEYS:
        raise ValueError("No GROQ_API_KEY_* keys configured.")

    last_exc: Exception | None = None
    for key in GROQ_API_KEYS:
        try:
            client = Groq(api_key=key)
            stream = client.chat.completions.create(
                model=model, messages=messages, stream=True
            )
            for chunk in stream:
                delta = chunk.choices[0].delta.content
                if delta:
                    yield delta
            return  # success – stop iterating keys
        except Exception as exc:  # noqa: BLE001
            last_exc = exc
            if _is_groq_rate_limit(exc):
                continue
            raise

    raise last_exc  # all keys exhausted


def _call_openai(messages: List[Dict[str, str]], model: str) -> str:
    from openai import OpenAI

    if not OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY is not configured. Set it in your .env file.")
    client = OpenAI(api_key=OPENAI_API_KEY)
    response = client.chat.completions.create(model=model, messages=messages)
    return response.choices[0].message.content


def _stream_openai(
    messages: List[Dict[str, str]], model: str
) -> Generator[str, None, None]:
    from openai import OpenAI

    if not OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY is not configured. Set it in your .env file.")
    client = OpenAI(api_key=OPENAI_API_KEY)
    stream = client.chat.completions.create(model=model, messages=messages, stream=True)
    for chunk in stream:
        delta = chunk.choices[0].delta.content
        if delta:
            yield delta


def get_llm_response(
    messages: List[Dict[str, str]],
    provider: Literal["groq", "openai"] = "groq",
    model: str | None = None,
) -> str:
    """
    Send chat messages to the chosen LLM provider and return the reply text.

    When provider is "groq":
      - Tries each configured GROQ_API_KEY_1 / _2 / _3 in sequence.
      - If a key hits a rate-limit / quota error the next key is attempted.
      - If ALL Groq keys are exhausted, falls back automatically to OpenAI
        using gpt-4o-mini.

    Args:
        messages:  List of {"role": "system|user|assistant", "content": "..."}
        provider:  "groq" (default) or "openai"
        model:     Optional model override; falls back to the provider's default.

    Raises:
        ValueError:  If required API keys are missing.
        Exception:   Propagates non-rate-limit API / network errors.
    """
    if provider == "groq":
        groq_model = model or GROQ_DEFAULT_MODEL
        try:
            return _try_groq(messages, groq_model)
        except Exception as groq_exc:
            if not _is_groq_rate_limit(groq_exc) and GROQ_API_KEYS:
                raise  # unrelated error from Groq – don't swallow it
            # All Groq keys exhausted – fall back to OpenAI gpt-4o-mini
            openai_model = "gpt-4o-mini"
            return _call_openai(messages, openai_model)

    elif provider == "openai":
        return _call_openai(messages, model or OPENAI_DEFAULT_MODEL)

    else:
        raise ValueError(
            f"Unsupported LLM provider: '{provider}'. Choose 'groq' or 'openai'."
        )


def stream_llm_response(
    messages: List[Dict[str, str]],
    provider: Literal["groq", "openai"] = "groq",
    model: str | None = None,
) -> Generator[str, None, None]:
    """
    Stream tokens from the LLM one-by-one as a generator.

    Same fallback behaviour as get_llm_response: when all Groq keys are
    rate-limited the stream automatically continues from OpenAI gpt-4o-mini.
    """
    if provider == "groq":
        groq_model = model or GROQ_DEFAULT_MODEL
        try:
            yield from _stream_groq(messages, groq_model)
        except Exception as groq_exc:
            if not _is_groq_rate_limit(groq_exc) and GROQ_API_KEYS:
                raise
            # Fallback to OpenAI gpt-4o-mini
            yield from _stream_openai(messages, "gpt-4o-mini")

    elif provider == "openai":
        yield from _stream_openai(messages, model or OPENAI_DEFAULT_MODEL)

    else:
        raise ValueError(
            f"Unsupported LLM provider: '{provider}'. Choose 'groq' or 'openai'."
        )

