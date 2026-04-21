"""drop_resume_base64_column

Revision ID: b1c2d3e4f5a6
Revises: a0b1c2d3e4f5
Create Date: 2026-04-21 10:05:00.000000

Removes the resume_base64 column from the students table.

Why:
  Storing a PDF as a base64 string in a relational database row is
  fundamentally incorrect. A 267 KB PDF becomes ~357 KB of text that
  is loaded into memory for EVERY query touching the students table,
  even when only reading full_name or cgpa. At 500 students this is
  ~178 MB of wasted data transfer per full-table scan.

  Resumes are now stored in Google Cloud Storage. The students table
  keeps only resume_url (the GCS object key — ~80 bytes) and
  resume_name (the original filename for display purposes).

  Access is controlled via signed URLs generated server-side.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b1c2d3e4f5a6"
down_revision: Union[str, None] = "a0b1c2d3e4f5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("students", "resume_base64")


def downgrade() -> None:
    op.add_column(
        "students",
        sa.Column("resume_base64", sa.Text(), nullable=True),
    )
