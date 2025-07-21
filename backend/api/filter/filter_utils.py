from langchain_openai import OpenAIEmbeddings
from langchain_chroma import Chroma
from langchain.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from dotenv import load_dotenv
import openai
import os
from pydantic import BaseModel
from typing import List, Literal, Optional
import pandas as pd
from sklearn.preprocessing import LabelEncoder
from sklearn.feature_selection import mutual_info_classif


class Location(BaseModel):
    id: str
    name: str
    
class SelectedLocations(BaseModel):
    locations: List[Location]
     
class SelectedFilter(BaseModel):
    question: str
    feature: str
    type: Literal["binary", "categorical"]
    values: List[str]
    value_meanings: Optional[dict[str, str]]

class DataLoader():
    
    def load_data():
        df = pd.read_csv("../data/TravelDataset.csv")
        return df

class FilterHandler:

    def __init__(self):
        data_loader = DataLoader()
        self._data = data_loader.load_data()

    def measure_information_gain():
        pass
    
    def create_dynamic_filters():
        pass

    def generate_new_filters_based_on_selected_locations(selected_locations: SelectedLocations):
        pass