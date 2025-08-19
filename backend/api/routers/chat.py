from typing import List, Optional
from ..chat.chat_utils import ChatHandler
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel


# Pydantic models to define request and response data structures.
class ChatRequest(BaseModel):
    """Defines the structure for an incoming chat request."""
    prompt: str  # The user's message.
    session_id: Optional[str] = None  # The unique ID for the chat session, optional for a new chat.


class ChatResponse(BaseModel):
    """Defines the structure for the chat response from the server."""
    response: str  # The AI's generated message.
    sources: str  # Any source information used to generate the response.
    session_id: str  # The session ID, returned to the client for subsequent requests.


class MessageEntry(BaseModel):
    """Defines the structure for a single message in the conversation history."""
    role: str  # The role of the speaker (e.g., "Human", "AI").
    content: str  # The content of the message.


class ConversationRetrieve(BaseModel):
    """Defines the structure for retrieving the full conversation history."""
    session_id: str  # The session ID of the conversation.
    history: List[MessageEntry]  # A list of messages in the conversation.


# Initializes the API router and the chat handler.
router = APIRouter(prefix="/chat", tags=["chat"])
handler = ChatHandler()


@router.post("/", response_model=ChatResponse)
async def chat_endpoint(req: ChatRequest):
    """
    Handles a new chat message. It either creates a new session or uses an existing one.
    - If `session_id` is provided in the request, it continues the existing conversation.
    - If `session_id` is not provided, it creates a new session.
    """
    # Create a new session if one isn't provided, or use the existing one.
    sid = req.session_id or handler.create_session()

    # Generate the AI response using the chat handler.
    try:
        response, sources = handler.generate_chat_response(req.prompt, session_id=sid)
    except HTTPException as e:
        # Re-raise the exception from the handler to maintain correct status code.
        raise e

    return ChatResponse(response=response, sources=sources, session_id=sid)


@router.get("/{session_id}", response_model=ConversationRetrieve)
async def get_conversation(session_id: str):
    """
    Retrieves the conversation history for a specific session ID.
    - Raises a 404 error if the session ID is not found.
    - Returns the list of messages for the session.
    """
    # Retrieve the list of messages from the handler.
    msgs = handler.retrieve_history(session_id)

    # Handle the case where the session ID is not found.
    if msgs is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    # Correctly map the message objects from the handler to the Pydantic model.
    history = [{"role": m.type, "content": m.content} for m in msgs]

    return ConversationRetrieve(session_id=session_id, history=history)
