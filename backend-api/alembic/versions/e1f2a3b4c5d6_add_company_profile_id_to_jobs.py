"""add_company_profile_id_to_jobs

Revision ID: e1f2a3b4c5d6
Revises: d1e2f3a4b5c6
Create Date: 2026-03-25 10:00:00.000000

Adds company_profile_id FK to jobs table for multi-tenant company isolation.
Each company-posted job is linked to its company_profile row.
Scraped jobs keep company_profile_id = NULL for backward compatibility.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "e1f2a3b4c5d6"
down_revision: Union[str, None] = "d1e2f3a4b5c6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "jobs",
        sa.Column("company_profile_id", sa.Uuid(), nullable=True)
    )

    op.create_foreign_key(
        "fk_jobs_company_profile_id",
        "jobs",
        "company_profiles",
        ["company_profile_id"],
        ["id"],
        ondelete="SET NULL",
    )

    op.create_index(
        "ix_jobs_company_profile_id",
        "jobs",
        ["company_profile_id"]
    )


def downgrade() -> None:
    op.drop_index(
        "ix_jobs_company_profile_id",
        table_name="jobs"
    )

    op.drop_constraint(
        "fk_jobs_company_profile_id",
        "jobs",
        type_="foreignkey"
    )

    op.drop_column(
        "jobs",
        "company_profile_id"
    )