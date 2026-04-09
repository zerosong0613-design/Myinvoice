-- 문서 공유 링크
CREATE TABLE IF NOT EXISTS share_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK (document_type IN ('invoice', 'quote', 'credit_note')),
  document_id uuid NOT NULL,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  expires_at timestamptz,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_share_links_token ON share_links(token);

ALTER TABLE share_links ENABLE ROW LEVEL SECURITY;

-- 멤버는 공유 링크 관리 가능
CREATE POLICY "Members can manage share links"
  ON share_links FOR ALL
  USING (workspace_id IN (SELECT get_my_workspace_ids()));

-- 누구나 토큰으로 조회 가능 (공개 열람)
CREATE POLICY "Anyone can view by token"
  ON share_links FOR SELECT
  USING (true);
