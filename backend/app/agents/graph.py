# backend/app/agents/graph.py
from langgraph.graph import StateGraph, END
from app.agents.state import AgentState
from app.agents.nodes.classifier import classify_document_node
from app.agents.nodes.analyzer import analyze_document_node
from app.agents.nodes.risk_finder import identify_risks_node

def compile_workflow():
    """
    Constructs and compiles Lexa's LangGraph linear cognitive execution map.
    """
    # 1. Initialize Graph with state signature
    workflow = StateGraph(AgentState)

    # 2. Mount functional nodes
    workflow.add_node("classifier", classify_document_node)
    workflow.add_node("analyzer", analyze_document_node)
    workflow.add_node("risk_finder", identify_risks_node)

    # 3. Establish processing flow path rules
    workflow.set_entry_point("classifier")
    workflow.add_edge("classifier", "analyzer")
    workflow.add_edge("analyzer", "risk_finder")
    workflow.add_edge("risk_finder", END)

    # 4. Compile execution blueprint
    return workflow.compile()

# Singleton execution graph model
lexa_brain = compile_workflow()