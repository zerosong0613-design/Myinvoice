-- =============================================
-- MyInvoice (마이인보이스) - 초기 스키마
-- Supabase SQL Editor에서 실행
-- =============================================

-- 1. 워크스페이스
CREATE TABLE workspaces (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  biz_number  text,
  owner_id    uuid REFERENCES auth.users NOT NULL,
  logo_url    text,
  address     text,
  phone       text,
  email       text,
  memo        text,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

-- 2. 멤버 & 역할
CREATE TABLE workspace_members (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id   uuid REFERENCES workspaces ON DELETE CASCADE,
  user_id        uuid REFERENCES auth.users ON DELETE CASCADE,
  role           text CHECK (role IN ('owner','admin','member')) DEFAULT 'member',
  invited_email  text,
  status         text CHECK (status IN ('active','invited')) DEFAULT 'invited',
  joined_at      timestamptz,
  UNIQUE (workspace_id, user_id)
);

ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

-- 3. 거래처
CREATE TABLE customers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid REFERENCES workspaces ON DELETE CASCADE,
  name          text NOT NULL,
  email         text,
  phone         text,
  biz_number    text,
  address       text,
  memo          text,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- 4. 품목
CREATE TABLE products (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid REFERENCES workspaces ON DELETE CASCADE,
  name          text NOT NULL,
  unit_price    numeric(15,2) DEFAULT 0,
  unit          text,
  description   text,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- 5. 청구서
CREATE TABLE invoices (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid REFERENCES workspaces ON DELETE CASCADE,
  invoice_number  text NOT NULL,
  customer_id     uuid REFERENCES customers,
  customer_name   text NOT NULL,
  customer_email  text,
  issued_at       date NOT NULL DEFAULT CURRENT_DATE,
  due_at          date,
  status          text CHECK (status IN (
                    'draft','sent','paid','overdue','cancelled'
                  )) DEFAULT 'draft',
  tax_type        text CHECK (tax_type IN ('inclusive','exclusive')) DEFAULT 'inclusive',
  subtotal        numeric(15,2) DEFAULT 0,
  tax_amount      numeric(15,2) DEFAULT 0,
  total           numeric(15,2) DEFAULT 0,
  memo            text,
  created_by      uuid REFERENCES auth.users,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- 6. 청구서 품목
CREATE TABLE invoice_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id  uuid REFERENCES invoices ON DELETE CASCADE,
  product_id  uuid REFERENCES products,
  name        text NOT NULL,
  description text,
  quantity    numeric(10,2) DEFAULT 1,
  unit_price  numeric(15,2) DEFAULT 0,
  amount      numeric(15,2) DEFAULT 0,
  sort_order  int DEFAULT 0
);

ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

-- 7. 견적서
CREATE TABLE quotes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid REFERENCES workspaces ON DELETE CASCADE,
  quote_number    text NOT NULL,
  customer_id     uuid REFERENCES customers,
  customer_name   text NOT NULL,
  customer_email  text,
  issued_at       date NOT NULL DEFAULT CURRENT_DATE,
  valid_until     date,
  status          text CHECK (status IN (
                    'draft','sent','accepted','rejected','expired'
                  )) DEFAULT 'draft',
  tax_type        text CHECK (tax_type IN ('inclusive','exclusive')) DEFAULT 'inclusive',
  subtotal        numeric(15,2) DEFAULT 0,
  tax_amount      numeric(15,2) DEFAULT 0,
  total           numeric(15,2) DEFAULT 0,
  memo            text,
  created_by      uuid REFERENCES auth.users,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

-- 8. 견적서 품목
CREATE TABLE quote_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id    uuid REFERENCES quotes ON DELETE CASCADE,
  product_id  uuid REFERENCES products,
  name        text NOT NULL,
  description text,
  quantity    numeric(10,2) DEFAULT 1,
  unit_price  numeric(15,2) DEFAULT 0,
  amount      numeric(15,2) DEFAULT 0,
  sort_order  int DEFAULT 0
);

ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;

-- 9. 신용전표
CREATE TABLE credit_notes (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id         uuid REFERENCES workspaces ON DELETE CASCADE,
  credit_note_number   text NOT NULL,
  original_invoice_id  uuid REFERENCES invoices,
  customer_id          uuid REFERENCES customers,
  customer_name        text NOT NULL,
  customer_email       text,
  issued_at            date NOT NULL DEFAULT CURRENT_DATE,
  status               text CHECK (status IN (
                         'draft','sent','applied'
                       )) DEFAULT 'draft',
  tax_type             text CHECK (tax_type IN ('inclusive','exclusive')) DEFAULT 'inclusive',
  subtotal             numeric(15,2) DEFAULT 0,
  tax_amount           numeric(15,2) DEFAULT 0,
  total                numeric(15,2) DEFAULT 0,
  memo                 text,
  created_by           uuid REFERENCES auth.users,
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now()
);

ALTER TABLE credit_notes ENABLE ROW LEVEL SECURITY;

-- 10. 신용전표 품목
CREATE TABLE credit_note_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_note_id  uuid REFERENCES credit_notes ON DELETE CASCADE,
  product_id      uuid REFERENCES products,
  name            text NOT NULL,
  description     text,
  quantity        numeric(10,2) DEFAULT 1,
  unit_price      numeric(15,2) DEFAULT 0,
  amount          numeric(15,2) DEFAULT 0,
  sort_order      int DEFAULT 0
);

