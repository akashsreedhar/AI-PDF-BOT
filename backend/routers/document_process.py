import json
import os
import shutil
from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from config import DEFAULT_LLM_PROVIDER
from database import get_db
from models import Document
from utils.rag_builder import build_faiss_index, load_faiss_index, SUPPORTED_EXTENSIONS, get_index_path
from utils.authentication import get_current_user
from utils.llm_client import get_llm_response

ALLOWED_EXTENSIONS = SUPPORTED_EXTENSIONS

router = APIRouter()


@router.post(
    "/upload_documents",
    status_code=status.HTTP_201_CREATED,
    openapi_extra={
        "requestBody": {
            "content": {
                "multipart/form-data": {
                    "schema": {
                        "type": "object",
                        "required": ["files"],
                        "properties": {
                            "files": {
                                "type": "array",
                                "items": {"type": "string", "format": "binary"},
                                "description": "Upload one or more supported files (pdf, txt, md, docx, csv, xlsx, json, html, pptx, png, jpg, jpeg, webp, bmp, tiff)",
                            }
                        },
                    }
                }
            },
            "required": True,
        }
    },
)
def upload_documents(
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Accept one or more supported files, extract text, build a per-document
    FAISS vector index, and record metadata in the DB.
    """
    user_id = current_user["id"]  # already int from get_current_user
    results = []

    for upload in files:
        ext = os.path.splitext(upload.filename or "")[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file type '{ext}'. Allowed types: {', '.join(sorted(ALLOWED_EXTENSIONS))}.",
            )

        # Read entire file into memory — we do NOT persist it to disk
        file_bytes = upload.file.read()

        # Create DB record first so we can use its ID for the index path
        doc = Document(user_id=user_id, filename=upload.filename)
        db.add(doc)
        db.flush()  # assigns doc.id without committing yet

        # Build FAISS index directly from in-memory bytes
        try:
            index_path = build_faiss_index(file_bytes, ext, user_id, doc.id)
            doc.faiss_index_path = index_path
        except Exception as exc:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to build FAISS index for '{upload.filename}': {exc}",
            )

        db.commit()
        db.refresh(doc)

        # Generate summary in background (non-blocking best-effort)
        try:
            _generate_doc_summary(doc, user_id, db)
        except Exception:
            pass  # summary failure must not break upload

        results.append(
            {"id": doc.id, "filename": doc.filename, "index_path": index_path}
        )

    return {
        "message": f"Successfully processed {len(results)} document(s).",
        "documents": results,
    }


def _generate_doc_summary(doc: Document, user_id: int, db: Session) -> None:
    """Pull first N chunks and ask LLM for a title, 3-line summary, and 5 key topics."""
    vector_store = load_faiss_index(user_id, doc.id)
    # Use a broad query to grab diverse representative chunks
    chunks = vector_store.similarity_search("overview introduction summary", k=6)
    sample_text = "\n\n".join(c.page_content for c in chunks)[:4000]

    messages = [
        {
            "role": "system",
            "content": (
                "You are a document analyst. Given a document excerpt, respond with ONLY valid JSON "
                "in this exact format, no other text:\n"
                '{"title": "concise document title (max 8 words)", '
                '"summary": "3-sentence summary of the document", '
                '"key_topics": ["topic1", "topic2", "topic3", "topic4", "topic5"]}'
            ),
        },
        {
            "role": "user",
            "content": f"Analyse this document excerpt:\n\n{sample_text}",
        },
    ]
    raw = get_llm_response(messages, provider=DEFAULT_LLM_PROVIDER)
    # Strip markdown code fences if present
    raw = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    data = json.loads(raw)
    doc.doc_title = data.get("title", "")
    doc.summary = data.get("summary", "")
    doc.key_topics = json.dumps(data.get("key_topics", []))
    db.commit()


@router.get("/documents")
def get_documents(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Return all documents belonging to the authenticated user."""
    user_id = current_user["id"]
    docs = (
        db.query(Document)
        .filter(Document.user_id == user_id)
        .order_by(Document.created_at.desc())
        .all()
    )
    return [
        {
            "id": d.id,
            "filename": d.filename,
            "created_at": d.created_at.isoformat(),
            "doc_title": d.doc_title or "",
            "summary": d.summary or "",
            "key_topics": json.loads(d.key_topics) if d.key_topics else [],
        }
        for d in docs
    ]


@router.delete("/documents/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Delete a document, its uploaded file, and its FAISS index."""
    user_id = current_user["id"]
    doc = (
        db.query(Document)
        .filter(Document.id == doc_id, Document.user_id == user_id)
        .first()
    )
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    # Remove FAISS index from both stored path and canonical path.
    # This keeps cleanup robust for older records and path format changes.
    candidate_paths = {p for p in [doc.faiss_index_path, get_index_path(user_id, doc.id)] if p}
    for path in candidate_paths:
        try:
            if os.path.isdir(path):
                shutil.rmtree(path, ignore_errors=True)
            elif os.path.isfile(path):
                os.remove(path)
        except OSError:
            pass

    db.delete(doc)
    db.commit()
    return None
