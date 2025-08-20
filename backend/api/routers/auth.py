from datetime import timedelta, datetime, timezone
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from fastapi.security import OAuth2PasswordRequestFormStrict
from jose import jwt
from dotenv import load_dotenv
import os
from ..models import User
from ..deps import db_dependency, bcrypt_context
from supabase import create_client, Client


load_dotenv()

supabase_url: str = os.environ.get("SUPABASE_URL")
supabase_key: str = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(supabase_url, supabase_key)

router = APIRouter(
    prefix='/auth',
    tags=['auth']
)

# Retrieve JWT configuration from environment variables (.env)
SECRET_KEY = os.getenv("AUTH_SECRET_KEY")
ALGORITHM = os.getenv("AUTH_ALGORITHM")


class UserCreateRequest(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str


# New code with Supabase:
def authenticate_user(username: str, password: str):
    # Retrieve the user by username
    response = supabase.table("users").select("*").eq("username", username).limit(1).execute()
    
    # Supabase returns the data in a `response.data` list
    user_data = response.data
    if not user_data:
        return False
    
    # Get the single user dictionary from the list
    user = user_data[0]
    
    # Verify the password
    if not bcrypt_context.verify(password, user['hashed_password']):
        return False
    
    # Return the user dictionary
    return user

def create_access_token(username: str, user_id: int, expires_delta: timedelta):
    encode = {'sub': username, 'id': user_id}
    expires = datetime.now(timezone.utc) + expires_delta
    encode.update({'exp': expires})
    return jwt.encode(encode, SECRET_KEY, algorithm=ALGORITHM)


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_user(create_user_request: UserCreateRequest):
    new_user = {
        "username": create_user_request.username,
        "hashed_password": bcrypt_context.hash(create_user_request.password)
    }
    
    try:
        response = supabase.table("users").insert(new_user).execute()
        if not response.data:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to create user.")
    except Exception as e:
        # Check if the error is a duplicate key violation (e.g., username already exists)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.post("/token", response_model=Token)
async def login_for_access_token(form_data: Annotated[OAuth2PasswordRequestFormStrict, Depends()]):
    user = authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate user")

    # The `user` object is now a dictionary, so access its values with dict notation.
    token = create_access_token(user['username'], user['id'], timedelta(minutes=60))
    return {
        'access_token': token,
        'token_type': 'bearer'
    }