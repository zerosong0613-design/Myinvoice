-- 워크스페이스별 API 키 저장 (암호화는 앱 레벨에서 처리)
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS bolta_api_key text DEFAULT NULL;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS bolta_customer_key text DEFAULT NULL;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS resend_api_key text DEFAULT NULL;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS resend_from_email text DEFAULT NULL;
-- 입금 계좌 기본값
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS bank_name text DEFAULT NULL;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS account_number text DEFAULT NULL;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS account_holder text DEFAULT NULL;
