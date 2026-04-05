from typing import Generator, Literal, List, Dict
from typing import Literal, List, Dict

from config import (
    GROQ_API_KEY,
    OPENAI_API_KEY,
    GROQ_DEFAULT_MODEL,
    OPENAI_DEFAULT_MODEL,
)


def get_llm_response(
    messages: List[Dict[str, str]],
    provider: Literal["groq", "openai"] = "groq",
    model: str | None = None,
) -> str:
    """
    Send a list of OpenAI-style chat messages to the chosen LLM provider
    and return the assistant's reply text.

    Args:
        messages:  List of {"role": "system|user|assistant", "content": "..."}
        provider:  "groq" or "openai"
        model:     Optional model override; falls back to the provider's default.

    Raises:
        ValueError:  If the API key is missing or provider is unknown.
        Exception:   Propagates any network / API error to the caller.
    """
    if provider == "groq":
        from groq import Groq  # lazy import – only required when used

        if not GROQ_API_KEY:
            raise ValueError(
                "GROQ_API_KEY is not configured. Set it in your .env file."
            )
        client = Groq(api_key=GROQ_API_KEY)
        effective_model = model or GROQ_DEFAULT_MODEL
        response = client.chat.completions.create(
            model=effective_model,
            messages=messages,
        )
        return response.choices[0].message.content

    elif provider == "openai":
        from openai import OpenAI  # lazy import – only required when used

        if not OPENAI_API_KEY:
            raise ValueError(
                "OPENAI_API_KEY is not configured. Set it in your .env file."
            )
        client = OpenAI(api_key=OPENAI_API_KEY)
        effective_model = model or OPENAI_DEFAULT_MODEL
        response = client.chat.completions.create(
            model=effective_model,
            messages=messages,
        )
        return response.choices[0].message.content

    else:
        raise ValueError(
            f"Unsupported LLM provider: '{provider}'. Choose 'groq' or 'openai'."
        )
<<<<<<< HEAD


def stream_llm_response(
    messages: List[Dict[str, str]],
    provider: Literal["groq", "openai"] = "groq",
    model: str | None = None,
) -> Generator[str, None, None]:
    """
    Stream tokens from the LLM one-by-one as a generator.
    Yields each text delta as it arrives from the provider.
    """
    if provider == "groq":
        from groq import Groq

        if not GROQ_API_KEY:
            raise ValueError("GROQ_API_KEY is not configured. Set it in your .env file.")
        client = Groq(api_key=GROQ_API_KEY)
        effective_model = model or GROQ_DEFAULT_MODEL
        stream = client.chat.completions.create(
            model=effective_model,
            messages=messages,
            stream=True,
        )
        for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta

    elif provider == "openai":
        from openai import OpenAI

        if not OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY is not configured. Set it in your .env file.")
        client = OpenAI(api_key=OPENAI_API_KEY)
        effective_model = model or OPENAI_DEFAULT_MODEL
        stream = client.chat.completions.create(
            model=effective_model,
            messages=messages,
            stream=True,
        )
        for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta

    else:
        raise ValueError(
            f"Unsupported LLM provider: '{provider}'. Choose 'groq' or 'openai'."
        )
=======
>>>>>>> origin/master
