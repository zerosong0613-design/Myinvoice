CREATE TABLE workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  biz_number text,
  owner_id uuid REFERENCES auth.users NOT NULL,
  logo_url text,
  address text,
  phone text,
  email text,
  memo text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

CREATE TABLE workspace_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE,
  role text CHECK (role IN ('owner','admin','member')) DEFAULT 'member',
  invited_email text,
  status text CHECK (status IN ('active','invited')) DEFAULT 'invited',
  joined_at timestamptz,
  UNIQUE (workspace_id, user_id)
);
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  biz_number text,
  address text,
  memo text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces ON DELETE CASCADE,
  name text NOT NULL,
  unit_price numeric(15,2) DEFAULT 0,
  unit text,
  description text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE TABLE invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces ON DELETE CASCADE,
  invoice_number text NOT NULL,
  customer_id uuid REFERENCES customers,
  customer_name text NOT NULL,
  customer_email text,
  issued_at date NOT NULL DEFAULT CURRENT_DATE,
  due_at date,
  status text CHECK (status IN ('draft','sent','paid','overdue','cancelled')) DEFAULT 'draft',
  tax_type text CHECK (tax_type IN ('inclusive','exclusive')) DEFAULT 'inclusive',
  subtotal numeric(15,2) DEFAULT 0,
  tax_amount numeric(15,2) DEFAULT 0,
  total numeric(15,2) DEFAULT 0,
  memo text,
  created_by uuid REFERENCES auth.users,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE TABLE invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES invoices ON DELETE CASCADE,
  product_id uuid REFERENCES products,
  name text NOT NULL,
  description text,
  quantity numeric(10,2) DEFAULT 1,
  unit_price numeric(15,2) DEFAULT 0,
  amount numeric(15,2) DEFAULT 0,
  sort_order int DEFAULT 0
);
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

CREATE TABLE quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces ON DELETE CASCADE,
  quote_number text NOT NULL,
  customer_id uuid REFERENCES customers,
  customer_name text NOT NULL,
  customer_email text,
  issued_at date NOT NULL DEFAULT CURRENT_DATE,
  valid_until date,
  status text CHECK (status IN ('draft','sent','accepted','rejected','expired')) DEFAULT 'draft',
  tax_type text CHECK (tax_type IN ('inclusive','exclusive')) DEFAULT 'inclusive',
  subtotal numeric(15,2) DEFAULT 0,
  tax_amount numeric(15,2) DEFAULT 0,
  total numeric(15,2) DEFAULT 0,
  memo text,
  created_by uuid REFERENCES auth.users,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

CREATE TABLE quote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid REFERENCES quotes ON DELETE CASCADE,
  product_id uuid REFERENCES products,
  name text NOT NULL,
  description text,
  quantity numeric(10,2) DEFAULT 1,
  unit_price numeric(15,2) DEFAULT 0,
  amount numeric(15,2) DEFAULT 0,
  sort_order int DEFAULT 0
);
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;

CREATE TABLE credit_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces ON DELETE CASCADE,
  credit_note_number text NOT NULL,
  original_invoice_id uuid REFERENCES invoices,
  customer_id uuid REFERENCES customers,
  customer_name text NOT NULL,
  customer_email text,
  issued_at date NOT NULL DEFAULT CURRENT_DATE,
  status text CHECK (status IN ('draft','sent','applied')) DEFAULT 'draft',
  tax_type text CHECK (tax_type IN ('inclusive','exclusive')) DEFAULT 'inclusive',
  subtotal numeric(15,2) DEFAULT 0,
  tax_amount numeric(15,2) DEFAULT 0,
  total numeric(15,2) DEFAULT 0,
  memo text,
  created_by uuid REFERENCES auth.users,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE credit_notes ENABLE ROW LEVEL SECURITY;

CREATE TABLE credit_note_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_note_id uuid REFERENCES credit_notes ON DELETE CASCADE,
  product_id uuid REFERENCES products,
  name text NOT NULL,
  description text,
  quantity numeric(10,2) DEFAULT 1,
  unit_price numeric(15,2) DEFAULT 0,
  amount numeric(15,2) DEFAULT 0,
  sort_order int DEFAULT 0
);
ALTER TABLE credit_note_items ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION get_my_workspace_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT workspace_id FROM workspace_members
  WHERE user_id = auth.uid() AND status = 'active'
$$;

CREATE POLICY "ws_select" ON workspaces FOR SELECT USING (owner_id = auth.uid() OR id IN (SELECT get_my_workspace_ids()));
CREATE POLICY "ws_update" ON workspaces FOR UPDATE USING (owner_id = auth.uid() OR id IN (SELECT get_my_workspace_ids()));
CREATE POLICY "ws_insert" ON workspaces FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "ws_delete" ON workspaces FOR DELETE USING (owner_id = auth.uid());

