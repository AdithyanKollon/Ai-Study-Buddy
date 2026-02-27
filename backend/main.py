from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import upload, chat, suggest, auth, docs, messages

app = FastAPI(title="AI Study Buddy API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)   

app.include_router(upload.router, prefix="/api", tags=["upload"])
app.include_router(chat.router, prefix="/api", tags=["chat"])
app.include_router(suggest.router, prefix="/api", tags=["suggest"])
app.include_router(auth.router, prefix="/api", tags=["auth"])
app.include_router(docs.router, prefix="/api", tags=["docs"])
app.include_router(messages.router, prefix="/api", tags=["messages"])

@app.get("/")
def root():
    return {"message": "AI Study Buddy API is running"}