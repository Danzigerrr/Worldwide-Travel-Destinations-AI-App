from pydantic import BaseModel
from typing import List, Literal, Optional
from fastapi import APIRouter, status
from fastapi_filter import FilterDepends
from .destinations import DestinationFilter
from ..models import Destination
from ..deps import db_dependency, user_dependency
from ..filters.dynamic_filter_generator import DynamicFilterGenerator

router = APIRouter(
    prefix='/dynamic_filters',
    tags=['dynamic_filters']
)


class DynamicFilterRetrieve(BaseModel):
    question: str
    feature: str
    type: Literal["binary", "categorical"]
    value_meanings: Optional[dict[str, str]]


@router.get('/', response_model=list[DynamicFilterRetrieve], status_code=status.HTTP_200_OK,
            summary="List of dynamically generated filters")
def get_dynamic_filters_for_destinations(db: db_dependency, user: user_dependency,
                                         filters: DestinationFilter = FilterDepends(DestinationFilter)):
    all_destinations = db.query(Destination)
    selected_destinations = filters.filter(all_destinations)
    dynamic_filter_generator = DynamicFilterGenerator()
    dynamic_filters = dynamic_filter_generator.generate_dynamic_filters(selected_destinations)

    return dynamic_filters
