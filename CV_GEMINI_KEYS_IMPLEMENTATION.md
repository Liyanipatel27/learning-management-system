# CV_GEMINI_API_KEYS Implementation Summary

## Overview
This document outlines the implementation of CV_GEMINI_API_KEYS for exclusive use in the following features in My Courses:
1. Summary Generation
2. Quiz Generation
3. Doubt Resolution

## Changes Made

### 1. Configuration Loading in AIService Constructor
Updated the `constructor` method in `backend/services/aiService.js` to load CV_GEMINI_API_KEYS:

```javascript
// Initialize CV Gemini Keys (Exclusively for My Courses Summary/Quiz/Doubt)
if (process.env.CV_GEMINI_API_KEYS) {
    this.cvGeminiKeys = process.env.CV_GEMINI_API_KEYS.split(',').map(k => k.trim()).filter(k => k);
    this.currentCvGeminiKeyIndex = 0;
    if (this.cvGeminiKeys.length === 0) {
        console.warn("CV_GEMINI_API_KEYS is set but empty.");
    }
    console.log(`CV_GEMINI_API_KEYS initialized with ${this.cvGeminiKeys.length} key(s)`);
} else {
    console.warn("CV_GEMINI_API_KEYS is not set. Summary/Quiz/Doubt features might fail or fall back.");
    this.cvGeminiKeys = [];
}
```

### 2. Dedicated Call Method (callCVLLM)
Created a new `callCVLLM` method for CV keys:

```javascript
// Dedicated CV Key LLM Call (Uses CV keys - Exclusively for My Courses Summary/Quiz/Doubt)
async callCVLLM(prompt, systemInstruction = "", jsonMode = false) {
    if (this.cvGeminiKeys.length === 0) {
        console.warn("No CV Gemini API keys configured. Falling back to default keys.");
        return this.callLLM(prompt, systemInstruction, jsonMode);
    }
    const finalPrompt = jsonMode ? prompt : (prompt + FORMATTING_SUFFIX);
    return this._executeGeminiCall(finalPrompt, systemInstruction, jsonMode, this.cvGeminiKeys, 'CV');
}
```

### 3. Key Rotation Support in _executeGeminiCall
Updated `_executeGeminiCall` to handle 'CV' key type for key rotation:

```javascript
// Determine current index based on key type (simple load balancing)
let currentIndexName = 'currentGeminiKeyIndex';
let callCountName = 'geminiCallCount';

if (keyType === 'PV') {
    currentIndexName = 'currentTvGeminiKeyIndex';
    callCountName = 'pvGeminiCallCount';
} else if (keyType === 'TeacherAssignment') {
    currentIndexName = 'currentAssignmentKeyIndex';
    callCountName = 'assignmentCallCount';
} else if (keyType === 'TeacherQuestion') {
    currentIndexName = 'currentQuestionKeyIndex';
    callCountName = 'questionCallCount';
} else if (keyType === 'QuizGenerator') {
    currentIndexName = 'currentQuizKeyIndex';
    callCountName = 'quizGenCallCount';
    if (this[currentIndexName] === undefined) this[currentIndexName] = 0;
} else if (keyType === 'CV') {
    currentIndexName = 'currentCvGeminiKeyIndex';
    callCountName = 'cvGeminiCallCount';
    if (this[currentIndexName] === undefined) this[currentIndexName] = 0;
}
```

### 4. Feature Methods Updated to Use callCVLLM

#### a. generateSubjectSummary (Summary Generation)
```javascript
// Feature 1: Subject & Video Summaries (Uses CV keys exclusively)
async generateSubjectSummary(content, type) {
    let textToAnalyze = content;
    
    // ... (PDF extraction logic)
    
    const prompt = `Analyze the following content and generate a concise summary with bullet points. 
    Content: ${textToAnalyze.substring(0, 20000)}... (truncated if too long)${FORMATTING_SUFFIX}`;

    return await this.callCVLLM(prompt, "You are an expert educational assistant. Summarize the content clearly/concisely.");
}
```

#### b. generateQuiz (Quiz Generation)
```javascript
// Feature 6: Quiz Generator (Uses CV keys exclusively)
async generateQuiz(subject, topic, difficulty, content = null) {
    let prompt = "";
    
    // ... (PDF extraction and prompt construction logic)
    
    try {
        const res = await this.callCVLLM(prompt, "You are a quiz generator. Return ONLY valid JSON.", true);
        return JSON.parse(res);
    } catch (e) {
        throw new Error("Failed to generate quiz");
    }
}
```

#### c. resolveDoubt (Doubt Resolution)
```javascript
async resolveDoubt(question, history = [], contextUrl = null, studentLevel = 'Average') {
    // ... (context extraction and system prompt construction)
    
    // First try CV Gemini with timeout, then fall back to simple responses
    try {
        const cvResult = await Promise.race([
            this.callCVLLM(prompt, systemPrompt),
            new Promise((_, reject) => setTimeout(() => reject(new Error("CV Gemini timeout")), 15000))
        ]);
        return cvResult;
    } catch (cvError) {
        console.error("CV Gemini fallback failed:", cvError.message);
        // If CV Gemini fails or times out, use simple fallback responses
        return this.getSimpleFallbackResponse(question);
    }
}
```

### 5. Model Version Update
Changed the model from `gemini-1.5-flash` to `gemini-2.5-flash` to match the currently available models in Google's API:

```javascript
_getGenerativeModel(keyIndex, keys = this.geminiKeys, systemInstruction = null) {
    if (!keys || keys.length === 0) return null;
    const key = keys[keyIndex];
    const genAI = new GoogleGenerativeAI(key);
    // Using gemini-2.5-flash model which is supported by the current API version
    const modelParams = { model: "gemini-2.5-flash" };
    if (systemInstruction) {
        modelParams.systemInstruction = systemInstruction;
    }
    return genAI.getGenerativeModel(modelParams);
}
```

## Verification

### Environment Configuration
- CV_GEMINI_API_KEYS is set in backend/.env
- Keys are properly loaded from environment variables
- Fallback mechanism works correctly

### Functionality
- **Summary Generation**: ✅ Working with callCVLLM
- **Quiz Generation**: ✅ Working with callCVLLM  
- **Doubt Resolution**: ✅ Working with callCVLLM
- **Key Rotation**: ✅ Implemented for CV keys
- **Timeout Handling**: ✅ Added to prevent long waits
- **Fallback Responses**: ✅ Working when API fails

## Current Status
The implementation is complete and operational. The CV_GEMINI_API_KEYS are now being used exclusively for summary, quiz, and doubt features in My Courses.

## Note on API Key Status
The test results show one of the CV keys (index 0) is invalid, but the key rotation mechanism correctly falls back to the second key (index 1) which is valid.
