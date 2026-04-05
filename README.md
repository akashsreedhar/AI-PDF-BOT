# AI PDF Bot — System Architecture

## Overview

This is an **AI-powered document question-answering system** built on a **Retrieval-Augmented Generation (RAG)** architecture. Users register, upload PDF or TXT files, and chat with the AI to get answers drawn directly from document content. The system also supports live web search augmentation, two-document comparison, multi-language responses, automated quiz generation, and per-document chat history.

The architecture is a **Client–Server monorepo** with two independently runnable services: a Next.js 16 frontend and a Python FastAPI backend.

---

## Repository Structure

```
AI-PDF-BOT/
├── frontend/                  → Next.js 16 web application (TypeScript)
│   ├── app/                   → App Router pages
│   │   ├── page.tsx           → Landing page
│   │   ├── login/page.tsx     → Login page
│   │   ├── signup/page.tsx    → Signup page
│   │   └── dashboard/page.tsx → Main application (protected)
│   ├── components/
│   │   ├── AuthForm.tsx       → Reusable auth form base
│   │   ├── MarkdownMessage.tsx→ Renders LLM Markdown responses
│   │   └── Navbar.tsx         → Global navigation bar
│   └── services/
│       ├── auth.ts            → Login / signup API calls
│       ├── chat.ts            → Chat, history, quiz API calls
│       └── documents.ts       → Upload, list, delete API calls
│
└── backend/                   → Python FastAPI server
    ├── app.py                 → Application entry point, middleware, router mounting
    ├── config.py              → All config loaded from .env (DB, JWT, LLM, CORS)
    ├── database.py            → SQLAlchemy engine, session factory, init_db()
    ├── models.py              → ORM models: User, Document, Conversation
    ├── schemas.py             → Pydantic request/response schemas
    ├── routers/
    │   ├── users.py           → POST /api/login, POST /api/signup
    │   ├── document_process.py→ POST /api/upload_documents, GET /api/documents, DELETE /api/documents/{id}
    │   └── chat.py            → POST /api/chat, GET /api/chat/history/{doc_id}, POST /api/quiz
    └── utils/
        ├── authentication.py  → JWT creation and verification (HTTPBearer)
        ├── rag_builder.py     → FAISS index build and load (LangChain + HuggingFace)
        ├── llm_client.py      → Groq / OpenAI chat completions wrapper
        └── web_search.py      → DuckDuckGo search + result formatter
```

---

## Technology Stack

### Frontend

| Technology | Version | Role |
|---|---|---|
| Next.js | 16.2.1 | App framework (App Router) |
| React | 19.2.4 | UI library |
| TypeScript | ^5 | Type safety |
| TailwindCSS | ^4 | Styling |
| react-markdown | ^10.1.0 | Renders LLM Markdown output |
| remark-gfm | ^4.0.1 | GitHub-Flavored Markdown support |

The frontend rewrites all `/api/*` requests to the backend via `next.config.ts`, so the browser only ever talks to `localhost:3000`. The backend URL is controlled by the `NEXT_PUBLIC_API_BASE_URL` environment variable (default: `http://localhost:8000`).

### Backend

| Technology | Role |
|---|---|
| Python / FastAPI | HTTP server, routing, request validation |
| SQLAlchemy | ORM — models, sessions, query building |
| Pydantic | Request and response schema validation |
| PyJWT | JWT signing and verification |
| LangChain community | Document loaders (PyPDFLoader, TextLoader), FAISS vector store wrapper |
| langchain-text-splitters | RecursiveCharacterTextSplitter |
| sentence-transformers | Local HuggingFace embedding model runner |
| faiss-cpu | FAISS vector index — similarity search |
| pypdf | PDF text extraction |
| Groq SDK | Groq LLM API client |
| OpenAI SDK | OpenAI LLM API client |
| ddgs | DuckDuckGo web search (no API key needed) |
| python-dotenv | .env loading |
| python-multipart | Multipart file upload parsing |

### Database

