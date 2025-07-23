from langchain_openai import OpenAIEmbeddings
from langchain_chroma import Chroma
from langchain.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from dotenv import load_dotenv
import openai
import os
from pydantic import BaseModel, Field
from typing import List, Literal, Optional
import pandas as pd
import uuid
from fastapi import APIRouter, status, Depends
from fastapi_filter import FilterDepends, with_prefix
from fastapi_filter.contrib.sqlalchemy import Filter
from sklearn.preprocessing import LabelEncoder
from sklearn.feature_selection import mutual_info_classif
from ..models import Destination
from ..deps import db_dependency, user_dependency

router = APIRouter(
    prefix='/destinations',
    tags=['destinations']
)

class DestinationBase(BaseModel):
    city: str
    country: str
    longitude: str
    latitude: str

class DestinationCreate(DestinationBase):
    pass

class DestinationRetrieve(DestinationBase):
    id: str


class DestinationFilter(Filter):
    # Basic strings
    city: Optional[str] = Field(None, description="Filter by exact city name")
    country: Optional[str] = Field(None, description="Filter by exact country name")
    region: Optional[str] = Field(None, description="Filter by exact region")
    short_description: Optional[str] = Field(
        None, description="Filter by substring match in description"
    )
    budget_level: Optional[str] = Field(None, description="Filter by budget level")

    # Geographic coordinates (range filters)
    latitude__gte: Optional[float] = Field(None, description="Latitude ≥ this value")
    latitude__lte: Optional[float] = Field(None, description="Latitude ≤ this value")
    longitude__gte: Optional[float] = Field(None, description="Longitude ≥ this value")
    longitude__lte: Optional[float] = Field(None, description="Longitude ≤ this value")

    # Average‐temperature JSON string—here we treat it as a text match
    avg_temp_monthly: Optional[str] = Field(
        None, description="Filter by exact JSON string match"
    )

    # Thematic scores: allow exact or range queries
    culture: Optional[int] = Field(None, description="Exact culture score")
    culture__gte: Optional[int] = Field(None, description="Culture score ≥ this value")
    culture__lte: Optional[int] = Field(None, description="Culture score ≤ this value")

    adventure: Optional[int] = Field(None, description="Exact adventure score")
    adventure__gte: Optional[int] = Field(None, description="Adventure score ≥ this value")
    adventure__lte: Optional[int] = Field(None, description="Adventure score ≤ this value")

    nature: Optional[int] = Field(None, description="Exact nature score")
    nature__gte: Optional[int] = Field(None, description="Nature score ≥ this value")
    nature__lte: Optional[int] = Field(None, description="Nature score ≤ this value")

    beaches: Optional[int] = Field(None, description="Exact beaches score")
    beaches__gte: Optional[int] = Field(None, description="Beaches score ≥ this value")
    beaches__lte: Optional[int] = Field(None, description="Beaches score ≤ this value")

    nightlife: Optional[int] = Field(None, description="Exact nightlife score")
    nightlife__gte: Optional[int] = Field(None, description="Nightlife score ≥ this value")
    nightlife__lte: Optional[int] = Field(None, description="Nightlife score ≤ this value")

    cuisine: Optional[int] = Field(None, description="Exact cuisine score")
    cuisine__gte: Optional[int] = Field(None, description="Cuisine score ≥ this value")
    cuisine__lte: Optional[int] = Field(None, description="Cuisine score ≤ this value")

    wellness: Optional[int] = Field(None, description="Exact wellness score")
    wellness__gte: Optional[int] = Field(None, description="Wellness score ≥ this value")
    wellness__lte: Optional[int] = Field(None, description="Wellness score ≤ this value")

    urban: Optional[int] = Field(None, description="Exact urban score")
    urban__gte: Optional[int] = Field(None, description="Urban score ≥ this value")
    urban__lte: Optional[int] = Field(None, description="Urban score ≤ this value")

    seclusion: Optional[int] = Field(None, description="Exact seclusion score")
    seclusion__gte: Optional[int] = Field(None, description="Seclusion score ≥ this value")
    seclusion__lte: Optional[int] = Field(None, description="Seclusion score ≤ this value")

    # Trip‐duration booleans
    day_trip: Optional[bool] = Field(None, description="Filter for day trips")
    long_trip: Optional[bool] = Field(None, description="Filter for long trips")
    one_week: Optional[bool] = Field(None, description="Filter for one-week trips")
    short_trip: Optional[bool] = Field(None, description="Filter for short trips")
    weekend: Optional[bool] = Field(None, description="Filter for weekend trips")

    class Constants(Filter.Constants):
        model = Destination
        
@router.get('/{destination_id}', status_code=status.HTTP_200_OK, summary="Retrieve a single destination by its ID")
def get_destination(db: db_dependency, user: user_dependency, destination_id: str):
    return db.query(Destination).filter(Destination.id == destination_id).first()

@router.get('/', response_model=list[DestinationRetrieve], status_code=status.HTTP_200_OK, summary="List destinations with optional filters")
def get_destinations(db: db_dependency, user: user_dependency, filters: DestinationFilter = FilterDepends(DestinationFilter)):
    destinations = db.query(Destination)
    filtered_destinations = filters.filter(destinations)
    return filtered_destinations

@router.post('/', status_code=status.HTTP_201_CREATED, summary="Create a new destination")
def create_destination(db: db_dependency, user: user_dependency, destination: DestinationCreate):
    db_destination = Destination(**destination.model_dump(), id=str(uuid.uuid4()))
    db.add(db_destination)
    db.commit()
    db.refresh(db_destination)
    return db_destination

@router.delete('/{destination_id}', status_code=status.HTTP_204_NO_CONTENT, summary="Delete a destination by its ID")
def delete_destination(db: db_dependency, user: user_dependency, destination_id: str):
    db_destination = db.query(Destination).filter(Destination.id == destination_id).first()
    if db_destination:
        db.delete(db_destination)
        db.commit()
    return db_destination  
    