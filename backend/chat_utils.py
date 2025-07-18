from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
from langchain.document_loaders import TextLoader
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import Chroma
from langchain.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from dotenv import load_dotenv
import openai
import os


def load_api_key():
    load_dotenv()
    openai.api_key = os.environ['OPENAI_API_KEY']

def get_embedding_function():
    embedding_model = "text-embedding-3-small"
    embedding_function = OpenAIEmbeddings(model=embedding_model)
    return embedding_function

def get_chroma_path():
    CHROMA_PATH = "../chroma"
    return CHROMA_PATH

def query_relevant_data(query_text: str):
    # load the database
    db = Chroma(persist_directory=get_chroma_path(), embedding_function=get_embedding_function())
    results = db.similarity_search_with_relevance_scores(query_text, k=3)
    if len(results) == 0:
        print("Unable to find any matching results")
    else:
        print("Results:\n")
        for result in results:
            print(f"score: {result[1]}\n, the city: {result[0]}\n--------\n")

    return results

def craft_reponse(prompt, relevant_data):
    PROMPT_TEMPLATE = """
        Answer the following question about travelling {query} based on the following context:
        {context}
    """
    context_text = "\n\n---\n\n".join([doc.page_content for doc, _score in relevant_data])
    prompt_template = ChatPromptTemplate.from_template(PROMPT_TEMPLATE)
    prompt = prompt_template.format(query=prompt, context=context_text)
    
    model = ChatOpenAI(model="gpt-4o-mini")
    response_text = model.invoke(prompt)

    formatted_response = f"Response: {response_text.content}"
    
    sources, city_name, city_id = zip(*[(doc.metadata.get("source_file", None), doc.metadata.get("city_name", None), doc.metadata.get("id", None)) for doc, _score in relevant_data])

    formatted_sources = "Sources:\n" + "\n".join(
        f"{source}, City: {city}, City_id: {city_id}"
        for source, city, city_id in zip(sources, city_name, city_id)
    )
    
    return formatted_response, formatted_sources


def generate_chat_response(prompt: str):
    load_api_key()
    relevant_data = query_relevant_data(prompt)
    formatted_response, formatted_sources = craft_reponse(prompt, relevant_data)
    return formatted_response, formatted_sources