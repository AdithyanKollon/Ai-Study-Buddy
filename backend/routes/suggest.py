from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.embeddings import query_chunks
from groq import Groq
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

class SuggestRequest(BaseModel):
    doc_id: str

@router.post("/suggest")
async def suggest_questions(req: SuggestRequest):
    try:
        # grab some chunks to understand the document
        chunks = query_chunks("main topic overview introduction", req.doc_id, n_results=5)
        context = "\n\n".join(chunks)

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": "You generate short study questions based on document content."
                },
                {
                    "role": "user",
                    "content": f"""Based on this content, generate exactly 5 short questions a student might ask.
Return ONLY a JSON array of 5 strings, nothing else. No explanation, no markdown, just the array.
Example: ["What is X?", "How does Y work?", "What are the types of Z?", "Why is A important?", "What is the difference between B and C?"]

Content:
{context}"""
                }
            ],
            max_tokens=300
        )

        raw = response.choices[0].message.content.strip()

        # safely parse the JSON array
        import json
        questions = json.loads(raw)
        return {"questions": questions[:5]}

    except Exception as e:
        # fallback questions if parsing fails
        return {"questions": [
            "What is the main topic of this document?",
            "What are the key concepts explained here?",
            "Can you summarize this document?",
            "What are the important points to remember?",
            "What conclusions does this document reach?"
        ]}