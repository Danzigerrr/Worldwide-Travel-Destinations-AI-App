from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import uuid
from fastapi import APIRouter, status
from fastapi_filter import FilterDepends
from fastapi_filter.contrib.sqlalchemy import Filter
from ..models import Destination
from ..deps import db_dependency, user_dependency

router = APIRouter(
    prefix='/destinations',
    tags=['destinations']
)


class DestinationBase(BaseModel):
    city: str
    country: str
    region: str
    longitude: str
    latitude: str


class DestinationCreate(DestinationBase):
    pass


class DestinationRetrieve(DestinationBase):
    id: str
    budget_level: str = None
    culture: int = None
    adventure: int = None
    nature: int = None
    beaches: int = None
    nightlife: int = None

    class Config:
        from_attributes = True # <-- ENSURE THIS IS CORRECT FOR YOUR PYDANTIC VERSION


# --- MODIFIED: Define the response model to include possible_values as a dictionary ---
class DestinationsPresentFormat(BaseModel):
    destinations: List[DestinationRetrieve]
    possible_values: Dict[str, List[Any]]


class DestinationFilter(Filter):
    # Basic strings
    city: Optional[str] = Field(None, description="Filter by exact city name")
    city__in: Optional[list[str]] = Field(None, description="Filter by multiple cities (OR‑logic)")

    country: Optional[str] = Field(None, description="Filter by exact country name")
    country__in: Optional[list[str]] = Field(None, description="Filter by multiple countries (OR‑logic)")

    region: Optional[str] = Field(None, description="Filter by exact region")
    region__in: Optional[list[str]] = Field(None, description="Filter by multiple regions (OR‑logic)")

    budget_level: Optional[str] = Field(None, description="Filter by budget level")
    budget_level__in: Optional[list[str]] = Field(None, description="Filter by multiple budget levels (OR‑logic)")

    # Geographic coordinates (range filters)
    latitude__gte: Optional[float] = Field(None, description="Latitude ≥ this value")
    latitude__lte: Optional[float] = Field(None, description="Latitude ≤ this value")

    longitude__gte: Optional[float] = Field(None, description="Longitude ≥ this value")
    longitude__lte: Optional[float] = Field(None, description="Longitude ≤ this value")

    # Thematic scores: exact match or range
    culture: Optional[int] = Field(None, description="Exact culture score")
    culture__gte: Optional[int] = Field(None, description="Culture score ≥ this value")
    culture__lte: Optional[int] = Field(None, description="Culture score ≤ this value")
    culture__in: Optional[list[int]] = Field(None, description="Filter by multiple culture scores (OR‑logic)")

    adventure: Optional[int] = Field(None, description="Exact adventure score")
    adventure__gte: Optional[int] = Field(None, description="Adventure score ≥ this value")
    adventure__lte: Optional[int] = Field(None, description="Adventure score ≤ this value")
    adventure__in: Optional[list[int]] = Field(None, description="Filter by multiple adventure scores (OR‑logic)")

    nature: Optional[int] = Field(None, description="Exact nature score")
    nature__gte: Optional[int] = Field(None, description="Nature score ≥ this value")
    nature__lte: Optional[int] = Field(None, description="Nature score ≤ this value")
    nature__in: Optional[list[int]] = Field(None, description="Filter by multiple nature scores (OR‑logic)")

    beaches: Optional[int] = Field(None, description="Exact beaches score")
    beaches__gte: Optional[int] = Field(None, description="Beaches score ≥ this value")
    beaches__lte: Optional[int] = Field(None, description="Beaches score ≤ this value")
    beaches__in: Optional[list[int]] = Field(None, description="Filter by multiple beaches scores (OR‑logic)")

    nightlife: Optional[int] = Field(None, description="Exact nightlife score")
    nightlife__gte: Optional[int] = Field(None, description="Nightlife score ≥ this value")
    nightlife__lte: Optional[int] = Field(None, description="Nightlife score ≤ this value")
    nightlife__in: Optional[list[int]] = Field(None, description="Filter by multiple nightlife scores (OR‑logic)")

    cuisine: Optional[int] = Field(None, description="Exact cuisine score")
    cuisine__gte: Optional[int] = Field(None, description="Cuisine score ≥ this value")
    cuisine__lte: Optional[int] = Field(None, description="Cuisine score ≤ this value")
    cuisine__in: Optional[list[int]] = Field(None, description="Filter by multiple cuisine scores (OR‑logic)")

    wellness: Optional[int] = Field(None, description="Exact wellness score")
    wellness__gte: Optional[int] = Field(None, description="Wellness score ≥ this value")
    wellness__lte: Optional[int] = Field(None, description="Wellness score ≤ this value")
    wellness__in: Optional[list[int]] = Field(None, description="Filter by multiple wellness scores (OR‑logic)")

    urban: Optional[int] = Field(None, description="Exact urban score")
    urban__gte: Optional[int] = Field(None, description="Urban score ≥ this value")
    urban__lte: Optional[int] = Field(None, description="Urban score ≤ this value")
    urban__in: Optional[list[int]] = Field(None, description="Filter by multiple urban scores (OR‑logic)")

    seclusion: Optional[int] = Field(None, description="Exact seclusion score")
    seclusion__gte: Optional[int] = Field(None, description="Seclusion score ≥ this value")
    seclusion__lte: Optional[int] = Field(None, description="Seclusion score ≤ this value")
    seclusion__in: Optional[list[int]] = Field(None, description="Filter by multiple seclusion scores (OR‑logic)")

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


