import re
from typing import Dict, List
from urllib.parse import urlparse


_STOPWORDS = {
    "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "has",
    "in", "is", "it", "its", "of", "on", "or", "that", "the", "to", "was",
    "were", "will", "with", "this", "these", "those", "about", "into", "over",
}

# High-trust domains; this is a heuristic and not a legal guarantee of correctness.
_TRUSTED_DOMAIN_SUFFIXES = (
    ".gov",
    ".edu",
    ".ac.uk",
    "who.int",
    "un.org",
    "oecd.org",
    "worldbank.org",
    "imf.org",
    "wikipedia.org",
    "nature.com",
    "science.org",
    "nih.gov",
    "cdc.gov",
    "nasa.gov",
)


def web_search(query: str, max_results: int = 4) -> List[Dict[str, str]]:
    """
    Perform a DuckDuckGo text search and return a list of result dicts.

    Each result dict has:
        title   – page title
        url     – source URL
        snippet – short text excerpt

    Falls back to an empty list if the search library is unavailable or
    the network request fails, so it never hard-crashes the chat endpoint.
    """
    try:
        from ddgs import DDGS  # lazy import

        results = []
        with DDGS() as ddgs:
            for r in ddgs.text(query, max_results=max_results):
                results.append({
                    "title": r.get("title", ""),
                    "url": r.get("href", ""),
                    "snippet": r.get("body", ""),
                })
        return results
    except Exception as exc:
        print(f"[web_search] search failed: {exc}")
        return []


def _extract_domain(url: str) -> str:
    try:
        return (urlparse(url).hostname or "").lower()
    except Exception:
        return ""


def _is_trusted_domain(domain: str) -> bool:
    if not domain:
        return False
    return any(domain == suffix or domain.endswith(suffix) for suffix in _TRUSTED_DOMAIN_SUFFIXES)


def _keywords(text: str) -> set[str]:
    words = re.findall(r"[a-zA-Z0-9]{3,}", text.lower())
    return {w for w in words if w not in _STOPWORDS}


def _content_quality_score(title: str, snippet: str) -> int:
    score = 0
    combined = f"{title} {snippet}".strip()
    if len(combined) >= 80:
        score += 8
    if re.search(r"\b(19|20)\d{2}\b", combined):
        score += 6
    if re.search(r"\d", combined):
        score += 6
    return min(score, 20)


def _domain_score(domain: str) -> int:
    if _is_trusted_domain(domain):
        return 50
    if domain:
        return 25
    return 0


def _agreement_score(index: int, keyword_sets: List[set[str]]) -> int:
    # Reward results that share core terms with multiple independent results.
    overlaps = 0
    current = keyword_sets[index]
    if not current:
        return 0
    for i, other in enumerate(keyword_sets):
        if i == index or not other:
            continue
        if len(current.intersection(other)) >= 3:
            overlaps += 1
    if overlaps >= 3:
        return 30
    if overlaps >= 2:
        return 20
    if overlaps >= 1:
        return 10
    return 0


def _confidence_label(score: int) -> str:
    if score >= 90:
        return "Very High"
    if score >= 75:
        return "High"
    if score >= 60:
        return "Medium"
    return "Low"


def web_search_verified(
    query: str,
    max_results: int = 8,
    min_confidence: int = 70,
    trusted_only: bool = True,
    fallback_to_untrusted: bool = True,
    fallback_min_confidence: int = 35,
) -> List[Dict[str, str]]:
    """
    Search web results and attach a heuristic confidence score (0-100).

    Confidence components:
    - Domain trust score
    - Content quality score
    - Cross-result agreement score

    Important: This is a risk-reduction heuristic, not proof of truth.
    """
    min_confidence = max(0, min(100, min_confidence))
    fallback_min_confidence = max(0, min(100, fallback_min_confidence))

    raw_results = web_search(query, max_results=max_results)
    keyword_sets = [_keywords(f"{r.get('title', '')} {r.get('snippet', '')}") for r in raw_results]

    scored_results: List[Dict[str, str]] = []
    for i, r in enumerate(raw_results):
        url = r.get("url", "")
        domain = _extract_domain(url)
        trusted = _is_trusted_domain(domain)

        score = (
            _domain_score(domain)
            + _content_quality_score(r.get("title", ""), r.get("snippet", ""))
            + _agreement_score(i, keyword_sets)
        )
        score = max(0, min(100, score))

        scored_results.append(
            {
                "title": r.get("title", ""),
                "url": url,
                "snippet": r.get("snippet", ""),
                "domain": domain,
                "trusted": "yes" if trusted else "no",
                "confidence": str(score),
                "confidence_label": _confidence_label(score),
            }
        )

    def _filter_results(only_trusted: bool, threshold: int) -> List[Dict[str, str]]:
        filtered: List[Dict[str, str]] = []
        for row in scored_results:
            is_trusted = row.get("trusted") == "yes"
            if only_trusted and not is_trusted:
                continue
            if int(row.get("confidence", "0")) < threshold:
                continue
            filtered.append(row)
        filtered.sort(key=lambda x: int(x.get("confidence", "0")), reverse=True)
        return filtered

    verified_results = _filter_results(trusted_only, min_confidence)

    # If trusted mode yields nothing, fall back to all domains with a lower threshold.
    if trusted_only and fallback_to_untrusted and not verified_results:
        verified_results = _filter_results(False, fallback_min_confidence)

    return verified_results


def format_web_results(results: List[Dict[str, str]]) -> str:
    """
    Convert a list of web-search result dicts into a readable block
    that can be appended to the LLM system prompt.
    """
    if not results:
        return ""
    lines = ["Live web search results:"]
    for i, r in enumerate(results, 1):
        lines.append(f"\n[{i}] {r['title']}")
        lines.append(f"Source: {r['url']}")
        lines.append(r["snippet"])
    return "\n".join(lines)


def format_verified_web_results(results: List[Dict[str, str]]) -> str:
    """Format confidence-scored web results for prompt injection."""
    if not results:
        return "No web results passed the confidence threshold."

    lines = ["Verified live web results (confidence-scored):"]
    if all(r.get("trusted") != "yes" for r in results):
        lines.append(
            "Note: no trusted-domain sources passed filters; using lower-trust results with explicit confidence."
        )
    for i, r in enumerate(results, 1):
        lines.append(f"\n[{i}] {r.get('title', '')}")
        lines.append(f"Source: {r.get('url', '')}")
        lines.append(f"Domain: {r.get('domain', '')}")
        lines.append(f"Trusted Source: {r.get('trusted', 'no')}")
        lines.append(
            f"Confidence: {r.get('confidence', '0')}% ({r.get('confidence_label', 'Low')})"
        )
        lines.append(r.get("snippet", ""))
    return "\n".join(lines)
