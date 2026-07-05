# backend/app/services/embeddings.py
import uuid
from google import genai
from google.genai import types # NEW: We need this to configure the dimension size
from langchain_text_splitters import RecursiveCharacterTextSplitter
from qdrant_client.http.models import PointStruct

from app.core.config import settings
from app.core.vector_db import qdrant_client, COLLECTION_NAME

def process_and_store_embeddings(document_id: str, raw_text: str):
    """
    Chunks the raw document text, generates vector embeddings using Gemini,
    and stores them in the Qdrant vector database.
    """
    print(f"[Embeddings] Starting vectorization for document: {document_id}")
    client = genai.Client(api_key=settings.GEMINI_API_KEY)

    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        length_function=len,
    )
    chunks = text_splitter.split_text(raw_text)
    print(f"[Embeddings] Split document into {len(chunks)} searchable chunks.")

    points = []
    
    for i, chunk_text in enumerate(chunks):
        try:
            # FIXED: Upgraded to gemini-embedding-001 and locked dimensions to 768
            response = client.models.embed_content(
                model='gemini-embedding-001',
                contents=chunk_text,
                config=types.EmbedContentConfig(output_dimensionality=768)
            )
            
            vector_data = response.embeddings[0].values
            
            point = PointStruct(
                id=str(uuid.uuid4()),
                vector=vector_data,
                payload={
                    "document_id": document_id,
                    "chunk_index": i,
                    "text": chunk_text
                }
            )
            points.append(point)
            
        except Exception as e:
            print(f"[Embeddings Error] Failed to embed chunk {i}: {str(e)}")

    if points:
        qdrant_client.upsert(
            collection_name=COLLECTION_NAME,
            points=points
        )
        print(f"[Embeddings] Successfully stored {len(points)} vectors in Qdrant.")
    else:
        print("[Embeddings] No vectors were generated to store.")