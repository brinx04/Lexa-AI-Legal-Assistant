# Lexa AI — Smart Legal Document Intelligence

Lexa is a full-stack web application that lets users upload legal documents (PDFs, DOCX, TXT) and instantly get:

- **AI-powered document summaries** — executive overview of any contract or agreement
- **Red flag detection** — critical anomalies, unfair clauses, and risk indicators flagged with severity levels
- **Case law citations** — relevant Indian case law sourced via the Indian Kanoon API
- **RAG-powered chat** — ask any question about the document using natural language

---

## Tech Stack

### Backend
- **FastAPI** — REST API with async support
- **LangGraph** — agent graph for multi-step document analysis
- **Google Gemini** — LLM for summarisation and risk identification
- **Chroma** — vector store for RAG (retrieval-augmented generation)
- **Celery + Redis** — background task queue for document processing
- **pdfplumber + Tesseract OCR** — text extraction with OCR fallback for scanned PDFs
- **SQLite** — lightweight document metadata storage

### Frontend
- **Next.js 15** (App Router) with TypeScript
- **NextAuth.js** — Google OAuth authentication
- **Tailwind CSS** — utility-first styling

---

## Project Structure

```
Lexa/
├── backend/
│   ├── app/
│   │   ├── agents/        # LangGraph agent graph and nodes
│   │   ├── api/           # FastAPI route handlers
│   │   ├── core/          # Config, DB, security, vector DB
│   │   ├── models/        # Pydantic data models
│   │   ├── services/      # Embeddings, Indian Kanoon API client
│   │   └── workers/       # Celery tasks (document processing)
│   ├── celery_app.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/           # Next.js pages and layouts
│   │   └── lib/           # API client utilities
│   └── package.json
└── docker-compose.yml
```

---

## Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+
- Redis (for Celery)
- Tesseract OCR (optional, for scanned PDFs)
- Poppler (optional, for PDF-to-image conversion)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Copy and fill in environment variables
cp ../.env.example .env

# Start FastAPI server
uvicorn app.main:app --reload

# Start Celery worker (in a separate terminal)
celery -A celery_app worker --loglevel=info
```

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local   # fill in NEXTAUTH_SECRET, GOOGLE_CLIENT_ID, etc.
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

### Docker (all-in-one)

```bash
docker-compose up --build
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `GOOGLE_API_KEY` | Gemini API key |
| `NEXTAUTH_SECRET` | NextAuth session secret |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `REDIS_URL` | Redis connection URL (default: `redis://localhost:6379/0`) |

---

## License

MIT
