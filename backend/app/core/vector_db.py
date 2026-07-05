# backend/app/core/vector_db.py
from qdrant_client import QdrantClient
from qdrant_client.http.models import Distance, VectorParams
from app.core.config import settings

# 1. Connect to the Qdrant instance running in your Docker container
qdrant_client = QdrantClient(url=settings.QDRANT_URL, check_compatibility=False)

COLLECTION_NAME = "legal_documents"

def init_vector_db():
    """
    Checks if the vector collection exists. If not, it creates it.
    This should be called when the server starts.
    """
    try:
        collections = qdrant_client.get_collections().collections
        collection_names = [col.name for col in collections]

        if COLLECTION_NAME not in collection_names:
            print(f"[Vector DB] Creating new collection: {COLLECTION_NAME}")
            qdrant_client.create_collection(
                collection_name=COLLECTION_NAME,
                vectors_config=VectorParams(
                    size=768, # The exact dimension size for Gemini's text-embedding-004 model
                    distance=Distance.COSINE # Cosine distance is best for text similarity
                ),
            )
            print("[Vector DB] Collection created successfully.")
        else:
            print(f"[Vector DB] Collection '{COLLECTION_NAME}' already exists.")
            
    except Exception as e:
        print(f"[Vector DB Error] Failed to initialize Qdrant: {str(e)}")

# Run initialization when this module is imported
init_vector_db()