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
            print(f"entry:{entry}")
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
        Generates a chat response, storing messages in the 'messages' table
        using LangChain's history manager.
        """
        # Get the LangChain history manager for this specific chat
        langchain_chat_history = self._get_langchain_chat_history(chat_id)
        
        # Store the user's message. The user_id is passed as metadata.
        # PostgresChatMessageHistory handles saving this into the JSONB 'message' column.
        langchain_chat_history.add_user_message(
            HumanMessage(content=prompt, metadata={"user_id": str(user_id)})
        )
        
        # Fetch up-to-date messages for prompt context
        # Note: `messages` is a property that gets messages from the database.
        messages_for_prompt = langchain_chat_history.messages[-3:]

        relevant = self._query_relevant(prompt)
        sources = "\n".join(
            f"{doc.metadata.get('source_file', 'N/A')} (id={doc.metadata.get('id', 'N/A')})"
            for doc, _ in relevant
        )
        
        full_prompt = self._compose_prompt(prompt, relevant, messages_for_prompt)

        model = ChatOpenAI(model_name="gpt-4o-mini", temperature=0.5)
        
        resp = model.invoke(full_prompt)
        assistant_msg_content = resp.content

        # Store the AI's response.
        # PostgresChatMessageHistory handles saving this into the JSONB 'message' column.
        ai_message = AIMessage(
            content=assistant_msg_content,
            metadata={"sources": sources}
        )
        langchain_chat_history.add_ai_message(ai_message)

        # Update the 'updated_at' timestamp for the chat session in the chats table
        with self._get_db_session() as session:
            chat = session.get(Chat, chat_id)
            if chat:
                chat.updated_at = datetime.utcnow()
                session.add(chat)
                session.commit()
        

        return assistant_msg_content, sources
