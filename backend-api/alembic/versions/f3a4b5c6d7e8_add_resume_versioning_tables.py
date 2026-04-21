"""add resume versioning and analysis tables

Revision ID: f3a4b5c6d7e8
Revises: 7da82da0abe5
Create Date: 2026-04-21
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = 'f3a4b5c6d7e8'
down_revision = 'b1c2d3e4f5a6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'resumes',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('student_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('gcs_key', sa.Text(), nullable=False),
        sa.Column('file_name', sa.String(255), nullable=False),
        sa.Column('version', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['student_id'], ['students.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_resumes_student_id', 'resumes', ['student_id'])

    op.create_table(
        'resume_analyses',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('student_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('resume_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('ats_score', sa.Integer(), nullable=False),
        sa.Column('feedback', sa.Text(), nullable=True),
        sa.Column('job_description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['student_id'], ['students.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['resume_id'], ['resumes.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_resume_analyses_student_id', 'resume_analyses', ['student_id'])
    op.create_index('ix_resume_analyses_resume_id', 'resume_analyses', ['resume_id'])


def downgrade() -> None:
    op.drop_index('ix_resume_analyses_resume_id', table_name='resume_analyses')
    op.drop_index('ix_resume_analyses_student_id', table_name='resume_analyses')
    op.drop_table('resume_analyses')
    op.drop_index('ix_resumes_student_id', table_name='resumes')
    op.drop_table('resumes')
