-- 활동 로그 테이블
CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  action text NOT NULL,
  target_type text NOT NULL,
  target_id uuid,
  target_label text,
  details jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_workspace ON activity_logs(workspace_id, created_at DESC);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace activity"
  ON activity_logs FOR SELECT
  USING (workspace_id IN (SELECT get_my_workspace_ids()));

CREATE POLICY "Members can insert activity"
  ON activity_logs FOR INSERT
  WITH CHECK (workspace_id IN (SELECT get_my_workspace_ids()));
