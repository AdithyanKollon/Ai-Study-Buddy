from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from services.embeddings import query_chunks
from groq import Groq
import os, json
from dotenv import load_dotenv
import time
load_dotenv()

router = APIRouter()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

class ChatRequest(BaseModel):
    doc_id: str
    question: str
    chat_history: list = []

@router.post("/chat")
async def chat(req: ChatRequest):
    try:
        relevant_chunks = query_chunks(req.question, req.doc_id)
        context = "\n\n".join(relevant_chunks)

        history_text = ""
        for msg in req.chat_history[-6:]:
            role = msg.get("role", "")
            content = msg.get("content", "")
            history_text += f"{role}: {content}\n"

        messages = [
            {
                "role": "system",
                "content": f"""You are a helpful and friendly study assistant.
Answer the question based ONLY on the context provided below.
If the answer is not found in the context, say "I couldn't find that in your document."
Be concise and clear. If relevant, mention the page number from the context.

Context from document:
{context}

Previous conversation:
{history_text}"""
            },
            {
                "role": "user",
                "content": req.question
            }
        ]

        def stream_response():
            stream = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=messages,
                max_tokens=1024,
                stream=True   # this is the key change
            )
            for chunk in stream:
                token = chunk.choices[0].delta.content
                if token:
                    # send each token as a JSON line
                    yield f"data: {json.dumps({'token': token})}\n\n"
                    time.sleep(0.02)
            yield "data: [DONE]\n\n"

        return StreamingResponse(
            stream_response(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no"
            }
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))