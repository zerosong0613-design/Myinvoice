DROP POLICY IF EXISTS "owner_or_member" ON workspaces;
CREATE POLICY "ws_select" ON workspaces FOR SELECT USING (owner_id = auth.uid() OR id IN (SELECT get_my_workspace_ids()));
CREATE POLICY "ws_update" ON workspaces FOR UPDATE USING (owner_id = auth.uid() OR id IN (SELECT get_my_workspace_ids()));
CREATE POLICY "ws_insert" ON workspaces FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "ws_delete" ON workspaces FOR DELETE USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "workspace_member_access" ON workspace_members;
CREATE POLICY "wm_select" ON workspace_members FOR SELECT USING (workspace_id IN (SELECT get_my_workspace_ids()) OR user_id = auth.uid());
CREATE POLICY "wm_insert" ON workspace_members FOR INSERT WITH CHECK (user_id = auth.uid() OR workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));
CREATE POLICY "wm_update" ON workspace_members FOR UPDATE USING (workspace_id IN (SELECT get_my_workspace_ids()));
CREATE POLICY "wm_delete" ON workspace_members FOR DELETE USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "ws_member" ON customers;
CREATE POLICY "cust_select" ON customers FOR SELECT USING (workspace_id IN (SELECT get_my_workspace_ids()));
CREATE POLICY "cust_insert" ON customers FOR INSERT WITH CHECK (workspace_id IN (SELECT get_my_workspace_ids()));
CREATE POLICY "cust_update" ON customers FOR UPDATE USING (workspace_id IN (SELECT get_my_workspace_ids()));
CREATE POLICY "cust_delete" ON customers FOR DELETE USING (workspace_id IN (SELECT get_my_workspace_ids()));

DROP POLICY IF EXISTS "ws_member" ON products;
CREATE POLICY "prod_select" ON products FOR SELECT USING (workspace_id IN (SELECT get_my_workspace_ids()));
CREATE POLICY "prod_insert" ON products FOR INSERT WITH CHECK (workspace_id IN (SELECT get_my_workspace_ids()));
CREATE POLICY "prod_update" ON products FOR UPDATE USING (workspace_id IN (SELECT get_my_workspace_ids()));
CREATE POLICY "prod_delete" ON products FOR DELETE USING (workspace_id IN (SELECT get_my_workspace_ids()));

DROP POLICY IF EXISTS "ws_member" ON invoices;
CREATE POLICY "inv_select" ON invoices FOR SELECT USING (workspace_id IN (SELECT get_my_workspace_ids()));
CREATE POLICY "inv_insert" ON invoices FOR INSERT WITH CHECK (workspace_id IN (SELECT get_my_workspace_ids()));
CREATE POLICY "inv_update" ON invoices FOR UPDATE USING (workspace_id IN (SELECT get_my_workspace_ids()));
CREATE POLICY "inv_delete" ON invoices FOR DELETE USING (workspace_id IN (SELECT get_my_workspace_ids()));

DROP POLICY IF EXISTS "ws_member" ON invoice_items;
CREATE POLICY "inv_items_select" ON invoice_items FOR SELECT USING (invoice_id IN (SELECT id FROM invoices WHERE workspace_id IN (SELECT get_my_workspace_ids())));
CREATE POLICY "inv_items_insert" ON invoice_items FOR INSERT WITH CHECK (invoice_id IN (SELECT id FROM invoices WHERE workspace_id IN (SELECT get_my_workspace_ids())));
CREATE POLICY "inv_items_update" ON invoice_items FOR UPDATE USING (invoice_id IN (SELECT id FROM invoices WHERE workspace_id IN (SELECT get_my_workspace_ids())));
CREATE POLICY "inv_items_delete" ON invoice_items FOR DELETE USING (invoice_id IN (SELECT id FROM invoices WHERE workspace_id IN (SELECT get_my_workspace_ids())));

DROP POLICY IF EXISTS "ws_member" ON quotes;
CREATE POLICY "qt_select" ON quotes FOR SELECT USING (workspace_id IN (SELECT get_my_workspace_ids()));
CREATE POLICY "qt_insert" ON quotes FOR INSERT WITH CHECK (workspace_id IN (SELECT get_my_workspace_ids()));
CREATE POLICY "qt_update" ON quotes FOR UPDATE USING (workspace_id IN (SELECT get_my_workspace_ids()));
CREATE POLICY "qt_delete" ON quotes FOR DELETE USING (workspace_id IN (SELECT get_my_workspace_ids()));

DROP POLICY IF EXISTS "ws_member" ON quote_items;
CREATE POLICY "qt_items_select" ON quote_items FOR SELECT USING (quote_id IN (SELECT id FROM quotes WHERE workspace_id IN (SELECT get_my_workspace_ids())));
CREATE POLICY "qt_items_insert" ON quote_items FOR INSERT WITH CHECK (quote_id IN (SELECT id FROM quotes WHERE workspace_id IN (SELECT get_my_workspace_ids())));
CREATE POLICY "qt_items_update" ON quote_items FOR UPDATE USING (quote_id IN (SELECT id FROM quotes WHERE workspace_id IN (SELECT get_my_workspace_ids())));
CREATE POLICY "qt_items_delete" ON quote_items FOR DELETE USING (quote_id IN (SELECT id FROM quotes WHERE workspace_id IN (SELECT get_my_workspace_ids())));

DROP POLICY IF EXISTS "ws_member" ON credit_notes;
CREATE POLICY "cn_select" ON credit_notes FOR SELECT USING (workspace_id IN (SELECT get_my_workspace_ids()));
CREATE POLICY "cn_insert" ON credit_notes FOR INSERT WITH CHECK (workspace_id IN (SELECT get_my_workspace_ids()));
CREATE POLICY "cn_update" ON credit_notes FOR UPDATE USING (workspace_id IN (SELECT get_my_workspace_ids()));
CREATE POLICY "cn_delete" ON credit_notes FOR DELETE USING (workspace_id IN (SELECT get_my_workspace_ids()));

DROP POLICY IF EXISTS "ws_member" ON credit_note_items;
CREATE POLICY "cn_items_select" ON credit_note_items FOR SELECT USING (credit_note_id IN (SELECT id FROM credit_notes WHERE workspace_id IN (SELECT get_my_workspace_ids())));
CREATE POLICY "cn_items_insert" ON credit_note_items FOR INSERT WITH CHECK (credit_note_id IN (SELECT id FROM credit_notes WHERE workspace_id IN (SELECT get_my_workspace_ids())));
CREATE POLICY "cn_items_update" ON credit_note_items FOR UPDATE USING (credit_note_id IN (SELECT id FROM credit_notes WHERE workspace_id IN (SELECT get_my_workspace_ids())));
CREATE POLICY "cn_items_delete" ON credit_note_items FOR DELETE USING (credit_note_id IN (SELECT id FROM credit_notes WHERE workspace_id IN (SELECT get_my_workspace_ids())));
