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
import uuid
from fastapi import APIRouter, status
from sklearn.preprocessing import LabelEncoder
from sklearn.feature_selection import mutual_info_classif
from ..models import Destination
from ..deps import db_dependency, user_dependency

router = APIRouter(prefix='/destinations', tags=['destinations'])

class DestinationBase(BaseModel):
    city: str
    country: str
    longitude: str
    latitude: str

class DestinationCreate(DestinationBase):
    pass

class DestinationRetrieve(DestinationBase):
    id: str

@router.get('/')
def get_destination(db: db_dependency, user: user_dependency, destination_id: str):
    return db.query(Destination).filter(Destination.id == destination_id).first()

@router.get('/destinations', response_model=list[DestinationRetrieve])
def get_destinations(db: db_dependency, user: user_dependency):
    destinations = db.query(Destination).all()
    return destinations


@router.post('/', status_code=status.HTTP_201_CREATED)
def create_destination(db: db_dependency, user: user_dependency, destination: DestinationCreate):
    db_destination = Destination(**destination.model_dump(), id=str(uuid.uuid4()))
    db.add(db_destination)
    db.commit()
    db.refresh(db_destination)
    return db_destination

@router.delete('/')
def delete_destination(db: db_dependency, user: user_dependency, destination_id: str):
    db_destination = db.query(Destination).filter(Destination.id == destination_id).first()
    if db_destination:
        db.delete(db_destination)
        db.commit()
    return db_destination  
    