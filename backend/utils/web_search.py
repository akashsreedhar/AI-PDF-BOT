import re
import time
from typing import Dict, List, Optional
from urllib.parse import urlparse
import logging

try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    import urllib.request
    import urllib.error
    REQUESTS_AVAILABLE = False

try:
    from bs4 import BeautifulSoup
    BS4_AVAILABLE = True
except ImportError:
    BS4_AVAILABLE = False

logger = logging.getLogger(__name__)

# User agent to avoid being blocked by some websites
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"


_STOPWORDS = {
    "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "has",
    "in", "is", "it", "its", "of", "on", "or", "that", "the", "to", "was",
    "were", "will", "with", "this", "these", "those", "about", "into", "over",
}

# High-trust domains; this is a heuristic and not a legal guarantee of correctness.
_TRUSTED_DOMAIN_SUFFIXES = (
    # Government & international bodies
    ".gov",
    ".edu",
    ".ac.uk",
    "who.int",
    "un.org",
    "oecd.org",
    "worldbank.org",
    "imf.org",
    "nih.gov",
    "cdc.gov",
    "nasa.gov",
    # Academic / Scientific
    "wikipedia.org",
    "nature.com",
    "science.org",
    "pubmed.ncbi.nlm.nih.gov",
    "scholar.google.com",
    # Major news outlets
    "bbc.com",
    "bbc.co.uk",
    "reuters.com",
    "apnews.com",
    "theguardian.com",
    "nytimes.com",
    "bloomberg.com",
    "wsj.com",
    "thehindu.com",
    "ndtv.com",
    "timesofindia.indiatimes.com",
    "hindustantimes.com",
    "indianexpress.com",
    "theprint.in",
    "aljazeera.com",
    # Sports
    "espncricinfo.com",
    "cricbuzz.com",
    "iplt20.com",
    "bcci.tv",
    "espn.com",
    "espn.in",
    "skysports.com",
    "cricketworld.com",
    "flashscore.com",
    "sofascore.com",
    "livescore.com",
    # Finance / Business
    "investopedia.com",
    "moneycontrol.com",
    "economictimes.indiatimes.com",
    "businessinsider.com",
    "cnbc.com",
    "ft.com",
)

# Medium-trust domains that should also be scraped (lower confidence score)
_MEDIUM_TRUST_DOMAINS = (
    "medium.com",
    "stackoverflow.com",
    "github.com",
    "techcrunch.com",
    "wired.com",
    "theverge.com",
    "arstechnica.com",
    "reddit.com",
    "quora.com",
    "zeenews.india.com",
    "news18.com",
    "crictracker.com",
    "sportskeeda.com",
)


def _fetch_page_content(url: str, timeout: int = 8) -> Optional[str]:
    """
    Fetch the raw HTML content of a webpage.
    
    Args:
        url: The URL to fetch
        timeout: Request timeout in seconds
        
    Returns:
        HTML content as string, or None if fetch fails
    """
    if not url:
        return None
        
    try:
        if REQUESTS_AVAILABLE:
            response = requests.get(
                url,
                headers={"User-Agent": USER_AGENT},
                timeout=timeout,
                allow_redirects=True
            )
            response.raise_for_status()
            return response.text
        else:
            # Fallback to urllib
            req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(req, timeout=timeout) as response:
                return response.read().decode('utf-8', errors='ignore')
    except Exception as exc:
        logger.debug(f"[fetch_page_content] Failed to fetch {url}: {exc}")
        return None


def _extract_main_text(html_content: str) -> str:
    """
    Extract main text content from HTML, removing boilerplate, scripts, styles, etc.
    
    Args:
        html_content: Raw HTML content
        
    Returns:
        Cleaned text content
    """
    if not BS4_AVAILABLE or not html_content:
        return ""
    
    try:
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # Remove script and style elements
        for script in soup(["script", "style", "nav", "footer", "noscript"]):
            script.decompose()
        
        # Extract text from main content areas
        main_content = None
        for tag in ["main", "article", "section"]:
            main_content = soup.find(tag)
            if main_content:
                break
        
        if not main_content:
            main_content = soup.find("body") or soup
        
        # Get text and clean it up
        text = main_content.get_text(separator="\n", strip=True)
        
        # Remove excessive whitespace
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        text = '\n'.join(lines)
        
        # Limit length
        max_chars = 8000
        if len(text) > max_chars:
            text = text[:max_chars]
        
        return text
    except Exception as exc:
        logger.debug(f"[extract_main_text] Failed to parse HTML: {exc}")
        return ""


