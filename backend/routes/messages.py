from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from db.supabase_client import supabase

router = APIRouter()

class SaveMessageRequest(BaseModel):
    doc_id: str
    role: str
    content: str
    access_token: str

class GetMessagesRequest(BaseModel):
    doc_id: str
    access_token: str

@router.post("/messages/save")
async def save_message(req: SaveMessageRequest):
    try:
        user = supabase.auth.get_user(req.access_token)
        user_id = user.user.id

        supabase.table("messages").insert({
            "user_id": user_id,
            "doc_id": req.doc_id,
            "role": req.role,
            "content": req.content
        }).execute()

        return {"message": "Saved"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/messages/get")
async def get_messages(req: GetMessagesRequest):
    try:
        user = supabase.auth.get_user(req.access_token)
        user_id = user.user.id

        res = supabase.table("messages")\
            .select("*")\
            .eq("user_id", user_id)\
            .eq("doc_id", req.doc_id)\
            .order("created_at", desc=False)\
            .execute()

        return {"messages": res.data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/messages/delete/{doc_id}")
async def delete_messages(doc_id: str, access_token: str):
    try:
        user = supabase.auth.get_user(access_token)
        user_id = user.user.id

        supabase.table("messages")\
            .delete()\
            .eq("user_id", user_id)\
            .eq("doc_id", doc_id)\
            .execute()

        return {"message": "Deleted"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))