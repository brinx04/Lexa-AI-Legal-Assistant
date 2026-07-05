# backend/app/agents/nodes/risk_finder.py
import json
from google import genai
from google.genai import types
from app.core.config import settings
from app.agents.state import AgentState
from app.services.kanoon_api import search_indian_case_law

def identify_risks_node(state: AgentState) -> dict:
    """
    Reviews extracted clauses against Indian legal compliance standards to flag loops or traps.
    Attempts gemini-2.5-flash first, falls back to gemini-1.5-flash if overloaded.
    """
    print("[Agent] Risk Finder Node: Auditing clauses for traps and liabilities...")
    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    clauses_context = json.dumps(state.get("extracted_clauses", []))

    # Fetch the document type determined by the classifier node
    doc_type = state.get("doc_type", "GENERIC_LEGAL")

    # Define specialized legal frameworks
    prompts = {
        "RENTAL_AGREEMENT": """
            You are an expert Indian real estate lawyer auditing a Lease or Leave & License Agreement.
            Check specifically for violations of the Model Tenancy Act and state Rent Control frameworks:
            - Unreasonable security deposit demands (exceeding 2 months' rent for residential or 6 months for commercial).
            - Landlord entry rights without a 24-hour prior notice.
            - Overly harsh structural maintenance liabilities shifted entirely onto the tenant.
        """,
        "NDA": """
            You are an expert corporate lawyer auditing a Non-Disclosure Agreement (NDA).
            Check specifically for dangerous transactional anomalies and Indian Contract Act boundaries:
            - Perpetual survival clauses of confidentiality obligations (should ideally be limited to 2-5 years).
            - Broad non-compete restrictions that violate Section 27 of the Indian Contract Act, 1872 (restraint of trade).
            - Missing exclusions for information that enters the public domain independently.
        """,
        "EMPLOYMENT_CONTRACT": """
            You are an expert labor lawyer auditing an Employment Offer Letter or Agreement.
            Check for severe imbalances under Indian labor frameworks:
            - Long notice periods (e.g., 6 months) combined with immediate termination rights for the employer.
            - IP assignment clauses that grab ownership of personal projects created entirely outside of working hours.
            - Hidden penalty training bonds or severe financial exit penalties.
        """,
        "GENERIC_LEGAL": """
            You are an expert corporate lawyer auditing this legal text for general structural liabilities, 
            punitive indemnities, asymmetric termination options, and unfavorable jurisdictional or arbitration venues.
        """
    }

    selected_framework = prompts.get(doc_type, prompts["GENERIC_LEGAL"])

    # Build the strict structural prompt payload
    prompt = f"""
    {selected_framework}
    
    CRITICAL INSTRUCTION - OUTPUT FORMAT:
    You must respond ONLY with a valid JSON object containing a "red_flags" array.
    Each object inside the "red_flags" array MUST contain exactly these three keys:
    1. "issue": A short, punchy title of the risk.
    2. "reasoning": A detailed explanation of why this is dangerous for the user under Indian law context.
    3. "clause_reference": The exact quote or section number from the text.

    Clauses to analyze:
    {clauses_context}
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
        flags = parsed_json.get("red_flags", [])
        
        # === NEW: DETERMINISTIC SEVERITY SCORING ===
        def assign_severity(issue: str, reasoning: str) -> str:
            combined_text = (issue + " " + reasoning).lower()
            
            # Tier 1: Dealbreakers
            if any(word in combined_text for word in ["forfeit", "punitive", "unilateral termination", "without notice", "illegal"]):
                return "CRITICAL"
            # Tier 2: Heavy Liabilities
            elif any(word in combined_text for word in ["indemnity", "lock-in", "escalation", "arbitrary", "jurisdiction"]):
                return "HIGH"
            # Tier 3: Standard friction
            else:
                return "MODERATE"
        # ============================================

        # === NEW: INDIAN KANOON GROUNDING ===
        for flag in flags:
            issue_title = flag.get("issue", "")
            reasoning = flag.get("reasoning", "")
            flag["severity"] = assign_severity(issue_title, reasoning)
            
            kanoon_results = search_indian_case_law(f"{issue_title} contract law india")
            if kanoon_results:
                flag["kanoon_citation"] = kanoon_results[0]["title"]
                flag["kanoon_url"] = kanoon_results[0]["url"]
        # ====================================

        return {"red_flags": flags}
    # Inside backend/app/agents/nodes/risk_finder.py
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
                flags = parsed_json.get("red_flags", [])
                
                # === NEW: DETERMINISTIC SEVERITY SCORING ===
                def assign_severity(issue: str, reasoning: str) -> str:
                    combined_text = (issue + " " + reasoning).lower()
                    
                    # Tier 1: Dealbreakers
                    if any(word in combined_text for word in ["forfeit", "punitive", "unilateral termination", "without notice", "illegal"]):
                        return "CRITICAL"
                    # Tier 2: Heavy Liabilities
                    elif any(word in combined_text for word in ["indemnity", "lock-in", "escalation", "arbitrary", "jurisdiction"]):
                        return "HIGH"
                    # Tier 3: Standard friction
                    else:
                        return "MODERATE"
                # ============================================

                # === NEW: INDIAN KANOON GROUNDING ===
                for flag in flags:
                    issue_title = flag.get("issue", "")
                    reasoning = flag.get("reasoning", "")
                    flag["severity"] = assign_severity(issue_title, reasoning)
                    
                    kanoon_results = search_indian_case_law(f"{issue_title} contract law india")
                    if kanoon_results:
                        flag["kanoon_citation"] = kanoon_results[0]["title"]
                        flag["kanoon_url"] = kanoon_results[0]["url"]
                # ====================================

                return {"red_flags": flags}
            except Exception as fallback_error:
                return {"error": f"Both risk-finder models failed: {str(fallback_error)}"}
        else:
            return {"error": f"Risk Finder node failure: {str(primary_error)}"}