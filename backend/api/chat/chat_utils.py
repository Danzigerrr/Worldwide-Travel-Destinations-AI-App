import uuid

import openai
import os
from dotenv import load_dotenv
from langchain.chat_models import ChatOpenAI
from langchain.memory import ConversationBufferWindowMemory
from langchain.prompts import ChatPromptTemplate
from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings
from fastapi import HTTPException, status


class ChatHandler:
    def __init__(self):
        self.load_api_key()
        self._embedding = OpenAIEmbeddings(model="text-embedding-3-small")
        self._db = Chroma(persist_directory="../chroma", embedding_function=self._embedding)
        self._memories = {}

    def load_api_key(self):
        load_dotenv()
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY not set")
        openai.api_key = api_key

    def create_session(self):
        sid = str(uuid.uuid4())
        self._memories[sid] = ConversationBufferWindowMemory(k=2, memory_key="chat_history", return_messages=True)
        return sid

    def _query_relevant(self, text):
        return self._db.similarity_search_with_relevance_scores(text, k=3)

    def _compose_prompt(self, user_prompt, relevant_docs, memory):
        PROMPT = """
        You are a helpful assistant. Use the conversation history and reference context to answer:
        Conversation History:
        {history}

        Context from docs:
        {context}

        Question:
        {query}
        """
        history = "\n".join(
            f"{m.type}: {m.content}" for m in memory.load_memory_variables({})["chat_history"]
        )
        context = "\n---\n".join(doc.page_content for doc, _ in relevant_docs)
        template = ChatPromptTemplate.from_template(PROMPT)
        return template.format(history=history, context=context, query=user_prompt)

    def generate_chat_response(self, prompt: str, session_id: str):
        if session_id not in self._memories:
            raise HTTPException(status_code=400, detail="Invalid session_id")
        memory = self._memories[session_id]
        relevant = self._query_relevant(prompt)
        full_prompt = self._compose_prompt(prompt, relevant, memory)
        model = ChatOpenAI(model_name="gpt-3.5-turbo", temperature=0.5)
        # run chain
        resp = model.generate([{"role": "system", "content": full_prompt}])
        assistant_msg = resp.generations[0][0].text
        # update history: add user + assistant
        memory.chat_memory.add_user_message(prompt)
        memory.chat_memory.add_ai_message(assistant_msg)
        sources = "\n".join(
            f"{doc.metadata.get('source_file')} (id={doc.metadata.get('id')})"
            for doc, _ in relevant
        )
        return assistant_msg, sources

    def get_memory(self, session_id: str) -> ConversationBufferWindowMemory | None:
            return self._memories.get(session_id)

    def retrieve_history(self, session_id: str):
        memory = self.get_memory(session_id)
        if not memory:
            return None
        return memory.buffer_as_messages
