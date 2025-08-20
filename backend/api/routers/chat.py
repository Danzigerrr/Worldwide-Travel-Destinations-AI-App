from typing import List, Optional
from ..chat.chat_utils import ChatHandler
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
import uuid
from datetime import datetime
import operator


# --- Pydantic Models (add for User and Chat creation/retrieval) ---
class ChatCreateRequest(BaseModel):
    user_id: uuid.UUID

class ChatResponseModel(BaseModel): 
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

class ChatRequest(BaseModel):
    prompt: str
    chat_id: Optional[uuid.UUID] = None
    user_id: uuid.UUID 

class ChatMessageResponse(BaseModel): 
    message: str
    sources: str
    chat_id: uuid.UUID 

class MessageEntry(BaseModel):
    role: str
    content: str
    user_id: Optional[uuid.UUID] = None
    sources: Optional[str] = None

class ConversationRetrieve(BaseModel):
    chat_id: uuid.UUID
    history: List[MessageEntry]

# --- FastAPI Router and Handler Initialization ---
router = APIRouter(prefix="/chat", tags=["chat"])
handler = ChatHandler() 

@router.post("/chats/", response_model=ChatResponseModel, status_code=status.HTTP_201_CREATED)
async def create_new_chat(chat_req: ChatCreateRequest):
    """Creates a new chat session linked to a user."""
    try:
        chat = await handler.create_chat(user_id=chat_req.user_id)
        return chat
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/users/{user_id}/chats/", response_model=List[ChatResponseModel])
async def get_user_chat_sessions(user_id: uuid.UUID):
    """Retrieves all chat sessions for a given user."""
    chats = await handler.get_user_chats(user_id)
    return chats

@router.post("/", response_model=ChatMessageResponse)
async def chat_endpoint(req: ChatRequest):
    """
    Handles a new chat message. It either uses an existing chat session or creates a new one.
    Requires a user_id for every interaction.
    """
    # Get or create a chat session based on provided chat_id and user_id
    chat_id = await handler.get_or_create_chat_session(req.chat_id, req.user_id)

    try:
        message, sources = await handler.generate_chat_response(
            req.prompt, chat_id=chat_id, user_id=req.user_id
        )
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    
    return ChatMessageResponse(message=message, sources=sources, chat_id=chat_id)


@router.get("/{chat_id}", response_model=ConversationRetrieve)
async def get_conversation(chat_id: uuid.UUID):
    """
    Retrieves the conversation history for a specific chat ID,
    assigning the message role based on the message type.
    """
    msgs = await handler.retrieve_history(chat_id)
    if not msgs:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Chat session not found or has no messages."
        )
    
    # Map LangChain BaseMessage objects to your Pydantic MessageEntry
    history = []
    for m in msgs:
        # Use the `m.type` attribute to determine the role
        role = m.type
        
        # Extract the metadata if available
        if role == "human":
            user_id = m.metadata.get("user_id")
            entry = {
                "role": role, 
                "content": m.content,
                "user_id": user_id 
            }
        else:
            sources = m.metadata.get("sources")
            entry = {
                "role": role, 
                "content": m.content,
                "sources": sources 
            }
        history.append(entry)
    
    return ConversationRetrieve(chat_id=chat_id, history=history)


