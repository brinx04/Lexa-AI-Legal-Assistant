# backend/app/core/db.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

# Initialize the database engine using the URL from our settings
engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)

# Create a session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for our database models
Base = declarative_base()

# Dependency injection function to provide database sessions to our API routes
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()