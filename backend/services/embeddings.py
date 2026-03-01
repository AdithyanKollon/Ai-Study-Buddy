import chromadb
import cohere
import os
from dotenv import load_dotenv

load_dotenv()

co = cohere.Client(os.getenv("COHERE_API_KEY"))
client = chromadb.PersistentClient(path="./chroma_store")

def get_embeddings(texts: list) -> list:
    response = co.embed(
        texts=texts,
        model="embed-english-light-v3.0",
        input_type="search_document"
    )
    return response.embeddings

def store_chunks(chunks: list, collection_name: str):
    collection = client.get_or_create_collection(name=collection_name)
    embeddings = get_embeddings(chunks)
    ids = [f"chunk_{i}" for i in range(len(chunks))]
    collection.add(documents=chunks, embeddings=embeddings, ids=ids)
    return len(chunks)

def query_chunks(question: str, collection_name: str, n_results: int = 5):
    collection = client.get_collection(name=collection_name)
    question_embedding = co.embed(
        texts=[question],
        model="embed-english-light-v3.0",
        input_type="search_query"
    ).embeddings
    results = collection.query(
        query_embeddings=question_embedding,
        n_results=n_results
    )
    return results["documents"][0]