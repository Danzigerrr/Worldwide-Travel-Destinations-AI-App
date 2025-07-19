from fastapi import FastAPI
from pydantic import BaseModel
from chat_utils import ChatHandler, UserMessage


app = FastAPI()

chat_handler = ChatHandler()

@app.post("/chat/")
async def root(new_message: UserMessage):
    response_text, response_sources = chat_handler.generate_chat_response(new_message.prompt)
    return  {
            "message": response_text,
            "sources": response_sources
            }