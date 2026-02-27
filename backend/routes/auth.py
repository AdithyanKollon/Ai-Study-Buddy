from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from db.supabase_client import supabase

router = APIRouter()

class AuthRequest(BaseModel):
    email: str
    password: str

@router.post("/auth/signup")
async def signup(req: AuthRequest):
    try:
        print(f"Attempting signup for: {req.email}")
        res = supabase.auth.sign_up({
            "email": req.email,
            "password": req.password
        })
        print(f"Signup result: {res}")
        return {"message": "Signup successful"}
    except Exception as e:
        print(f"Signup error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/auth/login")
async def login(req: AuthRequest):
    try:
        res = supabase.auth.sign_in_with_password({
            "email": req.email,
            "password": req.password
        })
        return {
            "access_token": res.session.access_token,
            "user_id": res.user.id,
            "email": res.user.email
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))