import os
import uuid
import openai
import os
from dotenv import load_dotenv
from typing import List

from langchain_openai.chat_models import ChatOpenAI
from langchain_community.chat_message_histories import PostgresChatMessageHistory
from langchain.prompts import ChatPromptTemplate
from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings
from fastapi import HTTPException, status
from langchain_core.messages import AIMessage, HumanMessage, BaseMessage
from langchain.memory import ConversationBufferWindowMemory

class ChatHandler:
    """
    Manages chat sessions with a PostgreSQL database (Supabase) for persistent memory.
    """
    def __init__(self):
        # Load environment variables (including SUPABASE_CONNECTION_STRING)
        load_dotenv()
        self.load_api_key()

        # Initialize the Chroma DB for document retrieval
        self._embedding = OpenAIEmbeddings(model="text-embedding-3-small")
        self._db = Chroma(persist_directory="./chat/chroma", embedding_function=self._embedding)
        self.check_if_db_loaded_successfully()

        # Get the Supabase connection string from environment variables
        self.connection_string = os.environ.get("SUPABASE_CONNECTION_STRING")
        if not self.connection_string:
            raise ValueError("SUPABASE_CONNECTION_STRING not set in environment.")

    def check_if_db_loaded_successfully(self):
        # ... (This method remains the same)
        try:
            count = self._db._collection.count()
            if count > 0:
                print(f"✅ Chroma DB loaded successfully with {count} documents.")
            else:
                print("⚠️ Chroma DB loaded, but is empty. Make sure your data is persisted.")
        except Exception as e:
            print(f"❌ Error connecting to Chroma DB. Error: {e}")

    def load_api_key(self):
        # ... (This method remains the same)
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY not set")
        openai.api_key = api_key

    def _get_history_for_session(self, session_id: str):
        """
        Retrieves the history object for a given session from the database.
        """
        return PostgresChatMessageHistory(
            session_id=session_id,
            connection_string=self.connection_string,
        )
    
    def create_session(self):
        """
        Creates a new chat session with a unique ID.
        """
        return str(uuid.uuid4())
        
    def _query_relevant(self, text):
        # ... (This method remains the same)
        return self._db.similarity_search_with_relevance_scores(text, k=3)

    def _compose_prompt(self, user_prompt, relevant_docs, history: List[BaseMessage]):
        # ... (This method remains the same)
        PROMPT = """
        You are a helpful assistant. Use the conversation history and reference context to answer:
        Conversation History:
        {history}

        Context from docs:
        {context}

        Question:
        {query}
        """
        history_str = "\n".join(
            f"{'Human' if isinstance(m, HumanMessage) else 'AI'}: {m.content}" for m in history
        )
        context = "\n---\n".join(doc.page_content for doc, _ in relevant_docs)
        template = ChatPromptTemplate.from_template(PROMPT)
        return template.format(history=history_str, context=context, query=user_prompt)

    def generate_chat_response(self, prompt: str, session_id: str):
        """
        Generates a chat response using a database-backed memory.
        """
        chat_history = self._get_history_for_session(session_id)
        
        # Use the last 3 messages for a context window of 3 (k=3)
        all_messages = chat_history.messages
        messages_to_prompt = all_messages[-3:]

        relevant = self._query_relevant(prompt)
        full_prompt = self._compose_prompt(prompt, relevant, messages_to_prompt)

        model = ChatOpenAI(model_name="gpt-3.5-turbo", temperature=0.5)
        
        resp = model.invoke(full_prompt)
        assistant_msg = resp.content

        # Add messages to the database, they are now persisted
        chat_history.add_user_message(prompt)
        chat_history.add_ai_message(assistant_msg)
        
        sources = "\n".join(
            f"{doc.metadata.get('source_file', 'N/A')} (id={doc.metadata.get('id', 'N/A')})"
            for doc, _ in relevant
        )
        return assistant_msg, sources

    def retrieve_history(self, session_id: str):
        """
        Retrieves the full list of messages from the database.
        """
        chat_history = self._get_history_for_session(session_id)
        
        # If the messages list is empty, the session does not exist.
        if not chat_history.messages:
            return None
        return chat_history.messages
    