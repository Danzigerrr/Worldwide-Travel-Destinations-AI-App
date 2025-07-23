from fastapi import FastAPI
from backend.api.chat.chat_utils import ChatHandler, UserMessage
from fastapi.middleware.cors import CORSMiddleware
from .database import Base, engine
from .routers import auth, destinations
from ..data_loader import populate_the_database

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


Base.metadata.create_all(bind=engine)


@app.get("/health_check/")
def health_check():
    return "Health check complete - the app is working!"

app.include_router(auth.router)
app.include_router(destinations.router)

# @app.post("/chat/")
# async def chat(new_message: UserMessage):
#     response_text, response_sources = chat_handler.generate_chat_response(new_message.prompt)
#     return  {
#             "message": response_text,
#             "sources": response_sources
#             }

# @app.get("/locations/{location_id}")
# async def get_locations_details(location_id):
#     location_details = locations_handler.get_location_by_id(location_id)
#     return  {
#             "details": location_details
#             }
   
# @app.get("/locations/update_selected_locations")
# async def update_locations_based_on_selected_filter(selected_filters: SelectedFilters):
#     updated_locations = locations_handler.get_locations_based_on_filters(selected_filters)
#     return  {
#             "locations": updated_locations
#             }
    
        
# @app.get("/filters/generate_new")
# async def generate_new_filters(selected_locations: SelectedLocations):
#     new_filters = filter_handler.generate_new_filters_based_on_selected_locations(selected_locations)
#     return  {
#             "filters": new_filters
#             }
    
        
