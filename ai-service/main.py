from fastapi import FastAPI
<<<<<<< HEAD
from routers import plagiarism
from dotenv import load_dotenv
import os
=======
from fastapi.middleware.cors import CORSMiddleware
# from routers import evaluate, generate
from routers import plagiarism
import uvicorn
import os
from dotenv import load_dotenv
>>>>>>> tulsi

load_dotenv()

app = FastAPI()

<<<<<<< HEAD
app.include_router(plagiarism.router, prefix="/plagiarism", tags=["plagiarism"])
=======
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
>>>>>>> tulsi

@app.get("/")
def read_root():
    return {"message": "AI Service is running"}

<<<<<<< HEAD
@app.get("/health")
def health_check():
    return {"status": "ok"}
=======
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
>>>>>>> tulsi