| Environment | Database | ORM |
|---|---|---|
| Local (`ENVIRONMENT=local`) | SQLite at `./data/ai_pdf_bot.db` | SQLAlchemy (StaticPool) |
| Production (`ENVIRONMENT=gcp`) | MySQL via Cloud SQL | SQLAlchemy (pool_recycle, pool_pre_ping) |

### AI / Embeddings

| Component | Implementation |
|---|---|
| Embedding model | `all-MiniLM-L6-v2` (HuggingFace, runs **locally** — no API key) |
| Vector store | FAISS (persisted to disk per document) |
| Default LLM | Groq API, model `openai/gpt-oss-120b` |
| Alternative LLM | OpenAI API, model `gpt-4o-mini` |

---

## Database Schema

Three tables are created automatically by `init_db()` on startup.

```
users
─────────────────────────
id           INTEGER PK
name         VARCHAR(255)
email        VARCHAR(255) UNIQUE
password     VARCHAR(255)
created_at   DATETIME
updated_at   DATETIME

documents
─────────────────────────────────────────────
id                INTEGER PK
user_id           INTEGER  (→ users.id)
filename          VARCHAR(255)
faiss_index_path  VARCHAR(512)
doc_title         VARCHAR(512)   ← AI-generated on upload
summary           TEXT           ← AI-generated 3-sentence summary
key_topics        TEXT           ← JSON array of 5 topics, AI-generated
created_at        DATETIME

conversations
─────────────────────────────────────────────
id                    INTEGER PK
user_id               INTEGER  (→ users.id)
document_id           INTEGER  (→ documents.id)
question              TEXT
answer                TEXT
conversation_history  TEXT   ← full history serialized as JSON
created_at            DATETIME
```

---

## API Endpoints

All endpoints are mounted under `/api`.

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/signup` | No | Register a new user, returns JWT |
| POST | `/api/login` | No | Authenticate user, returns JWT |
| POST | `/api/upload_documents` | JWT | Upload one or more PDF/TXT files |
| GET | `/api/documents` | JWT | List all documents for the current user |
| DELETE | `/api/documents/{doc_id}` | JWT | Delete document, file, and FAISS index |
| POST | `/api/chat` | JWT | RAG chat query against a document |
| GET | `/api/chat/history/{document_id}` | JWT | Fetch all saved conversations for a document |
| POST | `/api/quiz` | JWT | Generate MCQ quiz from a document |
| GET | `/` | No | API welcome/version info |
| GET | `/health` | No | Health check |

---

## Application Startup

On `uvicorn` start, `app.py` runs a `lifespan` context manager:

1. `init_db()` is called — SQLAlchemy's `Base.metadata.create_all()` creates all three tables if they don't exist.
2. CORS middleware is registered. Allowed origins come from `ALLOWED_ORIGINS` in `.env` (default: `http://localhost:3000`).
3. Three routers are mounted at `/api`.

---

## Authentication Flow

### Signup — `POST /api/signup`

```
Client sends: { name, email, password }
    ↓
Check if email already exists in users table
    ↓
If not: INSERT new User row (password stored as-is)
    ↓
create_access_token({ sub: name, id: user_id, email })
JWT signed with SECRET_KEY using HS256, expires in 30 minutes
    ↓
Return: { token, token_type: "bearer", user: { id, name, email } }
    ↓
Frontend stores JWT in localStorage under key "jwt"
Frontend stores user object in localStorage under key "user"
Redirect to /dashboard
```

### Login — `POST /api/login`

```
Client sends: { email, password }
    ↓
Query: SELECT * FROM users WHERE email=? AND password=?
    ↓
If found: sign JWT → return same token shape as signup
If not found: HTTP 401 "Invalid email or password"
```

### JWT Verification (all protected endpoints)

Every protected route uses `Depends(get_current_user)` which:

```
Extracts Bearer token from "Authorization" header (HTTPBearer)
    ↓
jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    ↓
Reads "id" claim → returns { "id": int(user_id) }
    ↓
Invalid or expired → HTTP 401
```

---

## Document Upload & Indexing Pipeline

