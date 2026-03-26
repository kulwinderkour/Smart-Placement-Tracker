"""merge_all_heads_2

Revision ID: ab72a29b32d0
Revises: 1dbe0a28621d, 5a3b799651d5
Create Date: 2026-03-26 18:56:50.571757

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ab72a29b32d0'
down_revision: Union[str, None] = ('1dbe0a28621d', '5a3b799651d5')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
