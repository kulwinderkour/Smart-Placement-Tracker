"""add_missing_application_columns

Adds resume_url, cover_letter, agent_applied columns that are in the Application
model but were missing from the initial schema migration.

Revision ID: a3b4c5d6e7f8
Revises: 9725b1674e53
Create Date: 2026-04-08
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'a3b4c5d6e7f8'
down_revision: Union[str, None] = '00188da8dec0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('applications', sa.Column('resume_url', sa.Text(), nullable=True))
    op.add_column('applications', sa.Column('cover_letter', sa.Text(), nullable=True))
    op.add_column('applications', sa.Column('agent_applied', sa.Boolean(), nullable=False, server_default='false'))


def downgrade() -> None:
    op.drop_column('applications', 'agent_applied')
    op.drop_column('applications', 'cover_letter')
    op.drop_column('applications', 'resume_url')