Triggered by `POST /api/upload_documents` (multipart/form-data, one or more files).

```
For each uploaded file:

1. Validate file extension
   Only .pdf and .txt are accepted.
   Any other extension → HTTP 400.

2. Create Document row in DB (db.flush to get doc.id without committing)

3. Save file to disk
   Path: ./data/uploads/{user_id}_{doc_id}.{ext}
   Original filename is never used in the path (prevents path traversal).

4. Build FAISS index  [utils/rag_builder.py]
   ├── Load document
   │     .pdf → PyPDFLoader (pypdf)
   │     .txt → TextLoader (UTF-8)
   ├── Split into chunks
   │     RecursiveCharacterTextSplitter
   │     chunk_size=1000, chunk_overlap=200
   ├── Embed all chunks
   │     HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
   │     Model runs locally (downloaded on first use)
   ├── Build FAISS vector store from chunks + embeddings
   └── Save index to disk
         Path: ./data/faiss_indexes/{user_id}/{doc_id}/
               → index.faiss
               → index.pkl

5. Update document.faiss_index_path in DB → db.commit()

6. Generate AI summary (best-effort, does NOT block the response)
   ├── Load FAISS index back
   ├── similarity_search("overview introduction summary", k=6)
   ├── Concatenate top 6 chunks (max 4000 chars)
   ├── LLM prompt → returns JSON: { title, summary, key_topics[5] }
   └── UPDATE document: doc_title, summary, key_topics
```

Response returns `{ message, documents: [{ id, filename, index_path }] }`.

---

## RAG Chat Pipeline

Triggered by `POST /api/chat`.

### Request body

```json
{
  "document_id": 1,
  "question": "What is the main argument of this paper?",
  "provider": "groq",
  "model": null,
  "conversation_history": [{ "role": "user", "content": "..." }, ...],
  "live_mode": false,
  "language": "English",
  "compare_document_id": null
}
```

### 8-Step Pipeline

```
Step 1 — Ownership check
  SELECT * FROM documents WHERE id=? AND user_id=?
  If not found → HTTP 404

Step 2 — Load FAISS + MMR Retrieval
  load_faiss_index(user_id, document_id)
  max_marginal_relevance_search(question, k=8, fetch_k=20)
  ↑ MMR fetches 20 candidate chunks, returns the 8 most relevant
    AND most diverse — avoids returning near-duplicate passages.
  Chunks joined with "\n\n---\n\n" as context.

Step 2b — Document Comparison (if compare_document_id is set)
  Load second FAISS index for compare_document_id (ownership verified)
  Same MMR retrieval → compare_context
  System prompt switches to comparison mode.

Step 3 — Live Web Search (if live_mode=true)
  web_search(question, max_results=4)  [DuckDuckGo via ddgs]
  Returns: [{ title, url, snippet }, ...]
  format_web_results() builds a text block appended to system prompt.
  Source URLs returned in response as live_sources[].

Step 4 — Build Prompt
  Three system prompt variants:
  ┌── Standard mode:
  │     "Answer only from the document context below."
  ├── Live mode:
  │     "Use BOTH document context and live web results.
  │      Web results are authoritative for real-time facts."
  └── Comparison mode:
        "Compare these two document excerpts: similarities,
         differences, contradictions, unique points."
  Language rule added if language != "English":
    "Respond entirely in {language}."
  All responses formatted in Markdown (no HTML tags).
  Full messages array: [system_message, ...history, user_message]

Step 5 — LLM Call
  get_llm_response(messages, provider, model)
  ├── provider="groq" → Groq(api_key=GROQ_API_KEY)
  │     model: GROQ_DEFAULT_MODEL = "openai/gpt-oss-120b"
  └── provider="openai" → OpenAI(api_key=OPENAI_API_KEY)
        model: OPENAI_DEFAULT_MODEL = "gpt-4o-mini"
  Returns answer string.

Step 6 — Follow-up Questions (best-effort, same provider)
  Second LLM call with prompt:
    "Suggest exactly 3 short follow-up questions → JSON array of 3 strings"
  Parsed and returned as follow_up_questions[].
  If this call fails for any reason → empty list, no error raised.

Step 7 — Persist Conversation
  INSERT INTO conversations:
    { user_id, document_id, question, answer, conversation_history (JSON) }

Step 8 — Return ChatResponse
  {
    answer: string,
    conversation_id: int,
    conversation_history: [{ role, content }, ...],
    live_sources: string[],
    follow_up_questions: string[]
  }
```

