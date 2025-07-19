from fastapi import FastAPI
from chat_utils import ChatHandler, UserMessage


app = FastAPI()

chat_handler = ChatHandler()

@app.post("/chat/")
async def chat(new_message: UserMessage):
    response_text, response_sources = chat_handler.generate_chat_response(new_message.prompt)
    return  {
            "message": response_text,
            "sources": response_sources
            }

@app.get("/locations/{location_id}")
async def get_locations_details(location_id):
    location_details = locations_handler.get_location_by_id(location_id)
    return  {
            "details": location_details
            }
   
@app.get("/locations/update_selected_locations")
async def update_locations_based_on_selected_filter(selected_filters: SelectedFilters):
    updated_locations = locations_handler.get_locations_based_on_filters(selected_filters)
    return  {
            "locations": updated_locations
            }
    
        
@app.get("/filters/generate_new")
async def generate_new_filters(selected_locations: SelectedLocations):
    new_filters = filter_handler.generate_new_filters_based_on_selected_locations(selected_locations)
    return  {
            "filters": new_filters
            }
    
        
