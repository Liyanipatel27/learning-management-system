import fitz  # PyMuPDF
import cv2
import numpy as np
import io
from PIL import Image

# Global OCR instance to avoid reloading model
ocr_engine = None

def get_ocr_engine(lang='en'):
    global ocr_engine
    if ocr_engine is None:
        try:
            from paddleocr import PaddleOCR
            # Initialize PaddleOCR with requested language, use_angle_cls=True as requested
            # layout analysis is usually good too but implies detection + recognition
            # lang='ml' is what user asked for, but let's default to 'en' or make it configurable.
            # 'ml' in PaddleOCR usually stands for Malayalam, but user might mean 'multi-lingual' which is often 'ch' or 'en' with specific models.
            # However, prompt said "lang='ml' setting ke sath". So we use 'ml' if passed.
            # If user meant "multilingual" in general, maybe they meant "Latin" or "Cyrillic" etc, but let's stick to their specific string 'ml' or default to 'en'.
            
            # Using 'ml' as default if not specified, per user request "lang='ml' setting ke sath"
            
            ocr_engine = PaddleOCR(use_angle_cls=True, lang=lang) 
            print(f"PaddleOCR initialized with lang={lang}")
        except ImportError:
            print("PaddleOCR not installed. Please install paddlepaddle and paddleocr.")
            return None
        except Exception as e:
            print(f"Failed to initialize PaddleOCR: {e}")
            return None
    return ocr_engine

def extract_text_from_image(image_bytes, lang='ml'):
    """
    Extract text from an image using PaddleOCR.
    """
    ocr = get_ocr_engine(lang)
    if not ocr:
        return "OCR Engine not available."
    
    try:
        # Convert bytes to numpy array for cv2/Paddle
        image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        img_np = np.array(image)
        # PaddleOCR expects BGR for cv2 images sometimes, mostly it handles numpy arrays fine.
        # But commonly used with cv2.imread which is BGR. PIL is RGB.
        # PaddleOCR docs say it handles RGB if passed as standard numpy array, but let's ensure it works.
        # Actually PaddleOCR uses cv2 internally so BGR convention is safer if passing numpy array.
        img_np = cv2.cvtColor(img_np, cv2.COLOR_RGB2BGR)

        result = ocr.ocr(img_np, cls=True)
        
        extracted_text = []
        if result and result[0]:
            for line in result[0]:
                extracted_text.append(line[1][0]) # line[1][0] is the text, line[1][1] is confidence
        
        return "\n".join(extracted_text)
    except Exception as e:
        print(f"Error during OCR: {e}")
        return ""

def extract_text_from_pdf(pdf_bytes, lang='ml'):
    """
    Convert PDF to images and extract text from each page.
    """
    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        full_text = []
        
        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            pix = page.get_pixmap(dpi=300) # Higher DPI for better OCR
            img_bytes = pix.tobytes("png")
            
            text = extract_text_from_image(img_bytes, lang)
            full_text.append(f"--- Page {page_num + 1} ---\n{text}")
            
        return "\n\n".join(full_text)
    except Exception as e:
        print(f"Error processing PDF: {e}")
        return ""

def extract_text_from_file(file_content: bytes, filename: str, lang='ml') -> str:
    """
    Main entry point to extract text from file (PDF or Image).
    """
    filename_lower = filename.lower()
    
    if filename_lower.endswith('.pdf'):
        return extract_text_from_pdf(file_content, lang)
    elif filename_lower.endswith(('.png', '.jpg', '.jpeg', '.bmp', '.tiff')):
        return extract_text_from_image(file_content, lang)
    else:
        # Fallback: try to decode as text? Or just return empty.
        try:
             return file_content.decode('utf-8')
        except:
            return "Unsupported file type for OCR."
