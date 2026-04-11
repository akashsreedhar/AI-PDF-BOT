import re
from typing import Dict, List, Sequence, Tuple


_STOPWORDS = {
    "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "has",
    "in", "is", "it", "its", "of", "on", "or", "that", "the", "to", "was",
    "were", "will", "with", "this", "these", "those", "about", "into", "over",
    "what", "when", "where", "which", "who", "why", "how", "can", "could",
    "should", "would", "than", "then", "them", "they", "their", "your", "you",
}


def _normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "")).strip()


def _keywords(text: str) -> set[str]:
    words = re.findall(r"[a-zA-Z0-9]{3,}", (text or "").lower())
    return {word for word in words if word not in _STOPWORDS}


def _score_text(query_terms: set[str], text: str) -> int:
    if not text:
        return 0
    haystack = text.lower()
    score = 0
    for term in query_terms:
        if term in haystack:
            score += 4
    if any(char.isdigit() for char in text):
        score += 1
    return score


def _split_sentences(text: str) -> List[str]:
    normalized = _normalize_text(text)
    if not normalized:
        return []
    parts = re.split(r"(?<=[.!?])\s+", normalized)
    return [part.strip() for part in parts if part.strip()]


def compress_text_for_query(
    text: str,
    query: str,
    max_chars: int = 500,
    min_chars: int = 160,
) -> str:
    normalized = _normalize_text(text)
    if len(normalized) <= max_chars:
        return normalized

    query_terms = _keywords(query)
    sentences = _split_sentences(normalized)
    if not sentences:
        return normalized[: max_chars - 3].rstrip() + "..."

    ranked: List[Tuple[int, int, str]] = []
    for idx, sentence in enumerate(sentences):
        ranked.append((_score_text(query_terms, sentence), -idx, sentence))
    ranked.sort(reverse=True)

    chosen: List[Tuple[int, str]] = []
    total = 0
    for score, neg_idx, sentence in ranked:
        sentence_len = len(sentence) + (1 if chosen else 0)
        if chosen and total >= min_chars and total + sentence_len > max_chars:
            continue
        if not chosen and len(sentence) > max_chars:
            chosen.append((-neg_idx, sentence[: max_chars - 3].rstrip() + "..."))
            total = len(chosen[0][1])
            break
        if total + sentence_len > max_chars:
            continue
        chosen.append((-neg_idx, sentence))
        total += sentence_len
        if total >= min_chars:
            break

    if not chosen:
        return normalized[: max_chars - 3].rstrip() + "..."

    ordered = " ".join(sentence for _, sentence in sorted(chosen, key=lambda item: item[0]))
    if len(ordered) > max_chars:
        return ordered[: max_chars - 3].rstrip() + "..."
    return ordered


def build_document_context_block(
    question: str,
    doc_title: str,
    doc_id: int,
    chunks: Sequence,
    max_chunks: int = 4,
    max_chars_per_chunk: int = 500,
) -> Tuple[str, str]:
    query_terms = _keywords(question)
    scored_chunks: List[Tuple[int, int, str]] = []
    for idx, chunk in enumerate(chunks):
        page_content = getattr(chunk, "page_content", "") or ""
        score = _score_text(query_terms, page_content)
        scored_chunks.append((score, -idx, page_content))
    scored_chunks.sort(reverse=True)

    selected: List[Tuple[int, str]] = []
    for _, neg_idx, content in scored_chunks[:max_chunks]:
        selected.append((-neg_idx, compress_text_for_query(content, question, max_chars=max_chars_per_chunk)))

    selected.sort(key=lambda item: item[0])
    context_lines = [f"[Document {doc_id}: {doc_title}]"]
    for idx, (_, excerpt) in enumerate(selected, 1):
        context_lines.append(f"Excerpt {idx}: {excerpt}")

    contradiction_excerpt = "\n".join(excerpt for _, excerpt in selected)[:1800]
    return "\n".join(context_lines), f"Document {doc_id} ({doc_title}) excerpt:\n{contradiction_excerpt}"


def build_relevant_history(
    question: str,
    history: List[Dict[str, str]],
    keep_recent_messages: int = 4,
    max_selected_turns: int = 3,
) -> Tuple[List[Dict[str, str]], str]:
    if not history:
        return [], ""

    recent_history = history[-keep_recent_messages:] if keep_recent_messages > 0 else []
    older_history = history[:-keep_recent_messages] if keep_recent_messages > 0 else history
    if not older_history:
        return recent_history, ""

    query_terms = _keywords(question)
    turn_candidates: List[Tuple[int, int, str]] = []
    i = 0
    turn_index = 0
    while i < len(older_history):
        message = older_history[i]
        if message.get("role") != "user":
            i += 1
            continue
        assistant_content = ""
        if i + 1 < len(older_history) and older_history[i + 1].get("role") == "assistant":
            assistant_content = older_history[i + 1].get("content", "")
        user_content = message.get("content", "")
        combined = f"{user_content} {assistant_content}".strip()
        score = _score_text(query_terms, combined) + turn_index
        summary = (
            f"Earlier user ask: {compress_text_for_query(user_content, question, max_chars=180)}\n"
            f"Earlier assistant answer: {compress_text_for_query(assistant_content, question, max_chars=260)}"
        )
        turn_candidates.append((score, turn_index, summary))
        turn_index += 1
        i += 2 if assistant_content else 1

    turn_candidates.sort(key=lambda item: (item[0], item[1]), reverse=True)
    selected = sorted(turn_candidates[:max_selected_turns], key=lambda item: item[1])
    if not selected:
        return recent_history, ""

    lines = ["Relevant earlier session context:"]
    for idx, (_, _, summary) in enumerate(selected, 1):
        lines.append(f"{idx}. {summary}")
    return recent_history, "\n".join(lines)


def build_web_context_block(
    question: str,
    web_results: List[Dict[str, str]],
    max_results: int = 3,
    max_chars_per_result: int = 450,
) -> str:
    if not web_results:
        return "No web results passed the confidence threshold."

    query_terms = _keywords(question)
    scored_results: List[Tuple[int, Dict[str, str]]] = []
    for result in web_results:
        content = result.get("content", result.get("snippet", ""))
        score = _score_text(query_terms, f"{result.get('title', '')} {content}")
        score += int(result.get("confidence", "0") or 0)
        scored_results.append((score, result))
    scored_results.sort(key=lambda item: item[0], reverse=True)

    lines = ["Verified live web results (compressed for retrieval):"]
    top_results = [result for _, result in scored_results[:max_results]]
    if top_results and all(result.get("trusted") != "yes" for result in top_results):
        lines.append(
            "Note: no trusted-domain sources passed filters; using lower-trust results with explicit confidence."
        )

    for idx, result in enumerate(top_results, 1):
        content = result.get("content", result.get("snippet", ""))
        excerpt = compress_text_for_query(content, question, max_chars=max_chars_per_result)
        lines.append(f"\n[{idx}] {result.get('title', '')}")
        lines.append(f"Source: {result.get('url', '')}")
        lines.append(f"Domain: {result.get('domain', '')}")
        lines.append(
            f"Confidence: {result.get('confidence', '0')}% ({result.get('confidence_label', 'Low')})"
        )
        lines.append(excerpt)
    return "\n".join(lines)