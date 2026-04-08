import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useWorkspaceStore } from '@/store/useWorkspaceStore'
import { useAuthStore } from '@/store/useAuthStore'
import type { Invoice, InvoiceItem, InvoiceStatus, TaxType } from '@/types'

export interface InvoiceInput {
  customer_id: string | null
  customer_name: string
  customer_email: string | null
  issued_at: string
  due_at: string | null
  status: InvoiceStatus
  tax_type: TaxType
  memo: string | null
}

export interface InvoiceItemInput {
  product_id: string | null
  name: string
  description: string | null
  quantity: number
  unit_price: number
  amount: number
  sort_order: number
}

export function useInvoices() {
  const { workspace } = useWorkspaceStore()
  const { user } = useAuthStore()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchInvoices = useCallback(
    async (statusFilter?: string) => {
      if (!workspace) return
      setLoading(true)
      setError(null)
      try {
        let query = supabase
          .from('invoices')
          .select('*')
          .eq('workspace_id', workspace.id)
          .order('created_at', { ascending: false })

        if (statusFilter && statusFilter !== 'all') {
          query = query.eq('status', statusFilter)
        }

        const { data, error: fetchError } = await query
        if (fetchError) throw fetchError
        setInvoices(data ?? [])
      } catch (err) {
        setError(
          err instanceof Error ? err.message : '청구서 목록을 불러오지 못했습니다.'
        )
      } finally {
        setLoading(false)
      }
    },
    [workspace]
  )

  const getInvoice = useCallback(
    async (id: string): Promise<{ invoice: Invoice; items: InvoiceItem[] } | null> => {
      try {
        const [invoiceRes, itemsRes] = await Promise.all([
          supabase.from('invoices').select('*').eq('id', id).single(),
          supabase
            .from('invoice_items')
            .select('*')
            .eq('invoice_id', id)
            .order('sort_order'),
        ])

        if (invoiceRes.error) throw invoiceRes.error
        if (itemsRes.error) throw itemsRes.error

        return {
          invoice: invoiceRes.data as Invoice,
          items: (itemsRes.data ?? []) as InvoiceItem[],
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : '청구서를 불러오지 못했습니다.'
        )
        return null
      }
    },
    []
  )

  const getNextInvoiceNumber = useCallback(async (): Promise<string> => {
    if (!workspace) return ''

    const now = new Date()
    const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
    const prefix = `INV-${ym}-`

    try {
      const { data } = await supabase
        .from('invoices')
        .select('invoice_number')
        .eq('workspace_id', workspace.id)
        .like('invoice_number', `${prefix}%`)
        .order('invoice_number', { ascending: false })
        .limit(1)

      let nextSeq = 1
      if (data && data.length > 0) {
        const lastNum = data[0].invoice_number
        const lastSeq = parseInt(lastNum.replace(prefix, ''), 10)
        if (!isNaN(lastSeq)) {
          nextSeq = lastSeq + 1
        }
      }

      return `${prefix}${String(nextSeq).padStart(3, '0')}`
    } catch {
      return `${prefix}001`
    }
  }, [workspace])

  const createInvoice = useCallback(
    async (
      input: InvoiceInput,
      items: InvoiceItemInput[]
    ): Promise<Invoice | null> => {
      if (!workspace || !user) return null
      setError(null)

      try {
        const invoiceNumber = await getNextInvoiceNumber()

        // Calculate totals from items
        const subtotalRaw = items.reduce((sum, item) => sum + item.amount, 0)
        let subtotal: number
        let taxAmount: number
        let total: number

        if (input.tax_type === 'inclusive') {
          total = subtotalRaw
          taxAmount = Math.round(total - total / 1.1)
          subtotal = total - taxAmount
        } else {
          subtotal = subtotalRaw
          taxAmount = Math.round(subtotal * 0.1)
          total = subtotal + taxAmount
        }

        const { data: invoice, error: insertError } = await supabase
          .from('invoices')
          .insert({
            workspace_id: workspace.id,
            invoice_number: invoiceNumber,
            customer_id: input.customer_id,
            customer_name: input.customer_name,
            customer_email: input.customer_email,
            issued_at: input.issued_at,
            due_at: input.due_at,
            status: input.status,
            tax_type: input.tax_type,
            subtotal,
            tax_amount: taxAmount,
            total,
            memo: input.memo,
            created_by: user.id,
          })
          .select()
          .single()

        if (insertError) throw insertError

        // Insert items
        const invoiceItems = items.map((item, idx) => ({
          invoice_id: invoice.id,
          product_id: item.product_id,
          name: item.name,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          amount: item.amount,
          sort_order: idx,
        }))

        const { error: itemsError } = await supabase
          .from('invoice_items')
          .insert(invoiceItems)

        if (itemsError) throw itemsError

        setInvoices((prev) => [invoice as Invoice, ...prev])
        return invoice as Invoice
      } catch (err) {
        setError(
          err instanceof Error ? err.message : '청구서 생성에 실패했습니다.'
        )
        return null
      }
    },
    [workspace, user, getNextInvoiceNumber]
  )

  const updateInvoice = useCallback(
    async (
      id: string,
      input: InvoiceInput,
      items: InvoiceItemInput[]
    ): Promise<Invoice | null> => {
      setError(null)

      try {
        const subtotalRaw = items.reduce((sum, item) => sum + item.amount, 0)
        let subtotal: number
        let taxAmount: number
        let total: number

        if (input.tax_type === 'inclusive') {
          total = subtotalRaw
          taxAmount = Math.round(total - total / 1.1)
          subtotal = total - taxAmount
        } else {
          subtotal = subtotalRaw
          taxAmount = Math.round(subtotal * 0.1)
          total = subtotal + taxAmount
        }

        const { data: invoice, error: updateError } = await supabase
          .from('invoices')
          .update({
            customer_id: input.customer_id,
            customer_name: input.customer_name,
            customer_email: input.customer_email,
            issued_at: input.issued_at,
            due_at: input.due_at,
            status: input.status,
            tax_type: input.tax_type,
            subtotal,
            tax_amount: taxAmount,
            total,
            memo: input.memo,
          })
          .eq('id', id)
          .select()
          .single()

        if (updateError) throw updateError

        // Delete old items, then insert new ones
        const { error: deleteError } = await supabase
          .from('invoice_items')
          .delete()
          .eq('invoice_id', id)

        if (deleteError) throw deleteError

        const invoiceItems = items.map((item, idx) => ({
          invoice_id: id,
          product_id: item.product_id,
          name: item.name,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          amount: item.amount,
          sort_order: idx,
        }))

        if (invoiceItems.length > 0) {
          const { error: itemsError } = await supabase
            .from('invoice_items')
            .insert(invoiceItems)

          if (itemsError) throw itemsError
        }

        setInvoices((prev) =>
          prev.map((inv) => (inv.id === id ? (invoice as Invoice) : inv))
        )
        return invoice as Invoice
      } catch (err) {
        setError(
          err instanceof Error ? err.message : '청구서 수정에 실패했습니다.'
        )
        return null
      }
    },
    []
  )

  const updateInvoiceStatus = useCallback(
    async (id: string, status: InvoiceStatus): Promise<boolean> => {
      setError(null)
      try {
        const { error: updateError } = await supabase
          .from('invoices')
          .update({ status })
          .eq('id', id)

        if (updateError) throw updateError

        setInvoices((prev) =>
          prev.map((inv) => (inv.id === id ? { ...inv, status } : inv))
        )
        return true
      } catch (err) {
        setError(
          err instanceof Error ? err.message : '상태 변경에 실패했습니다.'
        )
        return false
      }
    },
    []
  )

  const deleteInvoice = useCallback(async (id: string): Promise<boolean> => {
    setError(null)
    try {
      const { error: deleteError } = await supabase
        .from('invoices')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError
      setInvoices((prev) => prev.filter((inv) => inv.id !== id))
      return true
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '청구서 삭제에 실패했습니다.'
      )
      return false
    }
  }, [])

  return {
    invoices,
    loading,
    error,
    fetchInvoices,
    getInvoice,
    createInvoice,
    updateInvoice,
    updateInvoiceStatus,
    deleteInvoice,
    getNextInvoiceNumber,
  }
}
