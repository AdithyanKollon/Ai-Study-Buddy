import chromadb
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

HF_TOKEN = os.getenv("HF_TOKEN")
EMBEDDING_URL = "https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2"

client = chromadb.PersistentClient(path="/app/chroma_store")

def get_embeddings(texts: list) -> list:
    headers = {"Authorization": f"Bearer {HF_TOKEN}"}
    response = httpx.post(
        EMBEDDING_URL,
        headers=headers,
        json={"inputs": texts, "options": {"wait_for_model": True}},
        timeout=30
    )
    return response.json()

def store_chunks(chunks: list, collection_name: str):
    collection = client.get_or_create_collection(name=collection_name)
    embeddings = get_embeddings(chunks)
    ids = [f"chunk_{i}" for i in range(len(chunks))]
    collection.add(documents=chunks, embeddings=embeddings, ids=ids)
    return len(chunks)

def query_chunks(question: str, collection_name: str, n_results: int = 5):
    collection = client.get_collection(name=collection_name)
    question_embedding = get_embeddings([question])
    results = collection.query(
        query_embeddings=question_embedding,
        n_results=n_results
    )
    return results["documents"][0]