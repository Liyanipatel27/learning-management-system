import os
import google.generativeai as genai
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import logging

# Setup Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configure Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

def get_gemini_model():
    if not GEMINI_API_KEY:
        logger.warning("GEMINI_API_KEY not found in environment variables.")
        return None
    return genai.GenerativeModel('gemini-1.5-flash')

def calculate_similarity(target_text: str, corpus: list):
    """
    Calculates similarity between target_text and a list of corpus texts.
    Phase 1: TF-IDF & Cosine Similarity
    Phase 2: Gemini Semantic Check (if similarity > 20%)
    """
    if not corpus:
        return {
            "highest_similarity": 0,
            "risk_level": "Low",
            "matches": [],
            "is_ai_verified": False
        }

    # Extract texts from corpus dictionaries
    corpus_texts = [item['text'] for item in corpus]
    all_texts = [target_text] + corpus_texts

    # Phase 1: Statistical Check (TF-IDF)
    try:
        vectorizer = TfidfVectorizer().fit_transform(all_texts)
        vectors = vectorizer.toarray()
        
        # Calculate cosine similarity between target (index 0) and all others
        cosine_similarities = cosine_similarity(vectors[0:1], vectors[1:]).flatten()
        
        # Find matches
        matches = []
        highest_similarity = 0
        
        for i, score in enumerate(cosine_similarities):
            similarity_percent = round(score * 100, 2)
            if similarity_percent > highest_similarity:
                highest_similarity = similarity_percent
                
            if similarity_percent > 10: # Only track relevant matches
                matches.append({
                    "studentId": corpus[i]['id'],
                    "submissionId": corpus[i]['submissionId'],
                    "similarity": similarity_percent,
                    "text_snippet": corpus[i]['text'][:200] # For debug/context
                })
        
        # Sort matches by similarity descending
        matches.sort(key=lambda x: x['similarity'], reverse=True)
        top_matches = matches[:5]
        
        is_ai_verified = False
        
        # Phase 2: AI Semantic Check
        # Trigger if similarity is significant (>20%) and we have a match
        if highest_similarity > 20 and top_matches:
            matched_text = ""
            # Find the text of the top match
            for item in corpus:
                if item['submissionId'] == top_matches[0]['submissionId']:
                    matched_text = item['text']
                    break
            
            model = get_gemini_model()
            if model and matched_text:
                try:
                    prompt = f"""
                    Compare the following two texts for plagiarism.
                    
                    Text A (Suspected): "{target_text[:4000]}"
                    
                    Text B (Source): "{matched_text[:4000]}"

                    Are these texts semantically similar or copied? 
                    Analyze the meaning, structure, and phrasing.
                    
                    Return a JSON object with:
                    - "similarity_score": (number 0-100) estimated semantic similarity
                    - "verdict": ("Copied", "Paraphrased", "Different")
                    - "reason": (short explanation)
                    """
                    
                    response = model.generate_content(prompt)
                    # Clean response
                    response_text = response.text.replace('```json', '').replace('```', '').strip()
                    
                    import json
                    analysis = json.loads(response_text)
                    
                    ai_score = analysis.get("similarity_score", highest_similarity)
                    
                    # Update highest similarity with AI's more accurate judgment
                    # Logic: If AI says it's higher, trust AI. If AI says lower but TF-IDF was high, maybe keep average?
                    # Let's trust AI's score for the final verdict if available.
                    highest_similarity = ai_score
                    is_ai_verified = True
                    
                    logger.info(f"AI Verification Results: {analysis}")

                except Exception as e:
                    logger.error(f"Gemini AI Check Failed: {e}")
                    # Fallback to TF-IDF score

    except Exception as e:
        logger.error(f"Error in plagiarism calculation: {e}")
        return {
            "highest_similarity": 0,
            "risk_level": "Error",
            "matches": [],
            "is_ai_verified": False
        }

    # Determine Risk Level
    # Enum in Submission.js: ['No Risk', 'Safe', 'Low Risk', 'High Risk']
    if highest_similarity > 80:
        risk_level = "High Risk"
    elif highest_similarity > 40:
        risk_level = "Low Risk" # Mapping Medium (40-80) to Low Risk as per schema options, or maybe just Safe?
        # Actually, let's map: 
        # > 80 = High Risk
        # 20 - 80 = Low Risk
        # < 20 = No Risk
    elif highest_similarity > 1:
        risk_level = "No Risk"
    else:
        risk_level = "No Risk"

    return {
        "highest_similarity": round(highest_similarity, 2),
        "risk_level": risk_level,
        "matches": top_matches,
        "is_ai_verified": is_ai_verified
    }
