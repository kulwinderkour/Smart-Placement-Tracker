import io
import logging
import re
from pathlib import Path

from docx import Document
from pdfminer.high_level import extract_text as pdf_extract_text

try:
    import pytesseract
    from pdf2image import convert_from_bytes

    pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
except Exception:  # pragma: no cover
    pytesseract = None
    convert_from_bytes = None

logger = logging.getLogger(__name__)
BASE_DIR = Path(__file__).resolve().parents[1]
DATASET_PATH = BASE_DIR / "data" / "ResumesPDF"


def _clean_text(text: str) -> str:
    if not text:
        return ""
    text = text.replace("\x00", " ")
    text = re.sub(r"[\t\r]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[ ]{2,}", " ", text)
    return text.strip()


def extract_text_from_pdf(file_bytes: bytes) -> str:
    try:
        return pdf_extract_text(io.BytesIO(file_bytes))
    except Exception as e:
        logger.error(f"PDF extraction failed: {e}")
        return ""


def extract_text_from_pdf_ocr(file_bytes: bytes) -> str:
    if not pytesseract or not convert_from_bytes:
        logger.warning("OCR libraries unavailable: install pytesseract and pdf2image")
        return ""

    try:
        pages = convert_from_bytes(file_bytes)
        chunks: list[str] = []
        for page in pages:
            ocr_text = pytesseract.image_to_string(page)
            if ocr_text and ocr_text.strip():
                chunks.append(ocr_text)
        return "\n".join(chunks)
    except Exception as e:
        logger.error(f"PDF OCR extraction failed: {e}")
        return ""


def extract_text_from_docx(file_bytes: bytes) -> str:
    try:
        doc = Document(io.BytesIO(file_bytes))
        return "\n".join([para.text for para in doc.paragraphs])
    except Exception as e:
        logger.error(f"DOCX extraction failed: {e}")
        return ""


def extract_text_from_txt(file_bytes: bytes) -> str:
    try:
        return file_bytes.decode("utf-8", errors="ignore")
    except Exception as e:
        logger.error(f"TXT extraction failed: {e}")
        return ""


def parse_resume(file_bytes: bytes, filename: str) -> str:
    filename_lower = filename.lower()
    if filename_lower.endswith(".pdf"):
        extracted_text = extract_text_from_pdf(file_bytes)
        if len(_clean_text(extracted_text)) < 50:
            ocr_text = extract_text_from_pdf_ocr(file_bytes)
            text = f"{extracted_text}\n{ocr_text}" if ocr_text else extracted_text
        else:
            text = extracted_text
    elif filename_lower.endswith(".docx"):
        text = extract_text_from_docx(file_bytes)
    elif filename_lower.endswith(".txt"):
        text = extract_text_from_txt(file_bytes)
    else:
        logger.warning(f"Unsupported file type: {filename}")
        return ""

    text = _clean_text(text)

    if not text or len(text) < 50:
        logger.warning("Extracted text too short — possibly scanned PDF")
        return ""

    return text
