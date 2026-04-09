-- 품목에 서비스 유형 추가
ALTER TABLE products ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'product' CHECK (type IN ('product', 'service'));
ALTER TABLE products ADD COLUMN IF NOT EXISTS rate_type text NOT NULL DEFAULT 'unit' CHECK (rate_type IN ('unit', 'hourly', 'daily', 'monthly', 'project'));

-- 청구서/견적서/신용전표 품목에 수행자 필드 추가
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS performer text DEFAULT NULL;
ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS performer text DEFAULT NULL;
ALTER TABLE credit_note_items ADD COLUMN IF NOT EXISTS performer text DEFAULT NULL;
ALTER TABLE payment_request_items ADD COLUMN IF NOT EXISTS performer text DEFAULT NULL;
