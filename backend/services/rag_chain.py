from groq import Groq
import os
from dotenv import load_dotenv

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def get_answer(question: str, context_chunks: list, chat_history: list = []):
    context = "\n\n".join(context_chunks)

    history_text = ""
    for msg in chat_history[-6:]:
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
            "content": question
        }
    ]

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",  # free, very capable model
        messages=messages,
        max_tokens=1024
    )

    return response.choices[0].message.content