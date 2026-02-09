import os
import google.generativeai as genai
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from dotenv import load_dotenv
import random

load_dotenv()

# Configure Gemini
api_keys = os.getenv("TEACHER_ASSIGNMENT_GEMINI_KEYS", "").split(",")
current_key_index = 0

def get_gemini_model():
    global current_key_index
    if not api_keys or api_keys[0] == "":
        print("Warning: No Gemini API keys found.")
        return None
    
    # Simple rotation
    key = api_keys[current_key_index]
    current_key_index = (current_key_index + 1) % len(api_keys)
    
    genai.configure(api_key=key)
    return genai.GenerativeModel('gemini-1.5-flash')

def calculate_similarity(target_text: str, corpus: list):
    """
    Calculates similarity between target_text and a corpus of texts.
    Phase 1: TF-IDF + Cosine Similarity
    Phase 2: Semantic Check with Gemini (if applicable)
    
    corpus: list of dicts { 'id': str, 'submissionId': str, 'text': str }
    """
    if not corpus:
        return {
            "highest_similarity": 0,
            "risk_level": "No Risk",
            "matches": [],
            "is_ai_verified": False
        }

    # Prepare data for TF-IDF
    ids = [item['id'] for item in corpus]
    submission_ids = [item['submissionId'] for item in corpus]
    texts = [item['text'] for item in corpus]
    
    # Add target text to the end of the list for vectorization
    all_texts = texts + [target_text]
    
    # TF-IDF Vectorization
    try:
        vectorizer = TfidfVectorizer().fit_transform(all_texts)
        vectors = vectorizer.toarray()
        
        # Calculate cosine similarity between target (last item) and all others
        target_vector = vectors[-1]
        corpus_vectors = vectors[:-1]
        
        # Reshape target_vector to be 2D array for cosine_similarity
        similarities = cosine_similarity([target_vector], corpus_vectors)[0]
        
        # Find matches
        matches = []
        highest_similarity = 0
        
        for i, score in enumerate(similarities):
            percentage = round(score * 100, 2)
            if percentage > highest_similarity:
                highest_similarity = percentage
                
            if percentage > 0: # Include all non-zero matches, client can filter
                 matches.append({
                    "studentId": ids[i],
                    "submissionId": submission_ids[i],
                    "similarity": percentage
                })
        
        # Sort matches by similarity desc
        matches.sort(key=lambda x: x['similarity'], reverse=True)
        
        # Determine Risk Level (Initial)
        risk_level = "No Risk"
        if highest_similarity > 50:
            risk_level = "High Risk"
        elif highest_similarity > 25:
            risk_level = "Low Risk"
        elif highest_similarity > 0:
            risk_level = "Safe"
            
        is_ai_verified = False
        
        # Phase 2: AI Semantic Check (if similarity > 20%)
        # Only check the top match if it's significant
        if highest_similarity > 20 and matches:
            top_match = matches[0]
            # Find the text of the top match
            match_index = -1
            for i, sub_id in enumerate(submission_ids):
                if sub_id == top_match['submissionId']:
                    match_index = i
                    break
            
            if match_index != -1:
                matched_text = texts[match_index]
                
                # Call Gemini
                model = get_gemini_model()
                if model:
                    try:
                        prompt = f"""
                        Compare the following two texts for plagiarism.
                        Text A (Suspected): "{target_text[:2000]}"
                        Text B (Source): "{matched_text[:2000]}"
                        
                        Are these texts semantically similar or copied? 
                        Analyze the meaning, structure, and phrasing.
                        Return a JSON object with:
                        - "similarity_score": (number 0-100) estimated semantic similarity
                        - "verdict": ("Copied", "Paraphrased", "Different")
                        - "reason": (short explanation)
                        """
                        
                        response = model.generate_content(prompt)
                        # clean response text to ensure json
                        import json
                        import re
                        
                        response_text = response.text
                        # Try to find JSON block
                        match = re.search(r'\{.*\}', response_text, re.DOTALL)
                        if match:
                            json_str = match.group(0)
                            ai_result = json.loads(json_str)
                            
                            ai_score = ai_result.get("similarity_score", highest_similarity)
                            
                            # Update highest similarity if AI gives a different confident score
                            #Weighted average: 70% AI, 30% Local if AI is confident?
                            # Or just trust AI? 
                            # The PRD says "Confirms semantic plagiarism".
                            # Let's say if AI says "Copied" or "Paraphrased" with high score, we use that.
                            
                            highest_similarity = ai_score
                            is_ai_verified = True
                            
                            # Re-eval risk
                            if highest_similarity > 50:
                                risk_level = "High Risk"
                            elif highest_similarity > 25:
                                risk_level = "Low Risk"
                            elif highest_similarity > 0:
                                risk_level = "Safe"
                            
                    except Exception as e:
                        print(f"Gemini API Error: {e}")
                        # Fallback to local score
        
        return {
            "highest_similarity": round(highest_similarity, 2),
            "risk_level": risk_level,
            "matches": matches[:5], # Return top 5 matches
            "is_ai_verified": is_ai_verified
        }

    except Exception as e:
        print(f"Error in plagiarism calculation: {e}")
        return {
            "highest_similarity": 0,
            "risk_level": "Error",
            "matches": [],
            "is_ai_verified": False
        }
