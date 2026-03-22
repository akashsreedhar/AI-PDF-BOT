# System Architecture – AI Document Chatbot (RAG System)

## Overview

This project is an **AI-powered document question-answering system** built using a **Retrieval-Augmented Generation (RAG)** architecture.

Users can upload documents and ask questions about them.
The system processes the documents, converts them into embeddings, stores them in a vector database, and retrieves relevant context to generate accurate responses using an LLM.

The architecture follows a **Client–Server architecture** implemented in a **monorepo structure**.

---

# Repository Structure

The project is organized as a **monorepo** with two main services:

```
ai-rag-chatbot
│
├── frontend/      → Next.js web application
├── backend/       → Python FastAPI server
│
└── docs/          → architecture and documentation
```

### Frontend Responsibilities

The frontend is responsible for:

* User interface
* Chat experience
* File uploads
* Displaying answers
* Showing document sources
* Communicating with backend APIs

### Backend Responsibilities

The backend is responsible for:

* Document processing
* Text chunking
* Embedding generation
* Vector database storage
* Retrieval pipeline
* LLM interaction
* Business logic

---

# Architecture Type

The system uses:

### Client–Server Architecture

```
Client (Next.js)
      ↓
Backend API (FastAPI)
      ↓
Vector Database
      ↓
LLM
```

The frontend communicates with the backend via **REST APIs**.

---

# High-Level System Architecture

```
User
  ↓
Next.js Frontend
  ↓
FastAPI Backend
  ↓
RAG Pipeline
  ↓
Vector Database
  ↓
LLM
```

---

# Technology Stack

## Frontend

* Next.js
* React
* TypeScript
* TailwindCSS

Purpose:

* Build the chat UI
* Handle file uploads
* Render AI responses
* Manage application state

---

## Backend

* Python
* FastAPI
* LangChain (optional orchestration)
* Vector database integration

Purpose:

* Document ingestion
* Embedding generation
* Query processing
* Retrieval pipeline

---

## Vector Database

Possible choices:

* FAISS
* ChromaDB
* pgvector

Purpose:

* Store document embeddings
* Perform similarity search

---

## AI Model

Possible providers:

* OpenAI
* Claude
* Local LLMs
* Llama models

Purpose:

* Generate responses using retrieved context.

---

# Document Ingestion Pipeline

When a user uploads a document, the following pipeline runs:

```
User Upload
     ↓
Frontend sends file
     ↓
Backend receives document
     ↓
Document parsing
     ↓
Text chunking
     ↓
Embedding generation
     ↓
Store vectors in database
```

### Step-by-Step

1. User uploads document from frontend.
2. Frontend sends request to backend:

```
POST /upload
```

3. Backend parses the document.
4. Text is split into smaller chunks.
5. Embeddings are generated.
6. Embeddings are stored in the vector database.

---

# Query Pipeline (RAG Flow)

When a user asks a question:

```
User Question
      ↓
Frontend sends API request
      ↓
Backend receives query
      ↓
Embedding generation for query
      ↓
Vector similarity search
      ↓
Retrieve relevant chunks
      ↓
Send context to LLM
      ↓
Generate answer
      ↓
Return response to frontend
```

---

# Example Query Flow

```
User: "Explain transformers in this document"

Frontend
   ↓
POST /chat

Backend
   ↓
Generate embedding for question

Vector DB
   ↓
Find relevant document chunks

LLM
   ↓
Generate final answer

Frontend
   ↓
Display response
```

---

# API Design

Example API endpoints:

## Upload Document

```
POST /upload
```

Uploads and processes a document.

---

## Chat Query

```
POST /chat
```

Request body:

```
{
  "question": "Explain this document"
}
```

Response:

```
{
  "answer": "...",
  "sources": [...]
}
```

---

## Document Management (Optional)

```
GET /documents
DELETE /documents/{id}
```

---

# Development Architecture

During development two servers run:

Frontend server

```
localhost:3000
```

Backend server

```
localhost:8000
```

Communication happens via HTTP.

---

# Production Architecture

In production the services are deployed independently.

```
Users
   ↓
Frontend (Vercel)
   ↓
Backend API (Render)
   ↓
Vector Database
   ↓
LLM Provider
```

Example production URLs:

Frontend:

```
https://app.example.com
```

Backend:

```
https://api.example.com
```

---

# Deployment Strategy

The repository is a **monorepo**, but each service is deployed separately.

## Frontend Deployment

Platform:

* Vercel

Configuration:

Root Directory:

```
frontend
```

---

## Backend Deployment

Platform:

* Render

Configuration:

Root Directory:

```
backend
```

---

# Environment Variables

Frontend example:

```
NEXT_PUBLIC_API_URL=https://api.example.com
```

Backend example:

```
OPENAI_API_KEY=...
VECTOR_DB_URL=...
```

---

# Collaboration Workflow

The project follows a **feature branch workflow**.

Branch structure:

```
main
develop
feature/*
```

Example:

```
feature/chat-ui
feature/upload-doc
feature/rag-pipeline
```

Workflow:

```
feature → develop → main
```

---

# Security Considerations

Important practices:

* Do not expose API keys
* Use environment variables
* Validate uploaded files
* Limit document size
* Sanitize inputs

---

# Future Improvements

Possible improvements include:

* streaming AI responses
* conversation memory
* user authentication
* document indexing jobs
* background workers
* caching layer
* analytics

---

# Summary

This system implements a modern **AI SaaS architecture** with:

* Next.js frontend
* FastAPI backend
* RAG pipeline
* vector search
* LLM generation

The architecture is designed to be **scalable, modular, and production-ready**.

---
