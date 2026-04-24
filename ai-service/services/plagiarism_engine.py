import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class PlagiarismEngine:
    def __init__(self):
        self.vectorizer = TfidfVectorizer(stop_words='english')

    def check_plagiarism(self, target_text: str, corpus: list):
        """
        Check plagiarism of target_text against a corpus of documents.
        corpus: list of dicts with 'id', 'text', 'submissionId'
        """
        if not corpus or not target_text:
            return {
                "highest_similarity": 0,
                "risk_level": "No Risk",
                "matches": [],
                "is_ai_verified": False
            }

        documents = [doc['text'] for doc in corpus]
        # Append target text to the end
        all_texts = documents + [target_text]

        try:
            tfidf_matrix = self.vectorizer.fit_transform(all_texts)
            
            # target_vector is the last one
            target_vector = tfidf_matrix[-1]
            # corpus_vectors are the rest
            corpus_vectors = tfidf_matrix[:-1]

            # Calculate cosine similarity
            cosine_similarities = cosine_similarity(target_vector, corpus_vectors).flatten()

            matches = []
            highest_similarity = 0.0

            for i, score in enumerate(cosine_similarities):
                score_percent = round(score * 100, 2)
                if score_percent > highest_similarity:
                    highest_similarity = score_percent
                
                if score_percent > 10: # Only report matches > 10%
                    matches.append({
                        "studentId": corpus[i].get('id'),
                        "submissionId": corpus[i].get('submissionId'),
                        "similarity": score_percent
                    })
            
            # Sort matches by similarity desc
            matches.sort(key=lambda x: x['similarity'], reverse=True)

            risk_level = "No Risk"
            if highest_similarity > 50:
                risk_level = "High Risk"
            elif highest_similarity > 25:
                risk_level = "Low Risk"
            elif highest_similarity > 0:
                risk_level = "Safe"

            return {
                "highest_similarity": highest_similarity,
                "risk_level": risk_level,
                "matches": matches[:5], # Top 5 matches only
                "is_ai_verified": True
            }

        except Exception as e:
            logger.error(f"Error in plagiarism check: {e}")
            return {
                "highest_similarity": 0,
                "risk_level": "Error",
                "matches": [],
                "is_ai_verified": False
            }
