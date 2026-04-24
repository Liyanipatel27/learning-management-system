from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
# from routers import evaluate, generate
from routers import plagiarism
import uvicorn
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# app.include_router(evaluate.router, prefix="/api/evaluate", tags=["Evaluation"])
# app.include_router(generate.router, prefix="/api/generate", tags=["Generation"])
app.include_router(plagiarism.router, prefix="/plagiarism", tags=["Plagiarism"])

@app.get("/")
def read_root():
    return {"message": "AI Service is running"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