@router.get('/', response_model=DestinationsPresentFormat, status_code=status.HTTP_200_OK,
            summary="List destinations with optional filters and dynamic filter options")
def get_destinations(db: db_dependency, user: user_dependency,
                     filters: DestinationFilter = FilterDepends(DestinationFilter)):
    # 1. Get ALL destinations first to extract unique values for filters
    all_destinations_query = db.query(Destination)
    all_destinations = all_destinations_query.all()

    # 2. Extract unique values for each feature and store in a dictionary
    possible_values_dict: Dict[str, List[Any]] = {}

    def collect_unique(attribute_name):
        values = set()
        for d in all_destinations:
            attr_value = getattr(d, attribute_name, None)
            if attr_value is not None:
                values.add(attr_value)
        return sorted(list(values))

    possible_values_dict["region"] = collect_unique("region")
    possible_values_dict["country"] = collect_unique("country")
    possible_values_dict["budget_level"] = collect_unique("budget_level")
    possible_values_dict["culture"] = collect_unique("culture")
    possible_values_dict["nature"] = collect_unique("nature")
    possible_values_dict["beaches"] = collect_unique("beaches")
    possible_values_dict["adventure"] = collect_unique("adventure")
    possible_values_dict["nightlife"] = collect_unique("nightlife")
    possible_values_dict["cuisine"] = collect_unique("cuisine")
    possible_values_dict["wellness"] = collect_unique("wellness")
    possible_values_dict["urban"] = collect_unique("urban")
    possible_values_dict["seclusion"] = collect_unique("seclusion")

    unique_trip_types = set()
    for d in all_destinations:
        if d.day_trip: unique_trip_types.add("day_trip")
        if d.short_trip: unique_trip_types.add("short_trip")
        if d.one_week: unique_trip_types.add("one_week")
        if d.long_trip: unique_trip_types.add("long_trip")
        if d.weekend: unique_trip_types.add("weekend")
    possible_values_dict["trip_type"] = sorted(list(unique_trip_types))

    # 3. Apply filters to the destinations AND EXECUTE THE QUERY
    destinations_query = db.query(Destination)
    filtered_destinations = filters.filter(destinations_query).all() # <--- ADD .all() HERE

    # 4. Return the filtered destinations and the possible filter values dictionary
    return DestinationsPresentFormat(
        destinations=filtered_destinations,
        possible_values=possible_values_dict
    )


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
