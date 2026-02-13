# 🧠 AI Features & Compatibility Guide (Student Dashboard)

This document provides a detailed breakdown of how the AI features (Summary, Quiz, Doubt Solving) work in the **Student Dashboard > My Course** section, along with valid hardware, software, and run compatibility requirements.

---

## 🚀 1. How AI Features Work (Functional Workflow)

All AI features in "My Course" are powered by the **Node.js Backend** interacting with **Google Gemini (LLM)**.

### A. ✨ AI Summary
*   **Purpose:** Generates a concise bullet-point summary of the currently selected lesson content (Text, PDF, or Video context).
*   **Workflow:**
    1.  **User Action:** Student clicks the `✨ AI Summary` button in the `CourseViewer` sidebar.
    2.  **Frontend:** Sends the content text or PDF URL to the backend endpoint `/api/ai/summary`.
    3.  **Backend Processing (`aiService.js`):**
        *   If it's a **PDF**, it uses `pdf-parse` to extract raw text (Text-based PDFs only).
        *   Constructs a prompt: *"Analyze the following content and generate a concise summary..."*
        *   Calls **Google Gemini API** (using `CV_GEMINI_API_KEYS`).
    4.  **Output:** Returns a Markdown-formatted summary to the frontend, displayed in the sidebar.

### B. ✅ AI Quiz
*   **Purpose:** Generates a dynamic 5-question MCQ quiz based on the specific lesson content to test understanding.
*   **Workflow:**
    1.  **User Action:** Student clicks `✅ Quiz`.
    2.  **Frontend:** Sends content context to `/api/ai/quiz`.
    3.  **Backend Processing:**
        *   Extracts text context (similar to Summary).
        *   Prompts Gemini to return **JSON data** containing 5 MCQs with distractors and explanations.
        *   Validates the JSON structure.
    4.  **Output:** Frontend renders an interactive quiz. Scores are NOT saved to the database (practice only) unless it's a formal Module Quiz.

### C. 🤔 Doubt Solving (AI Tutor)
*   **Purpose:** Allows students to ask questions about the specific lesson.
*   **Workflow:**
    1.  **User Action:** Student clicks `🤔 Doubt` or uses the Chatbot bubble.
    2.  **Context Awareness:** The current lesson content is attached as "Context" to the message.
    3.  **Frontend:** Sends the user's question + content context to `/api/ai/chat`.
    4.  **Backend Processing:**
        *   Injects a **strict system prompt** enforcing structured, point-wise, professional responses (No paragraphs).
        *   Calls Gemini to answer the question *based on the provided context*.
    5.  **Output:** Helper AI response displayed in the chat interface.

---

## 💻 2. Hardware Compatibility

Since the AI processing happens in the **Cloud (Google Gemini / OpenAI)** and the **Backend Server**, the client-side hardware requirements are minimal.

| Component | Requirements | Notes |
| :--- | :--- | :--- |
| **Client Device** (Student) | Any modern Laptop, Tablet, or Smartphone | Needs a standard web browser (Chrome, Edge, Safari). <br>**RAM:** 4GB+ recommended for smooth UI. |
| **Backend Server** | **CPU:** 2+ Cores (Standard Cloud VM)<br>**RAM:** 4GB+ (8GB recommended) | Handles Node.js runtime and API requests. Does *not* require a GPU because LLM inference is external. |
| **Python Service** (Optional) | **CPU:** Standard Ops<br>**RAM:** 2GB+ | Only required if using OCR for *handwritten* assignments (PaddleOCR). Not used for standard My Course features. |
| **Internet** | **Stable High-Speed Connection** | **Critical.** All AI features require active internet to reach Google Gemini APIs. |

---

## 🛠️ 3. Software Compatibility & Stack

The system is built on the **MERN Stack** (MongoDB, Express, React, Node.js) with Python for specific microservices.

### **Core Software Stack:**
*   **Frontend Library:** `React.js` (Vite), `Axios`, `React Router`.
*   **Backend Runtime:** `Node.js` (Express), `Mongoose`.
*   **Database:** `MongoDB` (Stores users, courses, progress).
*   **AI Engine:**
    *   **Primary:** `Google Generative AI SDK` (@google/generative-ai).
    *   **Secondary:** `OpenAI SDK` (for Risk Analysis/Performance - optional fallback).
    *   **PDF Engine:** `pdf-parse` (Node.js) for text extraction.

### **Compatibility Constraints:**
*   **Browser:** Chrome 90+, Firefox 90+, Safari 14+, Edge (Chromium).
*   **Node.js Version:** Requires **v14.0.0** or higher (v18+ recommended).
*   **PDF Compatibility:**
    *   **Works with:** Digital/Text-based PDFs (e.g., exported from Word).
    *   **Does NOT Work with:** Scanned PDFs (Images) in the *My Course* section (currently uses `pdf-parse` which cannot read images). Scanned PDFs require the Python OCR service which is currently linked to *Plagiarism Checks*, not the immediate Course Summary.

---

## ⚙️ 4. Run & Setup Compatibility

To fully utilize the AI features, the setup must be configured correctly with API keys.

### **Environmental Setup (.env):**
The following keys **MUST** be present in the backend `.env` file for compatibility:
*   `GEMINI_API_KEYS`: Comma-separated list of Google Gemini API keys.
*   `CV_GEMINI_API_KEYS`: (Optional) Dedicated keys for Computer Vision/Course Viewer features to prevent rate limits.
*   `OPENAI_API_KEYS`: (Optional) For advanced analytics.

### **Running the Application:**

1.  **Start Backend:**
    ```bash
    cd backend
    npm run dev
    # Runs on Port 5000 (Default)
    ```

2.  **Start Frontend:**
    ```bash
    cd frontend
    npm run dev
    # Runs on Port 5173 (Default)
    ```

3.  **Start Python AI Service (If using OCR/Plagiarism):**
    ```bash
    cd ai-service
    # Requires Python 3.9+
    pip install -r requirements.txt
    python -m uvicorn main:app --port 8001 --reload
    ```

### **Verification:**
*   Go to **My Course** > Open a Lesson.
*   Click **✨ AI Summary**.
*   **Success:** A bulleted summary appears.
*   **Failure:** "Failed to generate summary" (Usually indicates missing API keys or Internet issues).
