import chromadb

client = chromadb.PersistentClient(path="./chroma_store")

def get_or_create_collection(name: str):
    return client.get_or_create_collection(name=name)

def get_collection(name: str):
    return client.get_collection(name=name)