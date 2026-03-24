"""extend_company_profile_fields

Revision ID: b7f4d2c9a1e0
Revises: a1b2c3d4e5f6
Create Date: 2026-03-23 11:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "b7f4d2c9a1e0"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "company_profiles",
        sa.Column("linkedin_url", sa.String(length=500), nullable=True),
    )
    op.add_column(
        "company_profiles",
        sa.Column("location", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "company_profiles",
        sa.Column("founded_year", sa.Integer(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("company_profiles", "founded_year")
    op.drop_column("company_profiles", "location")
    op.drop_column("company_profiles", "linkedin_url")
