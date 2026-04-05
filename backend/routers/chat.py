import json
from typing import List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session

from config import DEFAULT_LLM_PROVIDER
from database import get_db
from models import Conversation, Document
from utils.authentication import get_current_user
from utils.llm_client import get_llm_response, stream_llm_response
from utils.rag_builder import load_faiss_index
from utils.web_search import format_web_results, web_search

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
    question: str
    provider: Literal["groq", "openai"] = DEFAULT_LLM_PROVIDER
    model: Optional[str] = None
    conversation_history: List[Message] = []
    live_mode: bool = False          # augment with live web search
    language: str = "English"        # translate answer to this language
    compare_document_id: Optional[int] = None  # second doc for comparison mode

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

    # -- 1. Ownership check ---------------------------------------------------
    doc = (
        db.query(Document)
        .filter(Document.id == request.document_id, Document.user_id == user_id)
        .first()
    )
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found or access denied.",
        )

    # -- 2. Load FAISS index(es) & retrieve via MMR ---------------------------
    try:
        vector_store = load_faiss_index(user_id, request.document_id)
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vector index not found for this document. Please re-upload the file.",
        )

    results = vector_store.max_marginal_relevance_search(
        request.question, k=TOP_K_CHUNKS, fetch_k=MMR_FETCH_K
    )
    context = "\n\n---\n\n".join(chunk.page_content for chunk in results)

    # -- 2b. Comparison mode: merge context from second document --------------
    compare_context = ""
    if request.compare_document_id:
        comp_doc = (
            db.query(Document)
            .filter(Document.id == request.compare_document_id, Document.user_id == user_id)
            .first()
        )
        if comp_doc:
            try:
                vs2 = load_faiss_index(user_id, request.compare_document_id)
                chunks2 = vs2.max_marginal_relevance_search(
                    request.question, k=TOP_K_CHUNKS, fetch_k=MMR_FETCH_K
                )
                compare_context = "\n\n---\n\n".join(c.page_content for c in chunks2)
            except FileNotFoundError:
                pass

    # -- 3. Live web search (optional) ----------------------------------------
    live_sources: List[str] = []
    web_context_block = ""
    if request.live_mode:
        web_results = web_search(request.question, max_results=4)
        live_sources = [r["url"] for r in web_results if r["url"]]
        web_context_block = format_web_results(web_results)

    # -- 4. Build prompt messages ---------------------------------------------
    lang_rule = (
        f"- Respond entirely in {request.language}.\n"
        if request.language and request.language.lower() != "english"
        else ""
    )
    MARKDOWN_RULE = (
        "- Format your response using Markdown only (no HTML tags).\n"
    )

    if compare_context:
        system_content = (
            "You are a document comparison expert. You have been given excerpts from two documents.\n\n"
            "Rules:\n"
            "- Identify similarities, differences, contradictions, and unique points.\n"
            "- Structure your answer clearly with sections for each document where helpful.\n"
            "- Do not fabricate information.\n"
            + lang_rule + MARKDOWN_RULE +
            "\n\nDocument 1 context:\n" + context +
            "\n\nDocument 2 context:\n" + compare_context
        )
    elif request.live_mode:
        system_content = (
            "You are a helpful assistant with access to two sources of information:\n"
            "1. A user-uploaded PDF document (Document Context below)\n"
            "2. Live web search results fetched in real-time (Web Search Results below)\n\n"
            "Rules:\n"
            "- Use BOTH sources to answer. Web results are authoritative for current/real-time facts.\n"
            "- The PDF is authoritative for document-specific content.\n"
            "- If the PDF has nothing relevant but the web results do, answer from the web results.\n"
            "- Where sources differ, note the discrepancy and prefer the more recent one.\n"
            "- Always cite whether your answer comes from the PDF, the web, or both.\n"
            "- Do not fabricate information.\n"
            + lang_rule + MARKDOWN_RULE +
            "\nDocument Context:\n" + context + "\n\n" + web_context_block
        )
    else:
        system_content = (
            "You are a precise, helpful assistant that answers questions based on "
            "the provided document context.\n\n"
            "Rules:\n"
            "- Answer only from the evidence in the document context below.\n"
            "- Silently verify each claim is supported by the context before answering.\n"
            "- Do not fabricate information. If the answer is not in the context, say so.\n"
            + lang_rule + MARKDOWN_RULE +
            "\nDocument context:\n" + context
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

    # -- 1. Ownership check ---------------------------------------------------
    doc = (
        db.query(Document)
        .filter(Document.id == request.document_id, Document.user_id == user_id)
        .first()
    )
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found or access denied.",
        )

    # -- 2. Load FAISS index(es) & retrieve via MMR ---------------------------
    try:
        vector_store = load_faiss_index(user_id, request.document_id)
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vector index not found for this document. Please re-upload the file.",
        )

    results = vector_store.max_marginal_relevance_search(
        request.question, k=TOP_K_CHUNKS, fetch_k=MMR_FETCH_K
    )
    context = "\n\n---\n\n".join(chunk.page_content for chunk in results)

    # -- 2b. Comparison mode --------------------------------------------------
    compare_context = ""
    if request.compare_document_id:
        comp_doc = (
            db.query(Document)
            .filter(Document.id == request.compare_document_id, Document.user_id == user_id)
            .first()
        )
        if comp_doc:
            try:
                vs2 = load_faiss_index(user_id, request.compare_document_id)
                chunks2 = vs2.max_marginal_relevance_search(
                    request.question, k=TOP_K_CHUNKS, fetch_k=MMR_FETCH_K
                )
                compare_context = "\n\n---\n\n".join(c.page_content for c in chunks2)
            except FileNotFoundError:
                pass

    # -- 3. Live web search (optional) ----------------------------------------
    live_sources: List[str] = []
    web_context_block = ""
    if request.live_mode:
        web_results = web_search(request.question, max_results=4)
        live_sources = [r["url"] for r in web_results if r["url"]]
        web_context_block = format_web_results(web_results)

    # -- 4. Build prompt messages ---------------------------------------------
    lang_rule = (
        f"- Respond entirely in {request.language}.\n"
        if request.language and request.language.lower() != "english"
        else ""
    )
    MARKDOWN_RULE = "- Format your response using Markdown only (no HTML tags).\n"

    if compare_context:
        system_content = (
            "You are a document comparison expert. You have been given excerpts from two documents.\n\n"
            "Rules:\n"
            "- Identify similarities, differences, contradictions, and unique points.\n"
            "- Structure your answer clearly with sections for each document where helpful.\n"
            "- Do not fabricate information.\n"
            + lang_rule + MARKDOWN_RULE
            + "\n\nDocument 1 context:\n" + context
            + "\n\nDocument 2 context:\n" + compare_context
        )
    elif request.live_mode:
        system_content = (
            "You are a helpful assistant with access to two sources:\n"
            "1. A user-uploaded PDF document\n"
            "2. Live web search results\n\n"
            "Rules:\n"
            "- Use BOTH sources. Web results are authoritative for current facts.\n"
            "- The PDF is authoritative for document-specific content.\n"
            "- Always cite whether your answer comes from the PDF, the web, or both.\n"
            "- Do not fabricate information.\n"
            + lang_rule + MARKDOWN_RULE
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
            + lang_rule + MARKDOWN_RULE
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
    num_questions: int = 5   # 1-10
    language: str = "English"

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
    num_q = max(1, min(10, request.num_questions))

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

    chunks = vector_store.similarity_search("key concepts facts definitions", k=10)
    context = "\n\n".join(c.page_content for c in chunks)[:5000]

    lang_note = f" All questions and options must be in {request.language}." if request.language.lower() != "english" else ""

    messages = [
        {
            "role": "system",
            "content": (
                f"You are a quiz generator. Create exactly {num_q} multiple-choice questions "
                f"based strictly on the document context provided.{lang_note}\n"
                "Respond with ONLY a valid JSON array. Each element must have:\n"
                '{"question": "...", "options": ["A. ...", "B. ...", "C. ...", "D. ..."], '
                '"correct_index": 0, "explanation": "brief explanation"}\n'
                "correct_index is the 0-based index of the correct option."
            ),
        },
        {"role": "user", "content": f"Document context:\n{context}"},
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
