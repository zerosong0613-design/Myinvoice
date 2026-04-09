-- 워크스페이스 설정 확장
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS default_due_days integer DEFAULT 30;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS default_memo text DEFAULT NULL;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS default_tax_type text DEFAULT 'exclusive';
