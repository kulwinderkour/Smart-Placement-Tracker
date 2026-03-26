"""merge_all_heads_2

Revision ID: 00188da8dec0
Revises: ab72a29b32d0
Create Date: 2026-03-26 19:09:53.811269

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '00188da8dec0'
down_revision: Union[str, None] = 'ab72a29b32d0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
