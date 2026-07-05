# backend/app/core/security.py
from fastapi import Security, HTTPException, status
from fastapi.security.api_key import APIKeyHeader
from app.core.config import settings

# Define the header name we expect the frontend to send
API_KEY_NAME = "X-API-Key"
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=False)

async def verify_api_key(api_key: str = Security(api_key_header)):
    """
    Middleware function that checks if the incoming request has the correct secret key.
    """
    if api_key != settings.LEXA_SECRET_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate API key. Unauthorized access.",
        )
    return api_key