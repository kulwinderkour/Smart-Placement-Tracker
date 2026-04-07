"""merge application columns and questions table

Revision ID: b5c6d7e8f9a0
Revises: a3b4c5d6e7f8, c2d3e4f5a6b7
Create Date: 2026-04-08
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'b5c6d7e8f9a0'
down_revision: Union[str, tuple, None] = ('a3b4c5d6e7f8', 'c2d3e4f5a6b7')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
