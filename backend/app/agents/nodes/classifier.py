import json
from google import genai
from google.genai import types
from app.core.config import settings
from app.agents.state import AgentState

def classify_document_node(state: AgentState) -> dict:
    """
    Analyzes the initial text chunks to classify the type of legal document
    so the system can route it to specialized statutory compliance checks.
    """
    print("[Agent] Classifier Node: Identifying document type...")
    extracted_text = state.get("raw_text", "")[:4000] # Look at the first ~page
    
    prompt = f"""
    You are an automated legal intake system. Analyze the following document text and classify it into exactly ONE of these categories:
    - RENTAL_AGREEMENT
    - NDA
    - EMPLOYMENT_CONTRACT
    - GENERIC_LEGAL

    Respond ONLY with a valid JSON object containing a single key "doc_type".
    
    Document text snippet:
    \"\"\"{extracted_text}\"\"\"
    """
    
    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(response_mime_type="application/json")
        )
        
        result = json.loads(response.text or "{}")
        doc_type = result.get("doc_type", "GENERIC_LEGAL")
    except Exception as e:
        print(f"[Agent Warning] Classifier failed: {e}")
        doc_type = "GENERIC_LEGAL"
        
    return {"doc_type": doc_type}