CREATE POLICY "wm_select" ON workspace_members FOR SELECT USING (workspace_id IN (SELECT get_my_workspace_ids()) OR user_id = auth.uid());
CREATE POLICY "wm_insert" ON workspace_members FOR INSERT WITH CHECK (user_id = auth.uid() OR workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
CREATE POLICY "wm_update" ON workspace_members FOR UPDATE USING (workspace_id IN (SELECT get_my_workspace_ids()));
CREATE POLICY "wm_delete" ON workspace_members FOR DELETE USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

CREATE POLICY "cust_select" ON customers FOR SELECT USING (workspace_id IN (SELECT get_my_workspace_ids()));
CREATE POLICY "cust_insert" ON customers FOR INSERT WITH CHECK (workspace_id IN (SELECT get_my_workspace_ids()));
CREATE POLICY "cust_update" ON customers FOR UPDATE USING (workspace_id IN (SELECT get_my_workspace_ids()));
CREATE POLICY "cust_delete" ON customers FOR DELETE USING (workspace_id IN (SELECT get_my_workspace_ids()));

CREATE POLICY "prod_select" ON products FOR SELECT USING (workspace_id IN (SELECT get_my_workspace_ids()));
CREATE POLICY "prod_insert" ON products FOR INSERT WITH CHECK (workspace_id IN (SELECT get_my_workspace_ids()));
CREATE POLICY "prod_update" ON products FOR UPDATE USING (workspace_id IN (SELECT get_my_workspace_ids()));
CREATE POLICY "prod_delete" ON products FOR DELETE USING (workspace_id IN (SELECT get_my_workspace_ids()));

CREATE POLICY "inv_select" ON invoices FOR SELECT USING (workspace_id IN (SELECT get_my_workspace_ids()));
CREATE POLICY "inv_insert" ON invoices FOR INSERT WITH CHECK (workspace_id IN (SELECT get_my_workspace_ids()));
CREATE POLICY "inv_update" ON invoices FOR UPDATE USING (workspace_id IN (SELECT get_my_workspace_ids()));
CREATE POLICY "inv_delete" ON invoices FOR DELETE USING (workspace_id IN (SELECT get_my_workspace_ids()));

CREATE POLICY "inv_items_select" ON invoice_items FOR SELECT USING (invoice_id IN (SELECT id FROM invoices WHERE workspace_id IN (SELECT get_my_workspace_ids())));
CREATE POLICY "inv_items_insert" ON invoice_items FOR INSERT WITH CHECK (invoice_id IN (SELECT id FROM invoices WHERE workspace_id IN (SELECT get_my_workspace_ids())));
CREATE POLICY "inv_items_update" ON invoice_items FOR UPDATE USING (invoice_id IN (SELECT id FROM invoices WHERE workspace_id IN (SELECT get_my_workspace_ids())));
CREATE POLICY "inv_items_delete" ON invoice_items FOR DELETE USING (invoice_id IN (SELECT id FROM invoices WHERE workspace_id IN (SELECT get_my_workspace_ids())));

CREATE POLICY "qt_select" ON quotes FOR SELECT USING (workspace_id IN (SELECT get_my_workspace_ids()));
CREATE POLICY "qt_insert" ON quotes FOR INSERT WITH CHECK (workspace_id IN (SELECT get_my_workspace_ids()));
CREATE POLICY "qt_update" ON quotes FOR UPDATE USING (workspace_id IN (SELECT get_my_workspace_ids()));
CREATE POLICY "qt_delete" ON quotes FOR DELETE USING (workspace_id IN (SELECT get_my_workspace_ids()));

CREATE POLICY "qt_items_select" ON quote_items FOR SELECT USING (quote_id IN (SELECT id FROM quotes WHERE workspace_id IN (SELECT get_my_workspace_ids())));
CREATE POLICY "qt_items_insert" ON quote_items FOR INSERT WITH CHECK (quote_id IN (SELECT id FROM quotes WHERE workspace_id IN (SELECT get_my_workspace_ids())));
CREATE POLICY "qt_items_update" ON quote_items FOR UPDATE USING (quote_id IN (SELECT id FROM quotes WHERE workspace_id IN (SELECT get_my_workspace_ids())));
CREATE POLICY "qt_items_delete" ON quote_items FOR DELETE USING (quote_id IN (SELECT id FROM quotes WHERE workspace_id IN (SELECT get_my_workspace_ids())));

CREATE POLICY "cn_select" ON credit_notes FOR SELECT USING (workspace_id IN (SELECT get_my_workspace_ids()));
CREATE POLICY "cn_insert" ON credit_notes FOR INSERT WITH CHECK (workspace_id IN (SELECT get_my_workspace_ids()));
CREATE POLICY "cn_update" ON credit_notes FOR UPDATE USING (workspace_id IN (SELECT get_my_workspace_ids()));
CREATE POLICY "cn_delete" ON credit_notes FOR DELETE USING (workspace_id IN (SELECT get_my_workspace_ids()));

CREATE POLICY "cn_items_select" ON credit_note_items FOR SELECT USING (credit_note_id IN (SELECT id FROM credit_notes WHERE workspace_id IN (SELECT get_my_workspace_ids())));
CREATE POLICY "cn_items_insert" ON credit_note_items FOR INSERT WITH CHECK (credit_note_id IN (SELECT id FROM credit_notes WHERE workspace_id IN (SELECT get_my_workspace_ids())));
CREATE POLICY "cn_items_update" ON credit_note_items FOR UPDATE USING (credit_note_id IN (SELECT id FROM credit_notes WHERE workspace_id IN (SELECT get_my_workspace_ids())));
CREATE POLICY "cn_items_delete" ON credit_note_items FOR DELETE USING (credit_note_id IN (SELECT id FROM credit_notes WHERE workspace_id IN (SELECT get_my_workspace_ids())));

CREATE OR REPLACE VIEW workspace_invoice_stats AS
SELECT
  workspace_id,
  COUNT(*) FILTER (WHERE status = 'paid') AS paid_count,
  COUNT(*) FILTER (WHERE status = 'overdue') AS overdue_count,
  COUNT(*) FILTER (WHERE status = 'sent') AS sent_count,
  COUNT(*) FILTER (WHERE status = 'draft') AS draft_count,
  COALESCE(SUM(total) FILTER (WHERE status = 'paid'), 0) AS total_revenue,
  COALESCE(SUM(total) FILTER (WHERE status IN ('sent','overdue')), 0) AS total_outstanding,
  COALESCE(SUM(total) FILTER (WHERE status = 'overdue'), 0) AS total_overdue
FROM invoices
GROUP BY workspace_id;

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

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON quotes FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON credit_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at();
