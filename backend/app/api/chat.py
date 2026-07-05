# backend/app/api/chat.py
import json
from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from google import genai
from google.genai import types

from app.core.config import settings
from app.core.vector_db import qdrant_client, COLLECTION_NAME
from app.core.db import get_db
from app.models.chat import ChatMessage
from app.core.security import verify_api_key
from app.core.limiter import limiter  # SlowAPI rate limiter singleton

# Protect the entire router with the API Key
router = APIRouter(
    prefix="/api/v1/chat", 
    tags=["Document Chat"],
    dependencies=[Depends(verify_api_key)]
)

class ChatRequest(BaseModel):
    document_id: str
    question: str

@router.post("")
@limiter.limit("20/minute")  # ⚡ 20 AI queries per IP per minute — prevents Gemini bill abuse
async def chat_with_document(request: Request, payload: ChatRequest, db: Session = Depends(get_db)):
    client = genai.Client(api_key=settings.GEMINI_API_KEY)

    # 1. Fetch previous conversation history from PostgreSQL (last 4 messages)
    past_messages = db.query(ChatMessage)\
        .filter(ChatMessage.document_id == payload.document_id)\
        .order_by(ChatMessage.created_at.desc())\
        .limit(4).all()
    
    past_messages.reverse() # Put them in chronological order
    
    history_context = ""
    for msg in past_messages:
        role_name = "User" if msg.role == "user" else "AI"
        history_context += f"{role_name}: {msg.content}\n"

    # 2. Vectorize the User Question
    try:
        query_vector_resp = client.models.embed_content(
            model='gemini-embedding-001',
            contents=payload.question,
            config=types.EmbedContentConfig(output_dimensionality=768)
        )
        if not query_vector_resp.embeddings:
            raise Exception("No embeddings returned from Gemini API")
        query_vector = query_vector_resp.embeddings[0].values
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to embed question.")

    # 3. Query Qdrant for document context
    try:
        from qdrant_client.http.models import Filter, FieldCondition, MatchValue
        search_response = qdrant_client.query_points(
            collection_name=COLLECTION_NAME,
            query=query_vector,
            query_filter=Filter(
                must=[FieldCondition(key="document_id", match=MatchValue(value=payload.document_id))]
            ),
            limit=3
        )
        search_results = search_response.points
    except Exception as e:
        raise HTTPException(status_code=500, detail="Vector database search failed.")

    context_blocks = [hit.payload["text"] for hit in search_results if hit.payload and "text" in hit.payload] if search_results else []
    context_str = "\n---\n".join(context_blocks)

    # 4. Generate the final answer with strict citation rules
    prompt = f"""
    You are an elite legal AI assistant analyzing a specific contract. 
    
    Previous Conversation Context:
    {history_context if history_context else "No previous conversation."}
    
    Document Context to use for this specific question:
    \"\"\"{context_str}\"\"\"

    User Question: {payload.question}

    CRITICAL INSTRUCTIONS:
    1. Answer the user's question clearly and definitively based ONLY on the Document Context.
    2. You MUST include a direct quote from the Document Context to prove your answer. Format your citation clearly using quotation marks (e.g., "As stated in the document: '...'").
    3. If the answer cannot be found in the exact context provided, you must reply: "The uploaded document does not contain information regarding this specific question." Do not guess.
    """

    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt
        )
        final_answer = response.text
        
        # 5. Save the new User Query and AI Response to the Database
        user_msg = ChatMessage(document_id=payload.document_id, role="user", content=payload.question)
        ai_msg = ChatMessage(document_id=payload.document_id, role="ai", content=final_answer)
        db.add(user_msg)
        db.add(ai_msg)
        db.commit()

        return {"answer": final_answer}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail="AI generation failed.")