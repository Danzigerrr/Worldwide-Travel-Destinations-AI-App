from sqlalchemy import Column, Integer, String, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from .database import Base

class Destination(Base):
    __tablename__ = "destinations"

    id = Column(String, primary_key=True, index=True)  # UUID from CSV
    city = Column(String, nullable=False)
    country = Column(String, nullable=False)
    region = Column(String, nullable=False)
    short_description = Column(String, nullable=True)
    latitude = Column(String, nullable=True)
    longitude = Column(String, nullable=True)
    avg_temp_monthly = Column(String, nullable=True)  # Stored as JSON string
    budget_level = Column(String, nullable=True)
    
    # Scores from 1 to 5 for various themes
    culture = Column(Integer)
    adventure = Column(Integer)
    nature = Column(Integer)
    beaches = Column(Integer)
    nightlife = Column(Integer)
    cuisine = Column(Integer)
    wellness = Column(Integer)
    urban = Column(Integer)
    seclusion = Column(Integer)

    # Boolean flags (0/1) for trip durations
    day_trip = Column(Boolean)
    long_trip = Column(Boolean)
    one_week = Column(Boolean)
    short_trip = Column(Boolean)
    weekend = Column(Boolean)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True)
    hashed_password = Column(String, nullable=False)

    chats = relationship("Chat", back_populates="user")

class Chat(Base):
    __tablename__ = "chats"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    timestamp = Column(String)  # or DateTime
    message = Column(String)  # user input
    response = Column(String)  # bot response

    user = relationship("User", back_populates="chats")
