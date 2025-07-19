from fastapi import FastAPI
from pydantic import BaseModel
from chat_utils import generate_chat_response

class UserMessage(BaseModel):
    prompt: str


app = FastAPI()


@app.post("/chat/")
async def root(new_message: UserMessage):
    response_text, response_sources = generate_chat_response(new_message.prompt)
    return {"message": response_text,
            "sources": response_sources
            }