ALTER TABLE credit_note_items ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS 정책 - 워크스페이스 멤버만 접근 가능
-- =============================================

-- 헬퍼: 사용자의 활성 워크스페이스 목록
CREATE OR REPLACE FUNCTION get_my_workspace_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT workspace_id FROM workspace_members
  WHERE user_id = auth.uid() AND status = 'active'
$$;

-- workspaces: 소유자 또는 멤버만
CREATE POLICY "owner_or_member" ON workspaces
  FOR ALL USING (
    owner_id = auth.uid() OR id IN (SELECT get_my_workspace_ids())
  );

-- workspace_members: 같은 워크스페이스 멤버만
CREATE POLICY "workspace_member_access" ON workspace_members
  FOR ALL USING (
    workspace_id IN (SELECT get_my_workspace_ids())
    OR user_id = auth.uid()
  );

-- 나머지 테이블에 동일 패턴
CREATE POLICY "ws_member" ON customers
  FOR ALL USING (workspace_id IN (SELECT get_my_workspace_ids()));

CREATE POLICY "ws_member" ON products
  FOR ALL USING (workspace_id IN (SELECT get_my_workspace_ids()));

CREATE POLICY "ws_member" ON invoices
  FOR ALL USING (workspace_id IN (SELECT get_my_workspace_ids()));

CREATE POLICY "ws_member" ON invoice_items
  FOR ALL USING (
    invoice_id IN (SELECT id FROM invoices WHERE workspace_id IN (SELECT get_my_workspace_ids()))
  );

CREATE POLICY "ws_member" ON quotes
  FOR ALL USING (workspace_id IN (SELECT get_my_workspace_ids()));

CREATE POLICY "ws_member" ON quote_items
  FOR ALL USING (
    quote_id IN (SELECT id FROM quotes WHERE workspace_id IN (SELECT get_my_workspace_ids()))
  );

CREATE POLICY "ws_member" ON credit_notes
  FOR ALL USING (workspace_id IN (SELECT get_my_workspace_ids()));

CREATE POLICY "ws_member" ON credit_note_items
  FOR ALL USING (
    credit_note_id IN (SELECT id FROM credit_notes WHERE workspace_id IN (SELECT get_my_workspace_ids()))
  );

-- =============================================
-- 통계 뷰
-- =============================================
CREATE OR REPLACE VIEW workspace_invoice_stats AS
SELECT
  workspace_id,
  COUNT(*) FILTER (WHERE status = 'paid')    AS paid_count,
  COUNT(*) FILTER (WHERE status = 'overdue') AS overdue_count,
  COUNT(*) FILTER (WHERE status = 'sent')    AS sent_count,
  COUNT(*) FILTER (WHERE status = 'draft')   AS draft_count,
  COALESCE(SUM(total) FILTER (WHERE status = 'paid'), 0)    AS total_revenue,
  COALESCE(SUM(total) FILTER (WHERE status IN ('sent','overdue')), 0) AS total_outstanding,
  COALESCE(SUM(total) FILTER (WHERE status = 'overdue'), 0) AS total_overdue
FROM invoices
GROUP BY workspace_id;

-- 월별 매출 통계 뷰
CREATE OR REPLACE VIEW monthly_revenue AS
SELECT
  workspace_id,
  date_trunc('month', issued_at) AS month,
  COUNT(*) AS invoice_count,
  COALESCE(SUM(total) FILTER (WHERE status = 'paid'), 0) AS paid_total,
  COALESCE(SUM(total), 0) AS total
FROM invoices
WHERE status != 'cancelled'
GROUP BY workspace_id, date_trunc('month', issued_at)
ORDER BY month DESC;

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON quotes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON credit_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
