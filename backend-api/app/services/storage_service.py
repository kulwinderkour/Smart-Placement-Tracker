"""Google Cloud Storage service for resume upload and secure access.

Authentication:
  Set GOOGLE_APPLICATION_CREDENTIALS env var to the path of a service
  account JSON key file. This works identically in:
    - Local dev: download key from GCP Console → set env var to its path
    - Cloud Run: mount the secret as a file via Secret Manager → same env var

GCS object key convention:
  resumes/{student_uuid}/{unix_timestamp}_resume.pdf

Security model:
  - Bucket has NO public access (uniform bucket-level access enforced)
  - Files are never served directly from a public URL
  - All access goes through short-lived signed URLs generated server-side
  - Signed URLs are V4 (most secure) and time-limited
"""

import datetime
import io
import logging
import os

import google.auth
import google.auth.transport.requests
from google.cloud import storage

from app.config import settings

logger = logging.getLogger(__name__)

MAX_RESUME_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB hard limit
ALLOWED_CONTENT_TYPES = {"application/pdf"}


def _get_client() -> storage.Client:
    """
    Returns an authenticated GCS client.
    Reads credentials from GOOGLE_APPLICATION_CREDENTIALS env var automatically.
    Raises RuntimeError if GCS is not configured.
    """
    if not settings.GCS_BUCKET_NAME:
        raise RuntimeError(
            "GCS_BUCKET_NAME is not set. Add it to your .env file."
        )
    return storage.Client(project=settings.GCS_PROJECT_ID or None)


def _get_bucket() -> storage.Bucket:
    return _get_client().bucket(settings.GCS_BUCKET_NAME)


def upload_resume(file_bytes: bytes, student_id: str) -> str:
    """
    Upload a resume PDF to GCS.

    Args:
        file_bytes:  Raw bytes of the PDF file.
        student_id:  UUID string of the student — used as the GCS path prefix.

    Returns:
        The GCS object key (e.g. "resumes/abc-uuid/1716000000_resume.pdf").
        This key is what gets stored in the database — NOT a public URL.

    Raises:
        ValueError:   If file is empty.
        RuntimeError: If GCS upload fails.
    """
    if not file_bytes:
        raise ValueError("Cannot upload an empty file.")

    timestamp = int(datetime.datetime.utcnow().timestamp())
    object_key = f"resumes/{student_id}/{timestamp}_resume.pdf"

    try:
        bucket = _get_bucket()
        blob = bucket.blob(object_key)
        blob.upload_from_file(
            io.BytesIO(file_bytes),
            content_type="application/pdf",
        )
        logger.info("Resume uploaded to GCS: %s", object_key)
        return object_key
    except Exception as exc:
        logger.error("GCS upload failed for student %s: %s", student_id, exc)
        raise RuntimeError(f"File upload failed: {exc}") from exc


def generate_signed_url(object_key: str, expiry_minutes: int = 30) -> str:
    """
    Generate a V4 signed URL for secure, time-limited file access.

    Uses token-based signing which works in two modes without code changes:
      - Local dev: reads credentials from GOOGLE_APPLICATION_CREDENTIALS
        (a service account JSON key file).
      - Cloud Run: reads credentials from the GCP metadata server
        (the attached service account identity — no key file needed).

    The service account must have roles/iam.serviceAccountTokenCreator
    on itself for the token-based signing to work.
    """
    try:
        credentials, _ = google.auth.default(
            scopes=["https://www.googleapis.com/auth/cloud-platform"]
        )
        credentials.refresh(google.auth.transport.requests.Request())

        bucket = _get_bucket()
        blob = bucket.blob(object_key)
        url = blob.generate_signed_url(
            version="v4",
            expiration=datetime.timedelta(minutes=expiry_minutes),
            method="GET",
            service_account_email=credentials.service_account_email,
            access_token=credentials.token,
        )
        logger.info(
            "Generated signed URL for %s (expires in %d min)", object_key, expiry_minutes
        )
        return url
    except Exception as exc:
        logger.error("Signed URL generation failed for %s: %s", object_key, exc)
        raise RuntimeError(f"Could not generate download link: {exc}") from exc


def download_resume_bytes(object_key: str) -> bytes:
    """
    Download a resume PDF from GCS and return raw bytes.
    Used by the analyze endpoint — no public URL needed.
    """
    try:
        bucket = _get_bucket()
        blob = bucket.blob(object_key)
        return blob.download_as_bytes()
    except Exception as exc:
        logger.error("GCS download failed for %s: %s", object_key, exc)
        raise RuntimeError(f"Could not download resume: {exc}") from exc


def delete_resume(object_key: str) -> None:
    """
    Delete a resume from GCS (called when student replaces their resume).
    Silently ignores if the object does not exist.
    """
    try:
        bucket = _get_bucket()
        blob = bucket.blob(object_key)
        blob.delete()
        logger.info("Deleted GCS object: %s", object_key)
    except Exception as exc:
        logger.warning("Could not delete GCS object %s: %s", object_key, exc)