def _is_content_substantial(text: str, min_length: int = 200) -> bool:
    """Check if extracted content is substantial enough to be useful."""
    return len(text.strip()) >= min_length


def web_search(query: str, max_results: int = 4, scrape_content: bool = True) -> List[Dict[str, str]]:
    """
    Perform a DuckDuckGo text search and optionally scrape content from results.

    Each result dict has:
        title        – page title
        url          – source URL
        snippet      – short text excerpt from DuckDuckGo
        content      – full page content (if scrape_content=True)
        content_type – 'scraped' or 'snippet'

    Falls back to an empty list if the search library is unavailable or
    the network request fails, so it never hard-crashes the chat endpoint.
    """
    try:
        from ddgs import DDGS  # lazy import

        results = []
        with DDGS() as ddgs:
            for r in ddgs.text(query, max_results=max_results):
                result = {
                    "title": r.get("title", ""),
                    "url": r.get("href", ""),
                    "snippet": r.get("body", ""),
                    "content": r.get("body", ""),
                    "content_type": "snippet",
                }
                
                # Try to scrape full content from all domains
                if scrape_content:
                    try:
                        html = _fetch_page_content(result["url"])
                        if html:
                            scraped_text = _extract_main_text(html)
                            if _is_content_substantial(scraped_text):
                                result["content"] = scraped_text
                                result["content_type"] = "scraped"
                                time.sleep(0.15)  # Rate limiting
                    except Exception as exc:
                        logger.debug(f"[web_search] Scraping failed for {result['url']}: {exc}")
                
                results.append(result)
        return results
    except Exception as exc:
        logger.error(f"[web_search] search failed: {exc}")
        return []


def _extract_domain(url: str) -> str:
    try:
        return (urlparse(url).hostname or "").lower()
    except Exception:
        return ""


def _is_trusted_domain(domain: str) -> bool:
    if not domain:
        return False
    return any(domain == suffix.lstrip(".") or domain.endswith(suffix) for suffix in _TRUSTED_DOMAIN_SUFFIXES)


def _is_medium_trust_domain(domain: str) -> bool:
    if not domain:
        return False
    return any(domain == d or domain.endswith("." + d) for d in _MEDIUM_TRUST_DOMAINS)


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
    if _is_medium_trust_domain(domain):
        return 35
    if domain:
        return 20
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
    scrape_content: bool = True,
) -> List[Dict[str, str]]:
    """
    Search web results and attach a heuristic confidence score (0-100).
    Optionally scrapes full page content from trusted sources.

    Confidence components:
    - Domain trust score
    - Content quality score
    - Cross-result agreement score

    Important: This is a risk-reduction heuristic, not proof of truth.
    Args:
        query: Search query string
        max_results: Maximum number of search results to retrieve
        min_confidence: Minimum confidence score threshold (0-100)
        trusted_only: Only return results from trusted domains
        fallback_to_untrusted: If trusted results don't meet threshold, try untrusted
        fallback_min_confidence: Lower confidence threshold for fallback
        scrape_content: If True, scrape full content from trusted domain results
    """
    min_confidence = max(0, min(100, min_confidence))
    fallback_min_confidence = max(0, min(100, fallback_min_confidence))

    raw_results = web_search(query, max_results=max_results, scrape_content=scrape_content)
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
                "content": r.get("content", r.get("snippet", "")),
                "content_type": r.get("content_type", "snippet"),
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
    Prioritizes scraped content over snippets.
    """
    if not results:
        return ""
    lines = ["Live web search results:"]
    for i, r in enumerate(results, 1):
        lines.append(f"\n[{i}] {r['title']}")
        lines.append(f"Source: {r['url']}")
        
        # Use full scraped content if available, otherwise use snippet
        content = r.get("content", r.get("snippet", ""))
        if r.get("content_type") == "scraped":
            # For scraped content, take first 1500 chars to keep prompt manageable
            content = content[:1500]
            lines.append(f"Content source: Full page (scraped)")
        
        lines.append(content)
    return "\n".join(lines)


def format_verified_web_results(results: List[Dict[str, str]]) -> str:
    """Format confidence-scored web results for prompt injection.
    Prioritizes scraped content over snippets."""
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
        
        # Use full scraped content if available, otherwise use snippet
        content = r.get("content", r.get("snippet", ""))
        if r.get("content_type") == "scraped":
            lines.append(f"Content source: Full page content (scraped)")
            # Limit scraped content to keep prompt manageable
            content = content[:1500]
        else:
            lines.append(f"Content source: Search snippet")
        
        lines.append(content)
    return "\n".join(lines)
