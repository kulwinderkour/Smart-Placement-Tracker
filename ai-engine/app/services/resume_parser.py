import io
import logging

from docx import Document
from pdfminer.high_level import extract_text as pdf_extract_text

logger = logging.getLogger(__name__)


def extract_text_from_pdf(file_bytes: bytes) -> str:
    try:
        return pdf_extract_text(io.BytesIO(file_bytes))
    except Exception as e:
        logger.error(f"PDF extraction failed: {e}")
        return ""


def extract_text_from_docx(file_bytes: bytes) -> str:
    try:
        doc = Document(io.BytesIO(file_bytes))
        return "\n".join([para.text for para in doc.paragraphs])
    except Exception as e:
        logger.error(f"DOCX extraction failed: {e}")
        return ""


def parse_resume(file_bytes: bytes, filename: str) -> str:
    filename_lower = filename.lower()
    if filename_lower.endswith(".pdf"):
        text = extract_text_from_pdf(file_bytes)
    elif filename_lower.endswith(".docx"):
        text = extract_text_from_docx(file_bytes)
    else:
        logger.warning(f"Unsupported file type: {filename}")
        return ""

    if not text or len(text.strip()) < 50:
        logger.warning("Extracted text too short — possibly scanned PDF")
        return ""

    return text.strip()