---

## Quiz Generation Pipeline

Triggered by `POST /api/quiz`.

```
Request: { document_id, num_questions (1–10), language, provider, model }
    ↓
Ownership check → load FAISS index
    ↓
similarity_search("key concepts facts definitions", k=10)
Concatenate top 10 chunks (max 5000 chars)
    ↓
LLM prompt:
  "Generate exactly N MCQ questions from the document context.
   Respond with ONLY a valid JSON array. Each element:
   { question, options: [A,B,C,D], correct_index (0-based), explanation }"
    ↓
Parse JSON → validate each QuizQuestion
    ↓
Return: { questions: [{ question, options, correct_index, explanation }] }
```

Frontend renders an interactive quiz with selectable options. On submit it shows correct/incorrect per question plus the explanation.

---

## Chat History

`GET /api/chat/history/{document_id}` returns all `Conversation` rows for that document belonging to the authenticated user, ordered newest first. Each record includes the full serialized `conversation_history`.

---

## File Storage Layout

```
backend/data/
├── ai_pdf_bot.db                        ← SQLite database (local only)
│
├── uploads/
│   ├── 2_1.pdf                          ← user_id=2, document_id=1
│   ├── 2_3.pdf
│   └── ...
│
└── faiss_indexes/
    └── 2/                               ← user_id
        ├── 1/                           ← document_id
        │   ├── index.faiss
        │   └── index.pkl
        └── 3/
            ├── index.faiss
            └── index.pkl
```

---

## Frontend Pages & Features

### Landing Page — `/`

Static marketing page. Feature cards, stats. Links to `/login` and `/signup`.

### Login — `/login` and Signup — `/signup`

Client-side forms. On success, JWT and user object are stored in `localStorage`. Redirect to `/dashboard`.

### Dashboard — `/dashboard`

The entire application lives here. Protected — redirects to `/login` if no JWT in `localStorage`.

Features available in the dashboard:

| Feature | Description |
|---|---|
| Document sidebar | Lists all user documents with AI-generated title, summary, and key topics |
| Upload | Drag-and-drop or file picker, supports multi-file upload |
| Delete | Removes document from DB, disk, and FAISS index |
| Chat tab | RAG Q&A with the selected document |
| Live Mode toggle | Augments answers with real-time DuckDuckGo web results |
| Language selector | 10 languages: English, Hindi, Telugu, Tamil, Spanish, French, German, Arabic, Chinese, Japanese |
| Compare mode | Select a second document to compare both simultaneously |
| Follow-up chips | 3 clickable suggested questions after each answer |
| History tab | Browse all past Q&A turns for a selected document |
| Quiz tab | Generate and take an interactive MCQ quiz from any document |

Markdown responses are rendered by the `MarkdownMessage` component using `react-markdown` + `remark-gfm` (supports tables, code blocks, bold, lists, headings).

---

## High-Level Data Flow

