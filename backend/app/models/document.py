# backend/app/models/document.py
import uuid
import enum
from sqlalchemy import Column, String, Enum, DateTime, JSON, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.core.db import Base

# Define the processing states for the Celery workers
class DocStatus(str, enum.Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

class Document(Base):
    __tablename__ = "documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    filename = Column(String, index=True)
    s3_path = Column(String, nullable=True)  # File location reference
    status = Column(Enum(DocStatus), default=DocStatus.PENDING)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # --- NEW: AI Result Storage ---
    summary = Column(Text, nullable=True)
    extracted_clauses = Column(JSON, nullable=True)
    red_flags = Column(JSON, nullable=True)

    # --- Phase 2: User Isolation ---
    # nullable=True keeps existing documents intact after the schema change.
    # Index speeds up the per-user filter query in list_all_documents().
    user_email = Column(String, index=True, nullable=True)
