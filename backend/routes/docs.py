from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from db.supabase_client import supabase

router = APIRouter()

class SaveDocRequest(BaseModel):
    doc_id: str
    filename: str
    access_token: str

@router.post("/docs/save")
async def save_doc(req: SaveDocRequest):
    try:
        # get user from token
        user = supabase.auth.get_user(req.access_token)
        user_id = user.user.id

        supabase.table("documents").insert({
            "user_id": user_id,
            "doc_id": req.doc_id,
            "filename": req.filename
        }).execute()

        return {"message": "Document saved"}
    except Exception as e:
        print(f"DOCS SAVE ERROR: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/docs/list")
async def list_docs(access_token: str):
    try:
        user = supabase.auth.get_user(access_token)
        user_id = user.user.id

        res = supabase.table("documents")\
            .select("*")\
            .eq("user_id", user_id)\
            .order("created_at", desc=True)\
            .execute()

        return {"documents": res.data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
@router.delete("/docs/delete/{doc_id}")
async def delete_doc(doc_id: str, access_token: str):
    try:
        user = supabase.auth.get_user(access_token)
        user_id = user.user.id

        supabase.table("documents")\
            .delete()\
            .eq("user_id", user_id)\
            .eq("doc_id", doc_id)\
            .execute()

        return {"message": "Document deleted"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))