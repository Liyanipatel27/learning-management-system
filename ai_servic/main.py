from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def root():
    return {"message": "AI service running successfully"}

from pydantic import BaseModel

class ChatRequest(BaseModel):
    message: str

@app.post("/chat")
def chat_ai(data: ChatRequest):
    user_message = data.message

    # Temporary dummy response
    return {
        "reply": f"AI received: {user_message}"
    }
