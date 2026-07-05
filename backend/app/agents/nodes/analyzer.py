# backend/app/agents/nodes/analyzer.py
import json
from google import genai
from google.genai import types
from app.core.config import settings
from app.agents.state import AgentState

def analyze_document_node(state: AgentState) -> dict:
    """
    Reads raw legal text, isolates critical clauses, and compiles a clear summary.
    Attempts gemini-2.5-flash first, falls back to gemini-1.5-flash if overloaded.
    """
    print("[Agent] Analyzer Node: Extracting clauses and summarizing...")
    client = genai.Client(api_key=settings.GEMINI_API_KEY)

    prompt = f"""
    You are a Senior Legal Counsel reviewing this document for a high-net-worth client who needs to understand EVERY material commitment before signing. Your summary will be the ONLY thing they read before making their decision.

    Analyze the following Indian legal document and produce:

    1. **SUMMARY**: A comprehensive executive briefing (NOT a vague overview). It MUST cover:
       - WHO are the parties and their roles (landlord/tenant, buyer/seller, employer/employee)
       - WHAT is the core transaction or arrangement
       - HOW MUCH money is involved (rent, deposit, fees, penalties — all specific numbers)
       - WHEN does it start, end, and what are the critical deadlines
       - EXIT CONDITIONS: How can each party walk away, and at what cost
       - OBLIGATIONS: What is each party required to do (maintenance, insurance, repairs, etc.)
       - GOVERNING LAW and dispute resolution mechanism
       Write this in clear, direct language. A 10th-grade student should understand every sentence.

    2. **EXTRACTED CLAUSES**: Pull out EVERY material clause, not just the obvious ones. Include:
       - Financial terms (rent, deposit, escalation, penalties, late fees)
       - Duration and renewal terms
       - Termination and exit conditions
       - Maintenance and repair responsibilities
       - Usage restrictions and permissions
       - Insurance and liability allocation
       - Dispute resolution and jurisdiction
       - Force majeure or special conditions
       - Any clause that imposes an obligation, restriction, or penalty on either party

    Document Text:
    \"\"\"{state["raw_text"]}\"\"\"

    You must respond ONLY with a valid JSON object matching this exact structure:
    {{
        "summary": "Comprehensive executive summary as described above — at least 150 words, covering all key aspects",
        "extracted_clauses": [
            {{"clause_name": "Term/Duration", "content": "Exact or close summary of the clause"}},
            {{"clause_name": "Monthly Rent", "content": "Exact commercial terms with numbers"}},
            {{"clause_name": "Security Deposit", "content": "Amount, return conditions, deductions allowed"}},
            {{"clause_name": "Termination", "content": "How and when each party can exit"}}
        ]
    }}
    Extract ALL material clauses, not just the examples above. Be thorough.
    """

    # Try Primary Model (Gemini 2.5)
    try:
        print("[Agent] Trying primary model: gemini-2.5-flash...")
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(response_mime_type="application/json")
        )
        parsed_json = json.loads(response.text or "{}")
        return {
            "summary": parsed_json.get("summary", "No summary generated."),
            "extracted_clauses": parsed_json.get("extracted_clauses", [])
        }
    # Inside backend/app/agents/nodes/analyzer.py
    except Exception as primary_error:
        if "503" in str(primary_error) or "UNAVAILABLE" in str(primary_error).upper():
            print("[Agent Warning] Gemini 2.5 busy. Deploying fallback model: gemini-2.0-flash...")
            try:
                # FIXED: Upgraded backup model to gemini-2.0-flash
                response = client.models.generate_content(
                    model='gemini-2.0-flash', 
                    contents=prompt,
                    config=types.GenerateContentConfig(response_mime_type="application/json")
                )
                parsed_json = json.loads(response.text or "{}")
                return {
                    "summary": parsed_json.get("summary", "No summary generated."),
                    "extracted_clauses": parsed_json.get("extracted_clauses", [])
                }
            except Exception as fallback_error:
                return {"error": f"Both primary and backup models failed: {str(fallback_error)}"}
        else:
            return {"error": f"Analyzer node failure: {str(primary_error)}"}