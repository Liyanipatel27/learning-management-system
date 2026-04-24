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
        raise HTTPException(status_code=500, detail=str(e))
