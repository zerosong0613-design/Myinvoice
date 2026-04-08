export interface Workspace {
  id: string
  name: string
  biz_number: string | null
  owner_id: string
  logo_url: string | null
  address: string | null
  phone: string | null
  email: string | null
  memo: string | null
  created_at: string
}

export interface WorkspaceMember {
  id: string
  workspace_id: string
  user_id: string
  role: 'owner' | 'admin' | 'member'
  invited_email: string | null
  status: 'active' | 'invited'
  joined_at: string | null
}

export interface Customer {
  id: string
  workspace_id: string
  name: string
  email: string | null
  phone: string | null
  biz_number: string | null
  address: string | null
  memo: string | null
  created_at: string
}

export interface Product {
  id: string
  workspace_id: string
  name: string
  unit_price: number
  unit: string | null
  description: string | null
  created_at: string
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
export type TaxType = 'inclusive' | 'exclusive'

export interface Invoice {
  id: string
  workspace_id: string
  invoice_number: string
  customer_id: string | null
  customer_name: string
  customer_email: string | null
  issued_at: string
  due_at: string | null
  status: InvoiceStatus
  tax_type: TaxType
  subtotal: number
  tax_amount: number
  total: number
  memo: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface InvoiceItem {
  id: string
  invoice_id: string
  product_id: string | null
  name: string
  description: string | null
  quantity: number
  unit_price: number
  amount: number
  sort_order: number
}

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'

export interface Quote {
  id: string
  workspace_id: string
  quote_number: string
  customer_id: string | null
  customer_name: string
  customer_email: string | null
  issued_at: string
  valid_until: string | null
  status: QuoteStatus
  tax_type: TaxType
  subtotal: number
  tax_amount: number
  total: number
  memo: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface QuoteItem {
  id: string
  quote_id: string
  product_id: string | null
  name: string
  description: string | null
  quantity: number
  unit_price: number
  amount: number
  sort_order: number
}

export type CreditNoteStatus = 'draft' | 'sent' | 'applied'

export interface CreditNote {
  id: string
  workspace_id: string
  credit_note_number: string
  original_invoice_id: string | null
  customer_id: string | null
  customer_name: string
  customer_email: string | null
  issued_at: string
  status: CreditNoteStatus
  tax_type: TaxType
  subtotal: number
  tax_amount: number
  total: number
  memo: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface CreditNoteItem {
  id: string
  credit_note_id: string
  product_id: string | null
  name: string
  description: string | null
  quantity: number
  unit_price: number
  amount: number
  sort_order: number
}

export interface WorkspaceInvoiceStats {
  workspace_id: string
  paid_count: number
  overdue_count: number
  sent_count: number
  draft_count: number
  total_revenue: number
  total_outstanding: number
  total_overdue: number
}

export interface MonthlyRevenue {
  workspace_id: string
  month: string
  invoice_count: number
  paid_total: number
  total: number
}
