-- ============================================================
-- 마이인보이스 마이그레이션 004~012 통합
-- Supabase SQL Editor에서 이 파일 전체를 복사 → 붙여넣기 → Run
-- 모든 명령이 IF NOT EXISTS / IF EXISTS를 사용하므로 중복 실행해도 안전합니다.
-- ============================================================

-- ▶ 004: 문서 간 연동 컬럼
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS source_quote_id uuid REFERENCES quotes(id) ON DELETE SET NULL;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS converted_invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_source_quote_id ON invoices(source_quote_id);
CREATE INDEX IF NOT EXISTS idx_quotes_converted_invoice_id ON quotes(converted_invoice_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_original_invoice_id ON credit_notes(original_invoice_id);

-- ▶ 005: 초대 테이블
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
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_workspace ON invitations(workspace_id);
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Members can view workspace invitations') THEN
    CREATE POLICY "Members can view workspace invitations" ON invitations FOR SELECT USING (workspace_id IN (SELECT get_my_workspace_ids()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can create invitations') THEN
    CREATE POLICY "Admins can create invitations" ON invitations FOR INSERT WITH CHECK (workspace_id IN (SELECT wm.workspace_id FROM workspace_members wm WHERE wm.user_id = auth.uid() AND wm.status = 'active' AND wm.role IN ('owner', 'admin')));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can update invitations') THEN
    CREATE POLICY "Admins can update invitations" ON invitations FOR UPDATE USING (workspace_id IN (SELECT wm.workspace_id FROM workspace_members wm WHERE wm.user_id = auth.uid() AND wm.status = 'active' AND wm.role IN ('owner', 'admin')));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view invitation by token') THEN
    CREATE POLICY "Anyone can view invitation by token" ON invitations FOR SELECT USING (true);
  END IF;
END $$;

-- ▶ 006: 워크스페이스 소프트 삭제
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_workspaces_deleted_at ON workspaces(deleted_at);

-- ▶ 007: 활동 로그
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
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Members can view workspace activity') THEN
    CREATE POLICY "Members can view workspace activity" ON activity_logs FOR SELECT USING (workspace_id IN (SELECT get_my_workspace_ids()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Members can insert activity') THEN
    CREATE POLICY "Members can insert activity" ON activity_logs FOR INSERT WITH CHECK (workspace_id IN (SELECT get_my_workspace_ids()));
  END IF;
END $$;

-- ▶ 008: 공유 링크
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
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Members can manage share links') THEN
    CREATE POLICY "Members can manage share links" ON share_links FOR ALL USING (workspace_id IN (SELECT get_my_workspace_ids()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view by token') THEN
    CREATE POLICY "Anyone can view by token" ON share_links FOR SELECT USING (true);
  END IF;
END $$;

-- ▶ 009: 워크스페이스 기본 설정
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS default_due_days integer DEFAULT 30;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS default_memo text DEFAULT NULL;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS default_tax_type text DEFAULT 'exclusive';

-- ▶ 010: 지급요청서
CREATE TABLE IF NOT EXISTS payment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  request_number text NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_email text,
  customer_biz_number text,
  issued_at date NOT NULL DEFAULT CURRENT_DATE,
  due_at date,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'cancelled')),
  subtotal integer NOT NULL DEFAULT 0,
  withholding_tax integer NOT NULL DEFAULT 0,
  net_amount integer NOT NULL DEFAULT 0,
  withholding_rate numeric(5,2) NOT NULL DEFAULT 3.3,
  bank_name text,
  account_number text,
  account_holder text,
  memo text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS payment_request_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_request_id uuid NOT NULL REFERENCES payment_requests(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  quantity integer NOT NULL DEFAULT 1,
  unit_price integer NOT NULL DEFAULT 0,
  amount integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_payment_requests_workspace ON payment_requests(workspace_id);
CREATE INDEX IF NOT EXISTS idx_payment_request_items_pr ON payment_request_items(payment_request_id);
ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_request_items ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Members can manage payment_requests') THEN
    CREATE POLICY "Members can manage payment_requests" ON payment_requests FOR ALL USING (workspace_id IN (SELECT get_my_workspace_ids()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Members can manage payment_request_items') THEN
    CREATE POLICY "Members can manage payment_request_items" ON payment_request_items FOR ALL USING (payment_request_id IN (SELECT id FROM payment_requests WHERE workspace_id IN (SELECT get_my_workspace_ids())));
  END IF;
END $$;

-- ▶ 011: 품목 서비스 유형
ALTER TABLE products ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'product';
ALTER TABLE products ADD COLUMN IF NOT EXISTS rate_type text NOT NULL DEFAULT 'unit';
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS performer text DEFAULT NULL;
ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS performer text DEFAULT NULL;
ALTER TABLE credit_note_items ADD COLUMN IF NOT EXISTS performer text DEFAULT NULL;
ALTER TABLE payment_request_items ADD COLUMN IF NOT EXISTS performer text DEFAULT NULL;

-- ▶ 012: 워크스페이스 API 키 + 입금 계좌
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS bolta_api_key text DEFAULT NULL;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS bolta_customer_key text DEFAULT NULL;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS resend_api_key text DEFAULT NULL;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS resend_from_email text DEFAULT NULL;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS bank_name text DEFAULT NULL;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS account_number text DEFAULT NULL;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS account_holder text DEFAULT NULL;

-- ✅ 완료!
