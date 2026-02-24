const stopword = require('stopword');

class PlagiarismEngine {
    // Preprocess text: tokenize, remove stopwords, punctuation
    preprocessText(text) {
        if (!text || typeof text !== 'string') return [];

        // Convert to lowercase
        const lowercaseText = text.toLowerCase();
        // Tokenize - split on non-alphanumeric characters
        const tokens = lowercaseText.split(/[^a-zA-Z0-9]/).filter(token => token.length > 0);
        // Remove stopwords
        const filteredTokens = stopword.removeStopwords(tokens);
        // Remove short tokens
        const cleanTokens = filteredTokens.filter(token => token.length > 2);

        return cleanTokens;
    }

    // Calculate cosine similarity between two sets of tokens
    calculateCosineSimilarity(tokens1, tokens2) {
        // Create combined vocabulary
        const vocabulary = new Set([...tokens1, ...tokens2]);
        const vocabArray = Array.from(vocabulary);

        // Create TF vectors
        const vector1 = vocabArray.map(word => tokens1.filter(token => token === word).length);
        const vector2 = vocabArray.map(word => tokens2.filter(token => token === word).length);

        // Calculate dot product
        const dotProduct = vector1.reduce((sum, val, i) => sum + val * vector2[i], 0);

        // Calculate magnitudes
        const magnitude1 = Math.sqrt(vector1.reduce((sum, val) => sum + val * val, 0));
        const magnitude2 = Math.sqrt(vector2.reduce((sum, val) => sum + val * val, 0));

        // Calculate cosine similarity
        if (magnitude1 === 0 || magnitude2 === 0) return 0;
        return dotProduct / (magnitude1 * magnitude2);
    }

    // Check plagiarism of target text against corpus
    checkPlagiarism(targetText, corpus) {
        if (!corpus || !targetText || corpus.length === 0) {
            return {
                highest_similarity: 0,
                risk_level: "No Risk",
                matches: [],
                is_ai_verified: false
            };
        }

        const targetTokens = this.preprocessText(targetText);

        let highestSimilarity = 0.0;
        const matches = [];

        for (let i = 0; i < corpus.length; i++) {
            const doc = corpus[i];
            const docTokens = this.preprocessText(doc.text);

            const similarity = this.calculateCosineSimilarity(targetTokens, docTokens);
            const similarityPercent = round(similarity * 100, 2);

            if (similarityPercent > highestSimilarity) {
                highestSimilarity = similarityPercent;
            }

            if (similarityPercent > 10) { // Only report matches > 10%
                matches.push({
                    studentId: doc.id,
                    submissionId: doc.submissionId,
                    similarity: similarityPercent
                });
            }
        }

        // Sort matches by similarity desc
        matches.sort((a, b) => b.similarity - a.similarity);

        let riskLevel = "No Risk";
        if (highestSimilarity > 50) {
            riskLevel = "High Risk";
        } else if (highestSimilarity > 25) {
            riskLevel = "Low Risk";
        } else if (highestSimilarity > 0) {
            riskLevel = "Safe";
        }

        return {
            highest_similarity: highestSimilarity,
            risk_level: riskLevel,
            matches: matches.slice(0, 5), // Top 5 matches only
            is_ai_verified: true
        };
    }
}

// Helper function to round numbers
function round(number, decimals = 2) {
    return Math.round(number * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

// Create a singleton instance
const plagiarismEngine = new PlagiarismEngine();

module.exports = plagiarismEngine;
