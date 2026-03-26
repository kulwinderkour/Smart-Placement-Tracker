"""merge_all_heads_2

Revision ID: 5a3b799651d5
Revises: 4d36eb27f786, f2a3b4c5d6e7
Create Date: 2026-03-26 18:21:55.375029

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5a3b799651d5'
down_revision: Union[str, None] = ('4d36eb27f786', 'f2a3b4c5d6e7')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
