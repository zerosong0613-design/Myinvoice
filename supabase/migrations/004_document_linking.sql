-- 문서 간 연동을 위한 컬럼 추가
-- invoices 테이블에 원본 견적서 참조 추가
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS source_quote_id uuid REFERENCES quotes(id) ON DELETE SET NULL;

-- quotes 테이블에 변환된 청구서 참조 추가
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS converted_invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_invoices_source_quote_id ON invoices(source_quote_id);
CREATE INDEX IF NOT EXISTS idx_quotes_converted_invoice_id ON quotes(converted_invoice_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_original_invoice_id ON credit_notes(original_invoice_id);
