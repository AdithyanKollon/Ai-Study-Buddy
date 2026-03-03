# 📚 StudyBuddy — AI-Powered Document Q&A

> Chat with your PDFs using RAG (Retrieval-Augmented Generation). Upload lecture notes, research papers, or textbooks and get instant, context-aware answers.

**[Live Demo](https://ai-study-buddy-6jyk.vercel.app)** · **[Backend API](https://ai-study-buddy-production-e464.up.railway.app)**

![StudyBuddy Screenshot](https://via.placeholder.com/800x450/111318/00e5a0?text=StudyBuddy+Preview)

---

## ✨ Features

- **RAG Pipeline** — PDF text extraction → chunking → vector embeddings → semantic search → LLM response
- **Streaming Responses** — Real-time token-by-token streaming with Server-Sent Events
- **Multi-Document Support** — Upload and switch between multiple PDFs
- **Suggested Questions** — Auto-generated questions after upload using document context
- **Persistent Chat History** — All conversations saved to Supabase and restored on login
- **User Authentication** — Email/password auth with JWT tokens via Supabase
- **PDF Export** — Export chat history as a formatted PDF
- **Markdown Rendering** — Full markdown support including tables, code blocks, and lists

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, CSS3 |
| Backend | FastAPI, Python 3.11 |
| LLM | Groq API (llama-3.3-70b-versatile) |
| Embeddings | Cohere API (embed-english-light-v3.0) |
| Vector DB | ChromaDB (persistent) |
| Auth & DB | Supabase (PostgreSQL) |
| Deployment | Vercel (frontend), Railway (backend) |

---

## 🏗 Architecture

```
User uploads PDF
      ↓
PyMuPDF extracts text with page numbers
      ↓
LangChain splits into 500-char chunks (50 overlap)
      ↓
Cohere generates 1024-dim embeddings
      ↓
ChromaDB stores vectors persistently
      ↓
User asks question
      ↓
Question → embedding → top-5 similar chunks retrieved
      ↓
Chunks + question + chat history → Groq LLM
      ↓
Streaming response → frontend via SSE
```

---

## 🚀 Local Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- Groq API key (free at console.groq.com)
- Supabase project (free at supabase.com)
- Cohere API key (free at cohere.com)

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux

pip install -r requirements.txt
```

Create `backend/.env`:
```env
GROQ_API_KEY=your_groq_key
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
COHERE_API_KEY=your_cohere_key
```

```bash
uvicorn main:app --reload
# API running at http://localhost:8000
```

### Frontend

```bash
cd frontend
npm install
npm start
# App running at http://localhost:3000
```

### Supabase Tables

Run in Supabase SQL Editor:

```sql
-- Documents table
CREATE TABLE documents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  doc_id text NOT NULL,
  filename text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Messages table
CREATE TABLE messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  doc_id text NOT NULL,
  role text NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);
```

---

## 📁 Project Structure

```
ai-study-buddy/
├── backend/
│   ├── main.py                 # FastAPI app entry point
│   ├── requirements.txt
│   ├── routes/
│   │   ├── upload.py           # PDF upload & processing
│   │   ├── chat.py             # Streaming chat endpoint
│   │   ├── suggest.py          # Question suggestion
│   │   ├── auth.py             # Login & signup
│   │   ├── docs.py             # Document CRUD
│   │   └── messages.py         # Chat history CRUD
│   ├── services/
│   │   ├── pdf_processor.py    # PDF text extraction & chunking
│   │   ├── embeddings.py       # Vector embedding & ChromaDB
│   │   └── rag_chain.py        # Groq LLM integration
│   └── db/
│       ├── chroma_client.py
│       └── supabase_client.py
└── frontend/
    ├── src/
    │   ├── App.js              # Main app component
    │   ├── Auth.js             # Login/signup UI
    │   └── App.css             # Styling
    └── public/
```

---

## 🔑 Environment Variables

### Backend
| Variable | Description |
|----------|-------------|
| `GROQ_API_KEY` | Groq API key for LLM |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_KEY` | Supabase anon/service key |
| `COHERE_API_KEY` | Cohere API key for embeddings |

---

## 💡 Key Technical Decisions

**Why RAG over fine-tuning?**
RAG allows real-time document ingestion without expensive retraining. Users can upload any PDF and get accurate answers immediately.

**Why Groq?**
Groq's LPU hardware delivers extremely fast inference — responses stream in under 1 second vs 5-10s with other providers, creating a much better UX.

**Why ChromaDB?**
Lightweight, persistent, runs in-process without a separate server. Perfect for a single-tenant deployment.

**Why Cohere for embeddings?**
Free API tier, no local GPU required, 1024-dimensional embeddings with strong semantic search quality.

---

## 👨‍💻 Author

<<<<<<< HEAD
Built by **Adithyan** — 4th year CS student

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-blue)](https://linkedin.com/in/yourprofile)
[![GitHub](https://img.shields.io/badge/GitHub-Follow-black)](https://github.com/yourusername)
=======
Built by **Adithyan** 

>>>>>>> c1db60f56da1f35c2a9d4e769e899cfcf29a73f6
