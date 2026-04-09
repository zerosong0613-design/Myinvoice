-- 지급요청서 테이블
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
  -- 금액
  subtotal integer NOT NULL DEFAULT 0,
  withholding_tax integer NOT NULL DEFAULT 0,
  net_amount integer NOT NULL DEFAULT 0,
  -- 원천세 옵션
  withholding_rate numeric(5,2) NOT NULL DEFAULT 3.3,
  -- 입금 계좌
  bank_name text,
  account_number text,
  account_holder text,
  -- 기타
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

CREATE POLICY "Members can manage payment_requests"
  ON payment_requests FOR ALL
  USING (workspace_id IN (SELECT get_my_workspace_ids()));

CREATE POLICY "Members can manage payment_request_items"
  ON payment_request_items FOR ALL
  USING (payment_request_id IN (
    SELECT id FROM payment_requests WHERE workspace_id IN (SELECT get_my_workspace_ids())
  ));
