# backend/app/agents/state.py
from typing import List, Dict, Any, TypedDict

class AgentState(TypedDict):
    """
    The central state object tracked across the LangGraph workflow.
    Allows upstream nodes to pass extracted knowledge down to subsequent nodes.
    """
    document_id: str
    raw_text: str
    doc_type: str
    summary: str
    extracted_clauses: List[Dict[str, Any]]
    red_flags: List[Dict[str, Any]]
    error: str