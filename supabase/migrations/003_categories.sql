CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces ON DELETE CASCADE,
  name text NOT NULL,
  parent_id uuid REFERENCES categories ON DELETE CASCADE,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cat_select" ON categories FOR SELECT USING (workspace_id IN (SELECT get_my_workspace_ids()));
CREATE POLICY "cat_insert" ON categories FOR INSERT WITH CHECK (workspace_id IN (SELECT get_my_workspace_ids()));
CREATE POLICY "cat_update" ON categories FOR UPDATE USING (workspace_id IN (SELECT get_my_workspace_ids()));
CREATE POLICY "cat_delete" ON categories FOR DELETE USING (workspace_id IN (SELECT get_my_workspace_ids()));

ALTER TABLE products ADD COLUMN category_id uuid REFERENCES categories ON DELETE SET NULL;
