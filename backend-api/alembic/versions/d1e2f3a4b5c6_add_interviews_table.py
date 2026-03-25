"""add_interviews_table

Revision ID: d1e2f3a4b5c6
Revises: c9d71b0f2e34
Create Date: 2026-03-25 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d1e2f3a4b5c6"
down_revision: Union[str, None] = "c9d71b0f2e34"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "interviews",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("student_id", sa.Uuid(), nullable=False),
        sa.Column("job_id", sa.Uuid(), nullable=False),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "mode",
            sa.Enum("google_meet", "zoom", "offline", name="interviewmode"),
            nullable=False,
            server_default="google_meet",
        ),
        sa.Column("meeting_link", sa.String(length=500), nullable=True),
        sa.Column(
            "status",
            sa.Enum("scheduled", "completed", "cancelled", name="interviewstatus"),
            nullable=False,
            server_default="scheduled",
        ),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("feedback_rating", sa.Integer(), nullable=True),
        sa.Column("feedback_comment", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["job_id"], ["jobs.id"]),
        sa.ForeignKeyConstraint(["student_id"], ["students.id"]),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("interviews")
    op.execute("DROP TYPE IF EXISTS interviewstatus CASCADE;")
    op.execute("DROP TYPE IF EXISTS interviewmode CASCADE;")
