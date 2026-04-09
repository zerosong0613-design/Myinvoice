-- 워크스페이스 소프트 삭제 지원
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- 삭제된 워크스페이스는 기본 조회에서 제외되도록 인덱스
CREATE INDEX IF NOT EXISTS idx_workspaces_deleted_at ON workspaces(deleted_at);
