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
        "content": f"""You are an intelligent and friendly study assistant helping students learn effectively.

        You have access to a document the user uploaded. Use the following rules:

            1. **If the question is about the document**: Answer using ONLY the context provided. Be detailed for complex questions, concise for simple ones. Mention page numbers if available.

            2. **If the question is a general educational question** (math, science, history, coding, etc.): Answer helpfully using your knowledge. You are allowed to answer educational questions even if they're not in the document.

            3. **If the question is completely unrelated to education** (e.g. sports scores, celebrity gossip, personal advice, jokes): Politely decline and say: "I'm focused on helping you study! Ask me anything educational or about your document."

            4. **Never make up information** about the document. If something isn't in the context, say so clearly.


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