from fastapi import APIRouter, UploadFile, File, HTTPException
import shutil, uuid, os, tempfile
from services.pdf_processor import extract_and_chunk
from services.embeddings import store_chunks

router = APIRouter()

@router.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files allowed")
    
    doc_id = str(uuid.uuid4())
    temp_path = os.path.join(tempfile.gettempdir(), f"{doc_id}.pdf")
    
    try:
        with open(temp_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
        
        chunks = extract_and_chunk(temp_path)
        print(f"Chunks extracted: {len(chunks)}")
        count = store_chunks(chunks, collection_name=doc_id)
        print(f"Chunks stored: {count}")
        
        return {
            "doc_id": doc_id,
            "filename": file.filename,
            "chunks_stored": count,
            "message": "PDF processed successfully"
        }
    except Exception as e:
        print(f"UPLOAD ERROR: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)