```
Browser (Next.js on :3000)
  │
  │  All /api/* requests → proxied to backend :8000 via next.config.ts rewrite
  │
  ├─ Unauthenticated
  │   POST /api/signup  ──→  FastAPI users router
  │   POST /api/login   ──→  FastAPI users router
  │                              └─→ SQLite: users table
  │                              └─→ JWT issued → stored in localStorage
  │
  └─ Authenticated (Bearer JWT in every request)
      │
      ├─ GET  /api/documents           → documents table (filtered by user_id)
      │
      ├─ POST /api/upload_documents
      │         ├─→ File saved to disk
      │         ├─→ PyPDF/TextLoader → RecursiveCharacterTextSplitter
      │         ├─→ HuggingFace all-MiniLM-L6-v2 (local) → embeddings
      │         ├─→ FAISS index built → saved to disk
      │         ├─→ documents table updated
      │         └─→ LLM (Groq) → title / summary / key_topics → DB
      │
      ├─ DELETE /api/documents/{id}
      │         ├─→ File removed from disk
      │         ├─→ FAISS index directory removed (shutil.rmtree)
      │         └─→ documents table row deleted
      │
      ├─ POST /api/chat
      │         ├─→ Load FAISS index from disk
      │         ├─→ MMR vector search (top 8 of 20 candidates)
      │         ├─→ [optional] DuckDuckGo web search
      │         ├─→ [optional] Second FAISS index (comparison mode)
      │         ├─→ Build prompt (system + history + question)
      │         ├─→ Groq / OpenAI API call → answer
      │         ├─→ Second LLM call → 3 follow-up questions
      │         ├─→ INSERT conversations row
      │         └─→ Return { answer, conversation_id, history, live_sources, follow_ups }
      │
      ├─ GET  /api/chat/history/{doc_id}  → conversations table
      │
      └─ POST /api/quiz
                ├─→ Load FAISS index
                ├─→ similarity_search k=10
                ├─→ LLM → JSON MCQ array
                └─→ Return { questions: [...] }
```

---

## Environment Variables

### Backend (`.env` in `backend/`)

| Variable | Default | Description |
|---|---|---|
| `ENVIRONMENT` | `local` | `local` = SQLite, `gcp` = MySQL |
| `DB_PATH` | `./data/ai_pdf_bot.db` | SQLite path (local only) |
| `DB_USER` | `root` | MySQL user (GCP only) |
| `DB_PASSWORD` | — | MySQL password (GCP only) |
| `DB_HOST` | `127.0.0.1` | MySQL host (GCP only) |
| `DB_PORT` | `3306` | MySQL port (GCP only) |
| `DB_NAME` | `ai_pdf_bot` | MySQL database name (GCP only) |
| `SECRET_KEY` | (hardcoded fallback) | JWT signing key |
| `ALGORITHM` | `HS256` | JWT algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | JWT TTL |
| `ALLOWED_ORIGINS` | `http://localhost:3000` | CORS allowed origins (comma-separated) |
| `GROQ_API_KEY` | (hardcoded fallback) | Groq API key |
| `OPENAI_API_KEY` | — | OpenAI API key |
| `LLM_PROVIDER` | `groq` | Default LLM provider: `groq` or `openai` |
| `GROQ_MODEL` | `openai/gpt-oss-120b` | Groq model override |
| `OPENAI_MODEL` | `gpt-4o-mini` | OpenAI model override |
| `UPLOAD_DIR` | `./data/uploads` | File upload directory |
| `FAISS_INDEX_DIR` | `./data/faiss_indexes` | FAISS index root directory |

### Frontend (`.env.local` in `frontend/`)

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:8000` | Backend base URL for API proxy |

---

## Running Locally

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```

On first start, the SQLite database and all tables are created automatically at `./data/ai_pdf_bot.db`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:3000`. All API calls are proxied to `http://localhost:8000`.

---

## Key Design Decisions

| Decision | Reason |
|---|---|
| FAISS on local disk (no external vector DB) | Zero infrastructure cost; each document gets its own isolated index folder |
| HuggingFace embeddings run locally | No per-query embedding API cost; `all-MiniLM-L6-v2` is fast and effective |
| MMR retrieval (k=8, fetch_k=20) | Prevents returning 8 near-duplicate paragraphs; improves answer diversity |
| Stateless chat (history carried by client) | Backend stays simple; no server-side session state needed |
| Safe file naming `{userId}_{docId}.ext` | Prevents path traversal; eliminates filename collisions across users |
| AI summary generated after upload (non-blocking) | Upload response is fast; summary failure never breaks the upload flow |
| Per-document FAISS indexes | Queries are scoped to one document; no cross-contamination between users or docs |
| JWT in localStorage | Simple SPA auth; 30-minute expiry limits exposure window |
