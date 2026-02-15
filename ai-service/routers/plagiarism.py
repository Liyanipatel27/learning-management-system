<<<<<<< HEAD
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from services.plagiarism_engine import calculate_similarity

router = APIRouter()

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
    text_snippet: Optional[str] = None

class PlagiarismCheckResponse(BaseModel):
    highest_similarity: float
    risk_level: str
    matches: List[MatchItem]
    is_ai_verified: bool

@router.post("/check", response_model=PlagiarismCheckResponse)
async def check_plagiarism(request: PlagiarismCheckRequest):
    try:
        # Pydantic models to dict
        corpus_data = [item.dict() for item in request.corpus]
        
        result = calculate_similarity(request.target_text, corpus_data)
        
        return result
    except Exception as e:
        import traceback
        traceback.print_exc()
=======
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from services.plagiarism_engine import PlagiarismEngine

router = APIRouter()
plagiarism_engine = PlagiarismEngine()

class CorpusItem(BaseModel):
    id: str
    text: str
    submissionId: str

class PlagiarismRequest(BaseModel):
    target_text: str
    corpus: List[CorpusItem]

@router.post("/check")
async def check_plagiarism(request: PlagiarismRequest):
    try:
        result = plagiarism_engine.check_plagiarism(
            target_text=request.target_text,
            corpus=[item.dict() for item in request.corpus]
        )
        return result
    except Exception as e:
>>>>>>> tulsi
        raise HTTPException(status_code=500, detail=str(e))
