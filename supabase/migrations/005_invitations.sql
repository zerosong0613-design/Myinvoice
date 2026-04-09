-- 초대 테이블
CREATE TABLE IF NOT EXISTS invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  invited_by uuid NOT NULL REFERENCES auth.users(id),
  email text,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '7 days',
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_workspace ON invitations(workspace_id);

-- RLS
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- 워크스페이스 멤버는 초대 목록 조회 가능
CREATE POLICY "Members can view workspace invitations"
  ON invitations FOR SELECT
  USING (workspace_id IN (SELECT get_my_workspace_ids()));

-- owner/admin만 초대 생성 가능
CREATE POLICY "Admins can create invitations"
  ON invitations FOR INSERT
  WITH CHECK (workspace_id IN (
    SELECT wm.workspace_id FROM workspace_members wm
    WHERE wm.user_id = auth.uid()
    AND wm.status = 'active'
    AND wm.role IN ('owner', 'admin')
  ));

-- owner/admin만 초대 취소 가능
CREATE POLICY "Admins can update invitations"
  ON invitations FOR UPDATE
  USING (workspace_id IN (
    SELECT wm.workspace_id FROM workspace_members wm
    WHERE wm.user_id = auth.uid()
    AND wm.status = 'active'
    AND wm.role IN ('owner', 'admin')
  ));

-- 누구나 토큰으로 초대 조회 가능 (수락 플로우)
CREATE POLICY "Anyone can view invitation by token"
  ON invitations FOR SELECT
  USING (true);
