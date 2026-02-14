from fastapi import FastAPI
from routers import plagiarism
from dotenv import load_dotenv
import os

load_dotenv()

app = FastAPI()

app.include_router(plagiarism.router, prefix="/plagiarism", tags=["plagiarism"])

@app.get("/")
def read_root():
    return {"message": "AI Service is running"}

@app.get("/health")
def health_check():
    return {"status": "ok"}
