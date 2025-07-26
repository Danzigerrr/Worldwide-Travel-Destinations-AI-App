from typing import List, Optional
from ..chat.chat_utils import ChatHandler
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel


class ChatRequest(BaseModel):
    prompt: str
    session_id: Optional[str] = None


class ChatResponse(BaseModel):
    response: str
    sources: str
    session_id: str


class MessageEntry(BaseModel):
    role: str
    content: str


class ConversationRetrieve(BaseModel):
    session_id: str
    history: List[MessageEntry]


router = APIRouter(prefix="/chat", tags=["chat"])
handler = ChatHandler()


@router.post("/", response_model=ChatResponse)
async def chat_endpoint(req: ChatRequest):
    # Use session_id to maintain per-session memory state
    sid = req.session_id or handler.create_session()
    response, sources = handler.generate_chat_response(req.prompt, session_id=sid)
    return ChatResponse(response=response, sources=sources, session_id=sid)


@router.get("/{session_id}", response_model=ConversationRetrieve)
async def get_conversation(session_id: str):
    msgs = handler.retrieve_history(session_id)
    if msgs is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    history = [{"role": m.type, "content": m.content} for m in msgs]
    return ConversationRetrieve(session_id=session_id, history=history)
