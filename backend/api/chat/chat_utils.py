import os
import uuid
import openai
from dotenv import load_dotenv
from typing import List, Optional
from langchain_openai.chat_models import ChatOpenAI
from langchain_postgres import PostgresChatMessageHistory
from langchain.prompts import ChatPromptTemplate
from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings
from fastapi import HTTPException, status
from langchain_core.messages import AIMessage, HumanMessage, BaseMessage
import psycopg
from sqlmodel import Field, Session, SQLModel, create_engine, select 
from datetime import datetime, timezone
from psycopg.rows import dict_row
from supabase import create_client, Client
import json


# --- SQLModel Definitions for Users and Chats ---
class User(SQLModel, table=True):
    """Represents a user in the system."""
    __tablename__ = "users"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True, sa_column_kwargs={"default": "gen_random_uuid()"})
    username: str = Field(unique=True, index=True)
    email: str = Field(unique=True, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Chat(SQLModel, table=True):
    """Represents a chat session, linked to a user."""
    __tablename__ = "chats"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True, sa_column_kwargs={"default": "gen_random_uuid()"})
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow, sa_column_kwargs={"onupdate": "now()"})

# --- ChatHandler Class ---
class ChatHandler:
    """
    Manages chat sessions, users, and message history with Supabase (PostgreSQL).
    It orchestrates interactions with the 'users', 'chats', and 'messages' tables.
    """
    def __init__(self):
        load_dotenv()
        self.load_api_key()

        # Initialize Chroma DB for document retrieval (remains the same)
        self._embedding = OpenAIEmbeddings(model="text-embedding-3-small")
        self._db = Chroma(persist_directory="./chat/chroma", embedding_function=self._embedding)
        self.check_if_db_loaded_successfully()

        # Get the Supabase connection string from environment variables
        self.supabase_connection_string = os.environ.get("SUPABASE_CONNECTION_STRING")
        if not self.supabase_connection_string:
            raise ValueError("SUPABASE_CONNECTION_STRING not set in environment.")
        
        # Initialize SQLModel engine for 'users' and 'chats' tables
        self.sqlmodel_engine = create_engine(self.supabase_connection_string)
        # Create SQLModel-managed tables (users, chats) if they don't exist
        SQLModel.metadata.create_all(self.sqlmodel_engine)
        
        url: str = os.environ.get("SUPABASE_URL")
        key: str = os.environ.get("SUPABASE_KEY")
        self.supabase: Client = create_client(url, key)

    def _get_db_session(self):
        """Helper to get a new SQLModel database session."""
        return Session(self.sqlmodel_engine)

    def check_if_db_loaded_successfully(self):
        """Validates that the Chroma DB is loaded and contains documents."""
        try:
            count = self._db._collection.count()
            if count > 0:
                print(f"✅ Chroma DB loaded successfully with {count} documents.")
            else:
                print("⚠️ Chroma DB loaded, but is empty. Make sure your data is persisted.")
        except Exception as e:
            print(f"❌ Error connecting to Chroma DB. Ensure the path is correct and the database is not corrupted. Error: {e}")

    def load_api_key(self):
        """Loads the OpenAI API key from environment variables."""
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY not set")
        openai.api_key = api_key

    # --- Chat Management Methods ---
    async def create_chat(self, user_id: uuid.UUID) -> Chat:
        """Creates a new chat session linked to a user."""
        with self._get_db_session() as session:
            # Verify user exists
            user = session.get(User, user_id)
            if not user:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found for chat creation.")
            
            chat = Chat(user_id=user_id)
            session.add(chat)
            session.commit()
            session.refresh(chat)
            return chat

    async def get_chat(self, chat_id: uuid.UUID) -> Optional[Chat]:
        """Retrieves a chat session by ID."""
        with self._get_db_session() as session:
            return session.get(Chat, chat_id)

    async def get_user_chats(self, user_id: uuid.UUID) -> List[Chat]:
        """Retrieves all chat sessions for a given user."""
        with self._get_db_session() as session:
            chats = session.exec(select(Chat).where(Chat.user_id == user_id).order_by(Chat.updated_at.desc())).all()
            return list(chats)

    async def get_or_create_chat_session(self, chat_id: Optional[uuid.UUID], user_id: uuid.UUID) -> uuid.UUID:
        """
        Gets an existing chat session or creates a new one, returning its ID.
        This ID will be used as LangChain's session_id for the messages table.
        """
        if chat_id:
            chat = await self.get_chat(chat_id)
            # Ensure chat exists and belongs to the specified user
            if chat and chat.user_id == user_id:
                return chat.id
            print(f"Warning: Chat ID {chat_id} not found or does not belong to user {user_id}. Creating new chat.")
        
        # If no valid chat_id provided or not found/owned, create a new chat
        new_chat = await self.create_chat(user_id=user_id)
        return new_chat.id

    def _query_relevant(self, text):
        """Queries the Chroma database for documents similar to the user's prompt."""
        return self._db.similarity_search_with_relevance_scores(text, k=3)

    def _compose_prompt(self, user_prompt, relevant_docs, history: List[BaseMessage]):
        """Composes a detailed prompt for the LLM."""
        PROMPT = """
        You are a helpful assistant. Use the conversation history and reference context to answer:
        Conversation History:
        {history}

        Context from docs:
        {context}

        Question:
        {query}
        """
        # Ensure the history is formatted correctly
        history_str = "\n".join(
            f"{'Human' if isinstance(m, HumanMessage) else 'AI'}: {m.content}" for m in history
        )
        context = "\n---\n".join(doc.page_content for doc, _ in relevant_docs)
        template = ChatPromptTemplate.from_template(PROMPT)
        return template.format(history=history_str, context=context, query=user_prompt)

    async def _retrieve_sorted_messages(
        self, chat_id: uuid.UUID
    ) -> Optional[List[dict]]:
        """
        Retrieves messages from the database sorted by created_at ascending.
        """
        try:
            response = (
                self.supabase.table("messages")
                .select("*")
                .eq("session_id", str(chat_id))
                .order("created_at", desc=False)
                .execute()
            )
            return response

        except Exception as e:
            print(f"❌ Error retrieving messages: {e}")
            return None

    async def retrieve_history(self, chat_id: uuid.UUID) -> Optional[List[BaseMessage]]:
        """
        Public method to fetch chat history as LangChain message objects,
        ensuring chronological order by created_at.
        """
        messages_db = await self._retrieve_sorted_messages(chat_id)
        if not messages_db:
            return None

        messages: List[BaseMessage] = []
        
        json_string = json.dumps(messages_db.data)
        parsed_data = json.loads(json_string)
        
        for entry in parsed_data:
            message_data = entry["message"]
            if not message_data:
                continue

            content = entry['message']['data']['content']
            metadata = entry['message']['data']['metadata']
            mtype = entry['message']['type']
            
            if mtype == "ai":
                messages.append(AIMessage(content=content, metadata=metadata))
            else:  # human
                messages.append(HumanMessage(content=content, metadata=metadata))

        return messages
    

    async def generate_chat_response(self, prompt: str, chat_id: uuid.UUID, user_id: uuid.UUID):
        """
        Generates a chat response, storing messages using the save_messages method.
        This version replaces LangChain's internal history management with manual saving.
        """
        # Create the user's message object
        user_message = HumanMessage(content=prompt, metadata={"user_id": str(user_id)})

        # Manually save the user's message to the database
        await self.save_messages(chat_id, [user_message])
        
        # Retrieve the full history, including the new user message, for context
        messages_from_db = await self.retrieve_history(chat_id)
        if not messages_from_db:
            # This case should not be reached if the save was successful
            # but is a good safeguard.
            messages_from_db = [user_message]
            
        # Use the last 3 messages for the LLM prompt to maintain context
        messages_for_prompt = messages_from_db[-3:]

        # Query the Chroma DB for relevant documents based on the prompt
        relevant = self._query_relevant(prompt)
        sources = "\n".join(
            f"{doc.metadata.get('source_file', 'N/A')} (id={doc.metadata.get('id', 'N/A')}, city_name={doc.metadata.get('city_name', 'N/A')})"
            for doc, score in relevant if score > 0
        )
        
        # Compose the full prompt for the LLM
        full_prompt = self._compose_prompt(prompt, relevant, messages_for_prompt)

        # Invoke the LLM to get a response
        model = ChatOpenAI(model_name="gpt-4o-mini", temperature=0.5)
        resp = model.invoke(full_prompt)
        assistant_msg_content = resp.content

        # Create the AI's message object with sources metadata
        ai_message = AIMessage(
            content=assistant_msg_content,
            metadata={"sources": sources}
        )
        
        # Manually save the AI's message to the database
        await self.save_messages(chat_id, [ai_message])

        # Update the 'updated_at' timestamp for the chat session in the chats table
        with self._get_db_session() as session:
            chat = session.get(Chat, chat_id)
            if chat:
                chat.updated_at = datetime.now(timezone.utc)
                session.add(chat)
                session.commit()
                
        return assistant_msg_content, sources


    async def save_messages(self, chat_id: uuid.UUID, messages_to_save: List[BaseMessage]):
        """
        Stores a list of LangChain BaseMessage objects in the 'messages' table in Supabase.
        Each message will be inserted as a new row. This method replicates the structure
        expected by PostgresChatMessageHistory for consistency.
        """
        records_to_insert = []
        current_time_utc = datetime.now(timezone.utc) # Use UTC for consistency

        for msg in messages_to_save:
            # Convert LangChain BaseMessage to a dictionary.
            # BaseMessage.dict() provides most of the necessary fields.
            msg_dict = msg.dict()

            # Replicate the nested structure found in your existing data,
            # which PostgresChatMessageHistory typically generates for the 'message' JSONB column.
            message_jsonb_value = {
                "lc": 1,  # LangChain version marker, often present
                "type": msg_dict["type"],
                "content": msg_dict["content"],
                "data": {
                    "id": None, # Based on your provided example entry
                    "name": None, # Based on your provided example entry
                    "type": msg_dict["type"], # Type is often duplicated inside 'data'
                    "content": msg_dict["content"], # Content is often duplicated inside 'data'
                    "example": msg_dict.get("example", False), # 'example' field might exist
                    "metadata": msg_dict["metadata"], # Original metadata from BaseMessage
                    "additional_kwargs": msg_dict.get("additional_kwargs", {}),
                    "response_metadata": msg_dict.get("response_metadata", {}) # For AI responses
                }
            }

            # Add specific fields for AI messages if they exist in the BaseMessage dict
            if msg.type == "ai":
                message_jsonb_value["data"]["tool_calls"] = msg_dict.get("tool_calls", [])
                message_jsonb_value["data"]["usage_metadata"] = msg_dict.get("usage_metadata")
                message_jsonb_value["data"]["invalid_tool_calls"] = msg_dict.get("invalid_tool_calls", [])

            record = {
                "session_id": str(chat_id),
                "created_at": current_time_utc.isoformat(), # Store as ISO string
                "message": message_jsonb_value # The JSONB field
            }
            records_to_insert.append(record)

        if records_to_insert:
            try:
                response = self.supabase.table("messages").insert(records_to_insert).execute()
                return response.data
            except Exception as e:
                print(f"❌ Error saving messages to Supabase: {e}")
                # Raise an HTTPException if you want FastAPI to catch this error
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
                    detail=f"Failed to save messages to database: {str(e)}"
                )
        return []
