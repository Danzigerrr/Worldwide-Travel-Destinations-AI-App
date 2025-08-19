import uuid
import openai
import os
from dotenv import load_dotenv
from langchain_openai.chat_models import ChatOpenAI
from langchain.memory import ConversationBufferWindowMemory
from langchain.prompts import ChatPromptTemplate
from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings
from fastapi import HTTPException, status
from langchain_core.messages import AIMessage, HumanMessage


class ChatHandler:
    """
    Manages chat sessions, including creating sessions, storing conversational memory,
    retrieving relevant documents, and generating responses using an LLM.
    """

    def __init__(self):
        # Initialize resources like OpenAI API key, embeddings, and a database connection.
        self.load_api_key()
        self._embedding = OpenAIEmbeddings(model="text-embedding-3-small")
        self._db = Chroma(persist_directory="./chat/chroma", embedding_function=self._embedding)
        self.check_if_db_loaded_successfully()

        self._memories = {}  # Stores ConversationBufferWindowMemory objects, keyed by session ID.

    def check_if_db_loaded_successfully(self):
        # Check if the DB is loaded with data
        try:
            # The _collection attribute provides access to the underlying ChromaDB client.
            # You can get the number of items in the collection.
            count = self._db._collection.count()
            print(f"✅ Chroma DB loaded successfully with {count} documents.")
        except Exception as e:
            print(f"❌ Failed to load Chroma DB or get document count. Error: {e}")

    def load_api_key(self):
        """
        Loads the OpenAI API key from environment variables to authenticate with the API.
        """
        load_dotenv()
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY not set")
        openai.api_key = api_key

    def create_session(self):
        """
        Creates a new chat session with a unique ID and initializes a
        ConversationBufferWindowMemory to store the last two messages (k=2).
        Returns the new session ID.
        """
        sid = str(uuid.uuid4())
        # Store a new memory object, using a window of k=2 to remember the last 2 interactions.
        self._memories[sid] = ConversationBufferWindowMemory(k=2, memory_key="chat_history", return_messages=True)
        return sid

    def _query_relevant(self, text):
        """
        Queries the Chroma database for documents similar to the user's prompt.
        This provides context for the LLM to generate a more informed response.
        """
        # Returns a list of (Document, relevance_score) tuples.
        return self._db.similarity_search_with_relevance_scores(text, k=3)

    def _compose_prompt(self, user_prompt, relevant_docs, memory):
        """
        Composes a detailed prompt for the LLM, combining conversation history,
        relevant documents, and the user's current question.
        """
        # Defines the system prompt template.
        PROMPT = """
        You are a helpful assistant. Use the conversation history and reference context to answer:
        Conversation History:
        {history}

        Context from docs:
        {context}

        Question:
        {query}
        """
        # Get the history from memory variables.
        history_messages = memory.load_memory_variables({})["chat_history"]
        history = "\n".join(
            f"{'Human' if isinstance(m, HumanMessage) else 'AI'}: {m.content}" for m in history_messages
        )
        # Format the relevant documents into a single string.
        context = "\n---\n".join(doc.page_content for doc, _ in relevant_docs)
        # Create and format the final prompt with all components.
        template = ChatPromptTemplate.from_template(PROMPT)
        return template.format(history=history, context=context, query=user_prompt)

    def generate_chat_response(self, prompt: str, session_id: str):
        """
        Generates a chat response based on the user's prompt, session history,
        and relevant documents. Updates the session memory with the new interaction.
        """
        # Validate that the session ID exists.
        if session_id not in self._memories:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid session_id")

        memory = self._memories[session_id]

        # Add the user's message to the chat history before generating a response.
        memory.chat_memory.add_user_message(prompt)

        relevant = self._query_relevant(prompt)

        full_prompt = self._compose_prompt(prompt, relevant, memory)

        model = ChatOpenAI(model_name="gpt-3.5-turbo", temperature=0.5)

        # Run the LLM chain.
        resp = model.invoke(full_prompt)
        assistant_msg = resp.content

        # Add the AI's response to the chat history.
        memory.chat_memory.add_ai_message(assistant_msg)

        # Extract sources from the relevant documents.
        sources = "\n".join(
            f"{doc.metadata.get('source_file')} (id={doc.metadata.get('id')})"
            for doc, _ in relevant
        )

        return assistant_msg, sources

    def get_memory(self, session_id: str) -> ConversationBufferWindowMemory | None:
        """
        Retrieves the memory object for a given session ID.
        """
        return self._memories.get(session_id)

    def retrieve_history(self, session_id: str):
        """
        Retrieves the full list of messages from a session's memory buffer.
        """
        memory = self.get_memory(session_id)
        if not memory:
            return None
        # Returns a list of BaseMessage objects (e.g., HumanMessage, AIMessage).
        return memory.buffer_as_messages
