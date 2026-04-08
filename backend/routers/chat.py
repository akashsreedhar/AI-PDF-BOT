import json
import random
from typing import List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session

from config import DEFAULT_LLM_PROVIDER, WEB_MIN_CONFIDENCE, WEB_TRUSTED_ONLY
from database import get_db
from models import Conversation, Document, UserMemory, UserPreference
from utils.authentication import get_current_user
from utils.llm_client import get_llm_response, stream_llm_response
from utils.rag_builder import load_faiss_index
from utils.web_search import (
    format_web_results,
    format_verified_web_results,
    web_search,
    web_search_verified,
)

TOP_K_CHUNKS = 8          # increased from 5 for better recall
MMR_FETCH_K = 20          # candidate pool for MMR diversity pass

router = APIRouter()


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------

class Message(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    document_id: int
    document_ids: List[int] = []  # optional extra docs for multi-document Q&A
    question: str
    provider: Literal["groq", "openai"] = DEFAULT_LLM_PROVIDER
    model: Optional[str] = None
    conversation_history: List[Message] = []
    live_mode: bool = False          # augment with live web search
    language: str = "English"        # translate answer to this language
    compare_document_id: Optional[int] = None  # second doc for comparison mode
    use_memory: bool = True
    contradiction_check: bool = True

    @field_validator("model", mode="before")
    @classmethod
    def blank_model_to_none(cls, v):
        """Treat empty string or Swagger placeholder 'string' as no override."""
        if v == "" or v == "string":
            return None
        return v


class ChatResponse(BaseModel):
    answer: str
    conversation_id: int
    conversation_history: List[Message]
    live_sources: List[str] = []
    follow_up_questions: List[str] = []  # 3 suggested follow-up questions
    contradiction_report: List[str] = []
    used_document_ids: List[int] = []


class UserPreferencePayload(BaseModel):
    response_tone: str = "balanced"       # concise, balanced, detailed
    response_length: str = "medium"       # short, medium, long
    language: str = "English"
    citation_style: str = "inline"        # inline, footnotes


class UserMemoryPayload(BaseModel):
    memory_key: str
    memory_value: str
    importance: int = 3


class UserMemoryResponse(BaseModel):
    id: int
    memory_key: str
    memory_value: str
    importance: int


def _get_or_create_preferences(db: Session, user_id: int) -> UserPreference:
    pref = db.query(UserPreference).filter(UserPreference.user_id == user_id).first()
    if pref:
        return pref
    pref = UserPreference(user_id=user_id)
    db.add(pref)
    db.commit()
    db.refresh(pref)
    return pref


def _memory_block(db: Session, user_id: int) -> str:
    rows = (
        db.query(UserMemory)
        .filter(UserMemory.user_id == user_id)
        .order_by(UserMemory.importance.desc(), UserMemory.updated_at.desc())
        .limit(5)
        .all()
    )
    if not rows:
        return ""
    lines = ["User memory notes (use only if relevant to the question):"]
    for idx, row in enumerate(rows, 1):
        lines.append(
            f"{idx}. {row.memory_key}: {row.memory_value} (importance {row.importance}/5)"
        )
    return "\n".join(lines)


def _detect_contradictions(
    question: str,
    context_by_doc: List[str],
    provider: Literal["groq", "openai"],
    model: Optional[str],
) -> List[str]:
    if len(context_by_doc) < 2:
        return []
    detector_messages = [
        {
            "role": "system",
            "content": (
                "You detect factual contradictions across document excerpts. "
                "Return ONLY JSON array of short strings. "
                "If no contradictions, return []."
            ),
        },
        {
            "role": "user",
            "content": (
                f"Question: {question}\n\n"
                "Document excerpts:\n"
                + "\n\n".join(context_by_doc)
            ),
        },
    ]
    try:
        raw = get_llm_response(detector_messages, provider=provider, model=model)
        raw = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        data = json.loads(raw)
        if isinstance(data, list):
            return [str(x) for x in data][:5]
    except Exception:
        return []
    return []


@router.get("/chat/preferences", response_model=UserPreferencePayload)
def get_chat_preferences(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    pref = _get_or_create_preferences(db, current_user["id"])
    return UserPreferencePayload(
        response_tone=pref.response_tone,
        response_length=pref.response_length,
        language=pref.language,
        citation_style=pref.citation_style,
    )


@router.put("/chat/preferences", response_model=UserPreferencePayload)
def set_chat_preferences(
    payload: UserPreferencePayload,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    pref = _get_or_create_preferences(db, current_user["id"])
    pref.response_tone = payload.response_tone
    pref.response_length = payload.response_length
    pref.language = payload.language
    pref.citation_style = payload.citation_style
    db.commit()
    db.refresh(pref)
    return UserPreferencePayload(
        response_tone=pref.response_tone,
        response_length=pref.response_length,
        language=pref.language,
        citation_style=pref.citation_style,
    )


@router.get("/chat/memory", response_model=List[UserMemoryResponse])
def get_chat_memory(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    rows = (
        db.query(UserMemory)
        .filter(UserMemory.user_id == current_user["id"])
        .order_by(UserMemory.importance.desc(), UserMemory.updated_at.desc())
        .limit(50)
        .all()
    )
    return [
        UserMemoryResponse(
            id=r.id,
            memory_key=r.memory_key,
            memory_value=r.memory_value,
            importance=r.importance,
        )
        for r in rows
    ]


@router.post("/chat/memory", response_model=UserMemoryResponse, status_code=status.HTTP_201_CREATED)
def add_chat_memory(
    payload: UserMemoryPayload,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    imp = max(1, min(5, payload.importance))
    row = UserMemory(
        user_id=current_user["id"],
        memory_key=payload.memory_key.strip(),
        memory_value=payload.memory_value.strip(),
        importance=imp,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return UserMemoryResponse(
        id=row.id,
        memory_key=row.memory_key,
        memory_value=row.memory_value,
        importance=row.importance,
    )


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.post("/chat", response_model=ChatResponse, status_code=status.HTTP_200_OK)
def chat(
    request: ChatRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    RAG-powered Q&A over a user's document.

    Supports: live web search, translation, document comparison, follow-up suggestions.
    """
    user_id = current_user["id"]

    # -- 1. Multi-document ownership check -----------------------------------
    requested_ids = [request.document_id] + request.document_ids
    if request.compare_document_id:
        requested_ids.append(request.compare_document_id)
    unique_doc_ids = list(dict.fromkeys(requested_ids))

    docs = (
        db.query(Document)
        .filter(Document.id.in_(unique_doc_ids), Document.user_id == user_id)
        .all()
    )
    doc_by_id = {d.id: d for d in docs}
    missing_ids = [d for d in unique_doc_ids if d not in doc_by_id]
    if missing_ids:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document not found or access denied: {missing_ids}",
        )

    # -- 2. Load FAISS for each selected doc ---------------------------------
    context_parts: List[str] = []
    contradiction_inputs: List[str] = []
    for doc_id in unique_doc_ids:
        try:
            vector_store = load_faiss_index(user_id, doc_id)
        except FileNotFoundError:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Vector index not found for document {doc_id}. Please re-upload.",
            )

        k_value = 5 if len(unique_doc_ids) > 1 else TOP_K_CHUNKS
        results = vector_store.max_marginal_relevance_search(
            request.question, k=k_value, fetch_k=MMR_FETCH_K
        )
        doc_context = "\n\n---\n\n".join(chunk.page_content for chunk in results)
        title = doc_by_id[doc_id].doc_title or doc_by_id[doc_id].filename
        context_parts.append(f"[Document {doc_id}: {title}]\n{doc_context}")
        contradiction_inputs.append(
            f"Document {doc_id} ({title}) excerpt:\n{doc_context[:1800]}"
        )

    context = "\n\n====================\n\n".join(context_parts)
    contradiction_report: List[str] = []
    if request.contradiction_check:
        contradiction_report = _detect_contradictions(
            request.question,
            contradiction_inputs,
            request.provider,
            request.model,
        )

    # -- 3. Live web search (optional) ----------------------------------------
    live_sources: List[str] = []
    web_context_block = ""
    if request.live_mode:
        web_results = web_search_verified(
            request.question,
            max_results=8,
            min_confidence=WEB_MIN_CONFIDENCE,
            trusted_only=WEB_TRUSTED_ONLY,
            fallback_to_untrusted=True,
            fallback_min_confidence=35,
        )
        live_sources = [r["url"] for r in web_results if r["url"]]
        web_context_block = format_verified_web_results(web_results)

    # -- 4. Build prompt messages ---------------------------------------------
    user_pref = _get_or_create_preferences(db, user_id)
    memory_block = _memory_block(db, user_id) if request.use_memory else ""

    lang_rule = (
        f"- Respond entirely in {request.language}.\n"
        if request.language and request.language.lower() != "english"
        else f"- Respond entirely in {user_pref.language}.\n"
    )
    preference_rule = (
        f"- Preferred tone: {user_pref.response_tone}.\n"
        f"- Preferred answer length: {user_pref.response_length}.\n"
        f"- Citation style: {user_pref.citation_style}.\n"
    )
    MARKDOWN_RULE = (
        "- Format your response using Markdown only (no HTML tags).\n"
    )
    contradiction_rule = ""
    if contradiction_report:
        contradiction_rule = (
            "- Potential contradictions were detected across selected documents. "
            "Call them out before final conclusions.\n"
        )

    if len(unique_doc_ids) > 1:
        system_content = (
            "You are a multi-document analysis expert. You have been given excerpts from multiple documents.\n\n"
            "Rules:\n"
            "- Identify similarities, differences, contradictions, and unique points.\n"
            "- Structure your answer clearly with sections for each document where helpful.\n"
            "- Do not fabricate information.\n"
            + preference_rule + lang_rule + MARKDOWN_RULE + contradiction_rule
            + ("\n" + memory_block + "\n" if memory_block else "")
            + ("\nDetected contradiction hints:\n- " + "\n- ".join(contradiction_report) + "\n" if contradiction_report else "")
            + "\nCombined document context:\n" + context
        )
    elif request.live_mode:
        system_content = (
            "You are a helpful assistant with access to two sources of information:\n"
            "1. A user-uploaded PDF document (Document Context below)\n"
            "2. Verified live web search results fetched in real-time (Web Search Results below)\n\n"
            "Rules:\n"
            "- Use BOTH sources to answer.\n"
            "- Prefer trusted-domain web claims with confidence >= " + str(WEB_MIN_CONFIDENCE) + "%.\n"
            "- The PDF is authoritative for document-specific content.\n"
            "- If trusted sources are unavailable, you may use lower-trust web results, "
            "but you MUST state confidence % for each such claim.\n"
            "- If the PDF has nothing relevant but verified web results do, answer from verified web results.\n"
            "- Where sources differ, note the discrepancy and prefer the more recent one.\n"
            "- Always cite whether your answer comes from the PDF, the web, or both.\n"
            "- For each web-backed claim, include the source URL and confidence percentage.\n"
            "- If the user asks for prediction/forecast, provide a best-effort prediction using all available "
            "evidence, and include: Prediction, Confidence %, and key assumptions.\n"
            "- Do not fabricate information.\n"
            + preference_rule + lang_rule + MARKDOWN_RULE + contradiction_rule
            + ("\n" + memory_block + "\n" if memory_block else "")
            + ("\nDetected contradiction hints:\n- " + "\n- ".join(contradiction_report) + "\n" if contradiction_report else "")
            + "\nDocument Context:\n" + context + "\n\n" + web_context_block
        )
    else:
        system_content = (
            "You are a precise, helpful assistant that answers questions based on "
            "the provided document context.\n\n"
            "Rules:\n"
            "- Answer only from the evidence in the document context below.\n"
            "- Silently verify each claim is supported by the context before answering.\n"
            "- Do not fabricate information. If the answer is not in the context, say so.\n"
            + preference_rule + lang_rule + MARKDOWN_RULE + contradiction_rule
            + ("\n" + memory_block + "\n" if memory_block else "")
            + ("\nDetected contradiction hints:\n- " + "\n- ".join(contradiction_report) + "\n" if contradiction_report else "")
            + "\nDocument context:\n" + context
        )

    system_message = {"role": "system", "content": system_content}
    history = [{"role": m.role, "content": m.content} for m in request.conversation_history]
    user_message = {"role": "user", "content": request.question}
    messages = [system_message] + history + [user_message]

    # -- 5. Call LLM ---------------------------------------------------------
    try:
        answer = get_llm_response(
            messages, provider=request.provider, model=request.model
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"LLM request failed: {exc}",
        )

    # -- 6. Generate follow-up questions (best-effort, same provider) --------
    follow_up_questions: List[str] = []
    try:
        fu_messages = [
            {
                "role": "system",
                "content": (
                    "You suggest exactly 3 short follow-up questions a user might ask next, "
                    "based on the answer given. Respond with ONLY a JSON array of 3 strings. "
                    "Example: [\"What are the side effects?\", \"How long does it take?\", \"Who is eligible?\"]"
                ),
            },
            {"role": "user", "content": f"Question: {request.question}\nAnswer: {answer}"},
        ]
        raw_fu = get_llm_response(fu_messages, provider=request.provider, model=request.model)
        raw_fu = raw_fu.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        follow_up_questions = json.loads(raw_fu)
        if not isinstance(follow_up_questions, list):
            follow_up_questions = []
    except Exception:
        follow_up_questions = []

    # -- 7. Build updated history & persist ----------------------------------
    updated_history = request.conversation_history + [
        Message(role="user", content=request.question),
        Message(role="assistant", content=answer),
    ]

    conv = Conversation(
        user_id=user_id,
        document_id=request.document_id,
        question=request.question,
        answer=answer,
        conversation_history=json.dumps([m.model_dump() for m in updated_history]),
    )
    db.add(conv)
    db.commit()
    db.refresh(conv)

    # -- 8. Return -----------------------------------------------------------
    return ChatResponse(
        answer=answer,
        conversation_id=conv.id,
        conversation_history=updated_history,
        live_sources=live_sources,
        follow_up_questions=follow_up_questions,
        contradiction_report=contradiction_report,
        used_document_ids=unique_doc_ids,
    )


# ---------------------------------------------------------------------------
# Streaming chat endpoint  (SSE)
# ---------------------------------------------------------------------------

@router.post("/chat/stream")
def chat_stream(
    request: ChatRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Same RAG pipeline as /chat but streams the answer token-by-token via SSE.

    SSE event types:
      {"type": "token",  "content": "<text>"}          — one LLM token
      {"type": "done",   "conversation_id": int,
                         "conversation_history": [...],
                         "live_sources": [...],
                         "follow_up_questions": [...]}  — final metadata
      {"type": "error",  "detail": "<message>"}         — fatal error
    """
    user_id = current_user["id"]

    # -- 1. Multi-document ownership check -----------------------------------
    requested_ids = [request.document_id] + request.document_ids
    if request.compare_document_id:
        requested_ids.append(request.compare_document_id)
    unique_doc_ids = list(dict.fromkeys(requested_ids))

    docs = (
        db.query(Document)
        .filter(Document.id.in_(unique_doc_ids), Document.user_id == user_id)
        .all()
    )
    doc_by_id = {d.id: d for d in docs}
    missing_ids = [d for d in unique_doc_ids if d not in doc_by_id]
    if missing_ids:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document not found or access denied: {missing_ids}",
        )

    # -- 2. Load FAISS index(es) & retrieve via MMR ---------------------------
    context_parts: List[str] = []
    contradiction_inputs: List[str] = []
    for doc_id in unique_doc_ids:
        try:
            vector_store = load_faiss_index(user_id, doc_id)
        except FileNotFoundError:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Vector index not found for document {doc_id}. Please re-upload.",
            )

        k_value = 5 if len(unique_doc_ids) > 1 else TOP_K_CHUNKS
        results = vector_store.max_marginal_relevance_search(
            request.question, k=k_value, fetch_k=MMR_FETCH_K
        )
        doc_context = "\n\n---\n\n".join(chunk.page_content for chunk in results)
        title = doc_by_id[doc_id].doc_title or doc_by_id[doc_id].filename
        context_parts.append(f"[Document {doc_id}: {title}]\n{doc_context}")
        contradiction_inputs.append(
            f"Document {doc_id} ({title}) excerpt:\n{doc_context[:1800]}"
        )

    context = "\n\n====================\n\n".join(context_parts)
    contradiction_report: List[str] = []
    if request.contradiction_check:
        contradiction_report = _detect_contradictions(
            request.question,
            contradiction_inputs,
            request.provider,
            request.model,
        )

    # -- 3. Live web search (optional) ----------------------------------------
    live_sources: List[str] = []
    web_context_block = ""
    if request.live_mode:
        web_results = web_search_verified(
            request.question,
            max_results=8,
            min_confidence=WEB_MIN_CONFIDENCE,
            trusted_only=WEB_TRUSTED_ONLY,
            fallback_to_untrusted=True,
            fallback_min_confidence=35,
        )
        live_sources = [r["url"] for r in web_results if r["url"]]
        web_context_block = format_verified_web_results(web_results)

    # -- 4. Build prompt messages ---------------------------------------------
    user_pref = _get_or_create_preferences(db, user_id)
    memory_block = _memory_block(db, user_id) if request.use_memory else ""

    lang_rule = (
        f"- Respond entirely in {request.language}.\n"
        if request.language and request.language.lower() != "english"
        else f"- Respond entirely in {user_pref.language}.\n"
    )
    preference_rule = (
        f"- Preferred tone: {user_pref.response_tone}.\n"
        f"- Preferred answer length: {user_pref.response_length}.\n"
        f"- Citation style: {user_pref.citation_style}.\n"
    )
    MARKDOWN_RULE = "- Format your response using Markdown only (no HTML tags).\n"
    contradiction_rule = ""
    if contradiction_report:
        contradiction_rule = (
            "- Potential contradictions were detected across selected documents. "
            "Call them out before final conclusions.\n"
        )

    if len(unique_doc_ids) > 1:
        system_content = (
            "You are a multi-document analysis expert. You have been given excerpts from multiple documents.\n\n"
            "Rules:\n"
            "- Identify similarities, differences, contradictions, and unique points.\n"
            "- Structure your answer clearly with sections for each document where helpful.\n"
            "- Do not fabricate information.\n"
            + preference_rule + lang_rule + MARKDOWN_RULE + contradiction_rule
            + ("\n" + memory_block + "\n" if memory_block else "")
            + ("\nDetected contradiction hints:\n- " + "\n- ".join(contradiction_report) + "\n" if contradiction_report else "")
            + "\nCombined document context:\n" + context
        )
    elif request.live_mode:
        system_content = (
            "You are a helpful assistant with access to two sources:\n"
            "1. A user-uploaded PDF document\n"
            "2. Verified live web search results\n\n"
            "Rules:\n"
            "- Use BOTH sources.\n"
            "- Prefer trusted-domain web claims with confidence >= " + str(WEB_MIN_CONFIDENCE) + "%.\n"
            "- The PDF is authoritative for document-specific content.\n"
            "- If trusted sources are unavailable, use lower-trust web results and show confidence % for each claim.\n"
            "- Always cite whether your answer comes from the PDF, the web, or both.\n"
            "- For each web-backed claim, include the source URL and confidence percentage.\n"
            "- If the user asks for prediction/forecast, provide a best-effort prediction using all evidence "
            "with Prediction, Confidence %, and assumptions.\n"
            "- Do not fabricate information.\n"
            + preference_rule + lang_rule + MARKDOWN_RULE + contradiction_rule
            + ("\n" + memory_block + "\n" if memory_block else "")
            + ("\nDetected contradiction hints:\n- " + "\n- ".join(contradiction_report) + "\n" if contradiction_report else "")
            + "\nDocument Context:\n" + context + "\n\n" + web_context_block
        )
    else:
        system_content = (
            "You are a precise, helpful assistant that answers questions based on "
            "the provided document context.\n\n"
            "Rules:\n"
            "- Answer only from the evidence in the document context below.\n"
            "- Silently verify each claim is supported by the context before answering.\n"
            "- Do not fabricate information. If the answer is not in the context, say so.\n"
            + preference_rule + lang_rule + MARKDOWN_RULE + contradiction_rule
            + ("\n" + memory_block + "\n" if memory_block else "")
            + ("\nDetected contradiction hints:\n- " + "\n- ".join(contradiction_report) + "\n" if contradiction_report else "")
            + "\nDocument context:\n" + context
        )

    system_message = {"role": "system", "content": system_content}
    history = [{"role": m.role, "content": m.content} for m in request.conversation_history]
    user_message = {"role": "user", "content": request.question}
    messages = [system_message] + history + [user_message]

    # -- 5. Generator: stream tokens then emit done ---------------------------
    def generate():
        collected: List[str] = []
        try:
            for token in stream_llm_response(
                messages, provider=request.provider, model=request.model
            ):
                collected.append(token)
                yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"
        except Exception as exc:
            yield f"data: {json.dumps({'type': 'error', 'detail': str(exc)})}\n\n"
            return

        answer = "".join(collected)

        # Follow-up questions (best-effort)
        follow_up_questions: List[str] = []
        try:
            fu_messages = [
                {
                    "role": "system",
                    "content": (
                        "You suggest exactly 3 short follow-up questions a user might ask next, "
                        "based on the answer given. Respond with ONLY a JSON array of 3 strings. "
                        'Example: ["What are the side effects?", "How long does it take?", "Who is eligible?"]'
                    ),
                },
                {"role": "user", "content": f"Question: {request.question}\nAnswer: {answer}"},
            ]
            raw_fu = get_llm_response(fu_messages, provider=request.provider, model=request.model)
            raw_fu = raw_fu.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
            follow_up_questions = json.loads(raw_fu)
            if not isinstance(follow_up_questions, list):
                follow_up_questions = []
        except Exception:
            follow_up_questions = []

        # Persist to DB
        updated_history = request.conversation_history + [
            Message(role="user", content=request.question),
            Message(role="assistant", content=answer),
        ]
        conv = Conversation(
            user_id=user_id,
            document_id=request.document_id,
            question=request.question,
            answer=answer,
            conversation_history=json.dumps([m.model_dump() for m in updated_history]),
        )
        db.add(conv)
        db.commit()
        db.refresh(conv)

        done_payload = {
            "type": "done",
            "conversation_id": conv.id,
            "conversation_history": [m.model_dump() for m in updated_history],
            "live_sources": live_sources,
            "follow_up_questions": follow_up_questions,
            "contradiction_report": contradiction_report,
            "used_document_ids": unique_doc_ids,
        }
        yield f"data: {json.dumps(done_payload)}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


# ---------------------------------------------------------------------------
# Chat history endpoint
# ---------------------------------------------------------------------------

class ConversationRecord(BaseModel):
    id: int
    question: str
    answer: str
    created_at: str
    conversation_history: List[Message]

    class Config:
        from_attributes = True


@router.get("/chat/history/{document_id}", response_model=List[ConversationRecord])
def get_chat_history(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Return all saved Q&A turns for a specific document, newest first.
    Only returns conversations that belong to the authenticated user.
    """
    user_id = current_user["id"]

    # Verify the document belongs to this user
    doc = (
        db.query(Document)
        .filter(Document.id == document_id, Document.user_id == user_id)
        .first()
    )
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found or access denied.",
        )

    conversations = (
        db.query(Conversation)
        .filter(Conversation.document_id == document_id, Conversation.user_id == user_id)
        .order_by(Conversation.created_at.desc())
        .all()
    )

    return [
        ConversationRecord(
            id=c.id,
            question=c.question,
            answer=c.answer,
            created_at=c.created_at.isoformat(),
            conversation_history=[
                Message(**m) for m in json.loads(c.conversation_history or "[]")
            ],
        )
        for c in conversations
    ]


# ---------------------------------------------------------------------------
# Quiz Me endpoint
# ---------------------------------------------------------------------------

class QuizRequest(BaseModel):
    document_id: int
    provider: Literal["groq", "openai"] = DEFAULT_LLM_PROVIDER
    model: Optional[str] = None
    num_questions: int = 5   # 1-20
    language: str = "English"
    live_mode: bool = False  # if True, enrich quiz with live web context

    @field_validator("model", mode="before")
    @classmethod
    def blank_model_to_none(cls, v):
        if v == "" or v == "string":
            return None
        return v


class QuizQuestion(BaseModel):
    question: str
    options: List[str]          # 4 options  [A, B, C, D]
    correct_index: int          # 0-based index into options
    explanation: str


class QuizResponse(BaseModel):
    questions: List[QuizQuestion]


@router.post("/quiz", response_model=QuizResponse, status_code=status.HTTP_200_OK)
def generate_quiz(
    request: QuizRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Generate MCQ quiz questions from a document using the LLM."""
    user_id = current_user["id"]
    num_q = max(1, min(20, request.num_questions))

    doc = (
        db.query(Document)
        .filter(Document.id == request.document_id, Document.user_id == user_id)
        .first()
    )
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    try:
        vector_store = load_faiss_index(user_id, request.document_id)
    except FileNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vector index not found.")

    # --- Randomised chunk retrieval so each run surfaces different content ---
    _QUERY_POOL = [
        "key concepts and main ideas",
        "important facts and data",
        "definitions and terminology",
        "examples and case studies",
        "conclusions and takeaways",
        "arguments and evidence",
        "processes and steps",
        "comparisons and differences",
        "causes and effects",
        "statistics and numbers",
    ]
    chosen_queries = random.sample(_QUERY_POOL, k=min(4, len(_QUERY_POOL)))
    seen, all_chunks = set(), []
    for q in chosen_queries:
        for chunk in vector_store.similarity_search(q, k=6):
            if chunk.page_content not in seen:
                seen.add(chunk.page_content)
                all_chunks.append(chunk)
    random.shuffle(all_chunks)
    context = "\n\n".join(c.page_content for c in all_chunks)[:6000]

    # --- Live mode: enrich with current web information on the document topic ---
    web_context = ""
    if request.live_mode:
        topic = doc.doc_title or doc.filename or "the document topic"
        search_query = f"{topic} key concepts important facts"
        web_results = web_search(search_query, max_results=5)
        web_context = format_web_results(web_results)

    lang_note = f" All questions and options must be in {request.language}." if request.language.lower() != "english" else ""

    if request.live_mode and web_context:
        source_instruction = (
            f"You are a quiz generator. Create exactly {num_q} multiple-choice questions "
            f"using BOTH the document context AND the live web information provided below.{lang_note}\n"
            "Mix document-based questions and current/external knowledge questions about the same topic.\n"
            "Ensure every run produces a DIFFERENT random selection of questions.\n"
            "Respond with ONLY a valid JSON array. Each element must have:\n"
            '{"question": "...", "options": ["A. ...", "B. ...", "C. ...", "D. ..."], '
            '"correct_index": 0, "explanation": "brief explanation"}\n'
            "correct_index is the 0-based index of the correct option."
        )
        user_content = (
            f"Document context:\n{context}\n\n"
            f"Live web information:\n{web_context}"
        )
    else:
        source_instruction = (
            f"You are a quiz generator. Create exactly {num_q} multiple-choice questions "
            f"based strictly on the document context provided.{lang_note}\n"
            "Ensure every run produces a DIFFERENT random selection of questions by varying "
            "which facts and sections you pick from.\n"
            "Respond with ONLY a valid JSON array. Each element must have:\n"
            '{"question": "...", "options": ["A. ...", "B. ...", "C. ...", "D. ..."], '
            '"correct_index": 0, "explanation": "brief explanation"}\n'
            "correct_index is the 0-based index of the correct option."
        )
        user_content = f"Document context:\n{context}"

    messages = [
        {"role": "system", "content": source_instruction},
        {"role": "user", "content": user_content},
    ]

    try:
        raw = get_llm_response(messages, provider=request.provider, model=request.model)
        raw = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        questions_data = json.loads(raw)
        questions = [QuizQuestion(**q) for q in questions_data[:num_q]]
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to generate quiz: {exc}",
        )

    return QuizResponse(questions=questions)
