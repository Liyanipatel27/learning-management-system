from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import List, Optional
import json
from services.plagiarism_engine import calculate_similarity
from services.ocr_service import extract_text_from_file

router = APIRouter(prefix="/plagiarism", tags=["Plagiarism"])

class CorpusItem(BaseModel):
    id: str
    submissionId: str
    text: str

class PlagiarismCheckRequest(BaseModel):
    target_text: str
    corpus: List[CorpusItem]

class MatchItem(BaseModel):
    studentId: str
    submissionId: str
    similarity: float

class PlagiarismCheckResponse(BaseModel):
    highest_similarity: float
    risk_level: str
    matches: List[MatchItem]
    is_ai_verified: bool

@router.post("/check", response_model=PlagiarismCheckResponse)
async def check_plagiarism(request: PlagiarismCheckRequest):
    try:
        # Transform corpus to list of dicts as expected by engine
        corpus_data = [item.dict() for item in request.corpus]
        
        result = calculate_similarity(request.target_text, corpus_data)
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/check-file", response_model=PlagiarismCheckResponse)
async def check_plagiarism_file(
    file: UploadFile = File(...),
    corpus: str = Form(...), # JSON string of corpus
    lang: Optional[str] = Form("ml") 
):
    """
    Check plagiarism for an uploaded file (PDF/Image) against a corpus.
    Corpus must be a JSON string.
    """
    try:
        # Read file
        content = await file.read()
        
        # Extract Text
        target_text = extract_text_from_file(content, file.filename, lang=lang)
        
        if not target_text or len(target_text.strip()) == 0:
             raise HTTPException(status_code=400, detail="Could not extract text from file.")

        # Parse corpus
        try:
            corpus_data = json.loads(corpus)
            # Basic validation could happen here, but engine handles it.
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid JSON in corpus field")
            
        result = calculate_similarity(target_text, corpus_data)
        
        return result
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
