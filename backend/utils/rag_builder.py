import io
import os
import tempfile
from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS

FAISS_INDEX_DIR = os.getenv("FAISS_INDEX_DIR", "./data/faiss_indexes")
EMBEDDING_MODEL = "all-MiniLM-L6-v2"


def _get_embeddings() -> HuggingFaceEmbeddings:
    """Return a HuggingFace embedding model instance (cached locally)."""
    return HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)


def get_index_path(user_id: int, document_id: int) -> str:
    """Return the filesystem path for a user's document FAISS index."""
    return os.path.join(FAISS_INDEX_DIR, str(user_id), str(document_id))


def build_faiss_index(file_bytes: bytes, ext: str, user_id: int, document_id: int) -> str:
    """
    Accept raw file bytes, split into overlapping chunks, embed with a local
    HuggingFace model, build a FAISS vector store, and persist it to disk.
    The bytes are processed via a temporary file that is deleted immediately after.

    Supports: PDF (.pdf), plain-text (.txt)
    Returns: absolute path to the saved FAISS index directory.
    """
    ext = ext.lower()
    with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name

    try:
        if ext == ".pdf":
            loader = PyPDFLoader(tmp_path)
        else:
            loader = TextLoader(tmp_path, encoding="utf-8")
        documents = loader.load()
    finally:
        os.remove(tmp_path)

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
    )
    chunks = splitter.split_documents(documents)

    if not chunks:
        raise ValueError(f"No extractable text found in: {file_path}")

    embeddings = _get_embeddings()
    vector_store = FAISS.from_documents(chunks, embeddings)

    index_path = get_index_path(user_id, document_id)
    os.makedirs(index_path, exist_ok=True)
    vector_store.save_local(index_path)

    return index_path


def load_faiss_index(user_id: int, document_id: int) -> FAISS:
    """
    Load a persisted FAISS index from disk for similarity search / RAG querying.
    """
    index_path = get_index_path(user_id, document_id)
    if not os.path.exists(index_path):
        raise FileNotFoundError(f"FAISS index not found at: {index_path}")
    embeddings = _get_embeddings()
    return FAISS.load_local(index_path, embeddings, allow_dangerous_deserialization=True)
