import os
import urllib.parse
import urllib.request
import json
import logging

logger = logging.getLogger(__name__)

# Note: For the hackathon demo, you will need to register at api.indiankanoon.org for a free test token
from app.core.config import settings
KANOON_API_TOKEN = settings.KANOON_API_TOKEN
KANOON_BASE_URL = "https://api.indiankanoon.org"

def search_indian_case_law(query: str, max_results: int = 1) -> list:
    """
    Searches the Indian Kanoon database for relevant case law based on a legal issue.
    Returns a list of dictionaries containing the title and link to the judgment.
    """
    if KANOON_API_TOKEN == "your_test_token_here":
        # Fallback for local testing if no token is set
        logger.warning("No Kanoon API token found. Skipping real API call.")
        return []

    try:
        # We url-encode the query (e.g. "excessive lock in period penalty rent")
        encoded_query = urllib.parse.quote(query)
        url = f"{KANOON_BASE_URL}/search/?formInput={encoded_query}&pagenum=0"
        
        # Indian Kanoon requires the Token in the Authorization header and Accept set to JSON
        req = urllib.request.Request(url, headers={
            'Authorization': f'Token {KANOON_API_TOKEN}',
            'Accept': 'application/json'
        })
        
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode())
            
            results = []
            # Kanoon returns the results in a 'docs' array
            if 'docs' in data:
                for doc in data['docs'][:max_results]:
                    results.append({
                        "title": doc.get("title", "Unknown Case"),
                        "snippet": doc.get("headline", ""),
                        "url": f"https://indiankanoon.org/doc/{doc.get('tid')}/"
                    })
            return results
            
    except Exception as e:
        logger.error(f"Indian Kanoon API search failed: {str(e)}")
        return []