-- Question Bank enhancement reference migration (SQL parity doc)
-- Source of truth in this repo is MongoDB/Mongoose.
-- This SQL is provided for audit/documentation and data-warehouse parity.

ALTER TABLE question_bank
ADD COLUMN IF NOT EXISTS class_level VARCHAR(64),
ADD COLUMN IF NOT EXISTS department VARCHAR(128),
ADD COLUMN IF NOT EXISTS subject VARCHAR(128),
ADD COLUMN IF NOT EXISTS chapter VARCHAR(128),
ADD COLUMN IF NOT EXISTS topic VARCHAR(128),
ADD COLUMN IF NOT EXISTS question_text TEXT,
ADD COLUMN IF NOT EXISTS question_html TEXT,
ADD COLUMN IF NOT EXISTS question_type VARCHAR(16),
ADD COLUMN IF NOT EXISTS options JSONB,
ADD COLUMN IF NOT EXISTS correct_answer JSONB,
ADD COLUMN IF NOT EXISTS estimated_time INT,
ADD COLUMN IF NOT EXISTS skill_tags JSONB,
ADD COLUMN IF NOT EXISTS image_media_id UUID NULL,
ADD COLUMN IF NOT EXISTS status VARCHAR(32) DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS quality_score NUMERIC(6,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS quality_flags JSONB,
ADD COLUMN IF NOT EXISTS usage_count INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS avg_correct_pct NUMERIC(6,2),
ADD COLUMN IF NOT EXISTS revision_no INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS previous_revision_id UUID NULL,
ADD COLUMN IF NOT EXISTS locked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ NULL;

CREATE TABLE IF NOT EXISTS question_media (
    id UUID PRIMARY KEY,
    source_type VARCHAR(32) NOT NULL,
    url TEXT NOT NULL,
    mime_type VARCHAR(255),
    size_bytes BIGINT,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    alt_text_bn TEXT,
    created_by UUID,
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS question_import_jobs (
    id UUID PRIMARY KEY,
    status VARCHAR(32) NOT NULL,
    source_file_name TEXT,
    created_by UUID,
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    total_rows INT NOT NULL DEFAULT 0,
    imported_rows INT NOT NULL DEFAULT 0,
    skipped_rows INT NOT NULL DEFAULT 0,
    failed_rows INT NOT NULL DEFAULT 0,
    duplicate_rows INT NOT NULL DEFAULT 0,
    row_errors JSONB,
    options JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_question_bank_status_updated_at
ON question_bank (status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_question_bank_taxonomy
ON question_bank (class_level, department, subject, chapter, difficulty);

CREATE INDEX IF NOT EXISTS idx_question_import_jobs_status
ON question_import_jobs (status, created_at DESC);
