from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import Base, engine
from .routers import auth, destinations, dynamic_filters

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
app.include_router(dynamic_filters.router)
