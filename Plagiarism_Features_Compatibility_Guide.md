# 🕵️‍♀️ Plagiarism Detection & Compatibility Guide (Teacher Dashboard)

This document details the **Plagiarism Detection System** used in the Teacher Dashboard for Assignment Submissions. It explains the workflow, the hybrid AI approach, and the system compatibility requirements.

---

## ⚙️ 1. How Plagiarism Detection Works (Workflow)

The system uses a **Hybrid Approach** combining **Statistical Analysis (TF-IDF)** and **Generative AI (Gemini)** to detect copying.

### **Step-by-Step Process:**

1.  **Student Submission:**
    *   Student uploads a file (PDF) or writes code/text.
    *   **Text Extraction:** The Node.js backend attempts to extract text from the file.
        *   *Current State:* Uses `pdf-parse` which extracts text from **Digital PDFs** (created in Word/Docs).
        *   *Note on Handwriting:* Currently, **scanned images or handwritten PDFs** may yield empty text because the backend does not yet utilize the OCR endpoint for this specific flow.
2.  **Corpus Construction:**
    *   If extracted text > 50 characters, the system fetches **all other submissions** for the same assignment (excluding the current student).
    *   These submissions form the "Corpus" (comparison database).
3.  **Analysis (Python AI Service):**
    *   The target text and corpus are sent to the Python Service (`/plagiarism/check`).
    *   **Phase 1: Statistical Check (Fast):**
        *   Uses **TF-IDF (Term Frequency-Inverse Document Frequency)** and **Cosine Similarity** to compare the text against every other submission.
        *   Identifies potential matches based on word overlap and structure.
    *   **Phase 2: AI Semantic Verification (Smart):**
        *   If a match > **20%** is found, the system calls **Google Gemini AI**.
        *   **Prompt:** *"Compare Text A and B... Are they semantically similar or copied? Return verdict."*
        *   This filters out false positives (e.g., standard boilerplate code or common phrases) and confirms true copying.
4.  **Result Display:**
    *   The system returns a **Similarity %** and **Risk Level** (Safe, Low Risk, High Risk).
    *   Matches are highlighted in the Teacher Dashboard > Assignment Submissions.

---

## 💻 2. Hardware Compatibility

The Plagiarism system involves a Python Microservice which has specific hardware needs, especially if OCR features are enabled in the future.

| Component | Requirements | Notes |
| :--- | :--- | :--- |
| **Backend Server (Node.js)** | **CPU:** 2+ Cores<br>**RAM:** 4GB+ | Standard requirements. Handles file uploads and text extraction. |
| **AI Service (Python)** | **CPU:** Multi-core recommended<br>**RAM:** 4GB+ (Recommended) | **Critical:** The Python service loads `Scikit-Learn` models and `PaddleOCR` (for potential OCR use). These are memory-intensive. Running fast similarity checks on large classes requires decent CPU. |
| **GPU (Optional)** | Not Strictly Required | The current implementation uses CPU-based libraries. GPU would only be needed for very high-volume OCR or local LLM inference (not used here). |
| **Storage** | Standard SSD | Fast I/O is good for reading PDF files temporarily. |

---

## 🛠️ 3. Software Compatibility & Stack

### **A. Core Technologies**
*   **Node.js Backend:**
    *   `pdf-parse`: For extracting text from digital PDFs.
    *   `axios`: For communicating with the Python service.
*   **Python AI Service (Port 8001):**
    *   `FastAPI`: High-performance web framework.
    *   `Scikit-Learn`: For TF-IDF and Cosine Similarity equations.
    *   `Google Generative AI`: For the Semantic Verification (Phase 2).
    *   **PaddleOCR / PaddlePaddle:** For Optical Character Recognition (installed but currently optional for standard text limits).

### **B. Compatibility Constraints**
*   **Operating System:** Windows, Linux (Ubuntu/Debian), or macOS.
*   **Python Version:** **3.9 or higher** is required (specifically for PaddleOCR and new Type Hinting features).
*   **Node.js Version:** **v16+** recommended.
*   **File Types:**
    *   **Supported:** Digital PDFs (Text-selectable), Plain Text, Code files (.js, .py, etc.).
    *   **Limited Support:** Scanned/Handwritten PDFs (Only works if the OCR module is fully integrated into the upload flow; currently relies on `pdf-parse`).

---

## ⚙️ 4. Run & Setup Compatibility

For the Plagiarism Checker to work, the **Python Service MUST be running**.

### **Setup Checklist:**
1.  **Environment Variables (`ai-service/.env`):**
    *   `TEACHER_ASSIGNMENT_GEMINI_KEYS`: **Required.** Used for the Phase 2 AI verification.
2.  **Dependencies:**
    *   Must run `pip install -r requirements.txt` in `ai-service/`.
    *   Key packages: `scikit-learn`, `google-generative-ai`, `fastapi`, `uvicorn`, `paddlepaddle`, `paddleocr`.
3.  **Running the Service:**
    ```bash
    # Terminal 1 (Node Backend)
    npm run dev

    # Terminal 2 (Python AI Service)
    cd ai-service
    python -m uvicorn main:app --port 8001 --reload
    ```
4.  **Network Logic:**
    *   The Node.js backend calls `http://127.0.0.1:8001`. Ensure this port is not blocked by firewalls.

---

## ❓ FAQ: "Why shows 0% on Handwritten Assignments?"
*   **Reason:** The current standard extractor (`pdf-parse`) cannot read images.
*   **Solution:** The system has an **OCR Engine (PaddleOCR)** available in the Python Service (`/check-file` endpoint). To fix this, the Node.js backend needs to be updated to send the *entire file* to the Python service instead of just extracting text locally. This is a "Software Logic" update, not a hardware limitation.
