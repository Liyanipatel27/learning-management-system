from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from services.ocr_service import extract_text_from_file
from typing import Optional

router = APIRouter(prefix="/ocr", tags=["OCR"])

@router.post("/extract")
async def extract_text(
    file: UploadFile = File(...),
    lang: Optional[str] = Form("ml") # Default to 'ml' as requested
):
    """
    Extract text from an uploaded file (PDF or Image).
    """
    try:
        content = await file.read()
        text = extract_text_from_file(content, file.filename, lang=lang)
        return {"filename": file.filename, "extracted_text": text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
