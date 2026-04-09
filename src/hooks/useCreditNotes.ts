import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useWorkspaceStore } from '@/store/useWorkspaceStore'
import { useAuthStore } from '@/store/useAuthStore'
import { useActivityLog } from '@/hooks/useActivityLog'
import type { CreditNote, CreditNoteItem, CreditNoteStatus, TaxType } from '@/types'

export interface CreditNoteInput {
  customer_id: string | null
  customer_name: string
  customer_email: string | null
  original_invoice_id: string | null
  issued_at: string
  status: CreditNoteStatus
  tax_type: TaxType
  memo: string | null
}

export interface CreditNoteItemInput {
  product_id: string | null
  name: string
  description: string | null
  quantity: number
  unit_price: number
  amount: number
  sort_order: number
}

export function useCreditNotes() {
  const { workspace } = useWorkspaceStore()
  const { user } = useAuthStore()
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { log: activityLog } = useActivityLog()

  const fetchCreditNotes = useCallback(
    async (statusFilter?: string) => {
      if (!workspace) return
      setLoading(true)
      setError(null)
      try {
        let query = supabase
          .from('credit_notes')
          .select('*')
          .eq('workspace_id', workspace.id)
          .order('created_at', { ascending: false })

        if (statusFilter && statusFilter !== 'all') {
          query = query.eq('status', statusFilter)
        }

        const { data, error: fetchError } = await query
        if (fetchError) throw fetchError
        setCreditNotes(data ?? [])
      } catch (err) {
        setError(
          err instanceof Error ? err.message : '신용전표 목록을 불러오지 못했습니다.'
        )
      } finally {
        setLoading(false)
      }
    },
    [workspace]
  )

  const getCreditNote = useCallback(
    async (id: string): Promise<{ creditNote: CreditNote; items: CreditNoteItem[] } | null> => {
      try {
        const [cnRes, itemsRes] = await Promise.all([
          supabase.from('credit_notes').select('*').eq('id', id).single(),
          supabase
            .from('credit_note_items')
            .select('*')
            .eq('credit_note_id', id)
            .order('sort_order'),
        ])

        if (cnRes.error) throw cnRes.error
        if (itemsRes.error) throw itemsRes.error

        return {
          creditNote: cnRes.data as CreditNote,
          items: (itemsRes.data ?? []) as CreditNoteItem[],
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : '신용전표를 불러오지 못했습니다.'
        )
        return null
      }
    },
    []
  )

  const getNextCreditNoteNumber = useCallback(async (): Promise<string> => {
    if (!workspace) return ''

    const now = new Date()
    const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
    const prefix = `CN-${ym}-`

    try {
      const { data } = await supabase
        .from('credit_notes')
        .select('credit_note_number')
        .eq('workspace_id', workspace.id)
        .like('credit_note_number', `${prefix}%`)
        .order('credit_note_number', { ascending: false })
        .limit(1)

      let nextSeq = 1
      if (data && data.length > 0) {
        const lastNum = data[0].credit_note_number
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

  const createCreditNote = useCallback(
    async (
      input: CreditNoteInput,
      items: CreditNoteItemInput[]
    ): Promise<CreditNote | null> => {
      if (!workspace || !user) return null
      setError(null)

      try {
        const creditNoteNumber = await getNextCreditNoteNumber()

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

        const { data: creditNote, error: insertError } = await supabase
          .from('credit_notes')
          .insert({
            workspace_id: workspace.id,
            credit_note_number: creditNoteNumber,
            original_invoice_id: input.original_invoice_id,
            customer_id: input.customer_id,
            customer_name: input.customer_name,
            customer_email: input.customer_email,
            issued_at: input.issued_at,
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

        const cnItems = items.map((item, idx) => ({
          credit_note_id: creditNote.id,
          product_id: item.product_id,
          name: item.name,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          amount: item.amount,
          sort_order: idx,
        }))

        const { error: itemsError } = await supabase
          .from('credit_note_items')
          .insert(cnItems)

        if (itemsError) throw itemsError

        setCreditNotes((prev) => [creditNote as CreditNote, ...prev])
        activityLog('created', 'credit_note', creditNote.id, creditNoteNumber)
        return creditNote as CreditNote
      } catch (err) {
        setError(
          err instanceof Error ? err.message : '신용전표 생성에 실패했습니다.'
        )
        return null
      }
    },
    [workspace, user, getNextCreditNoteNumber]
  )

  const updateCreditNote = useCallback(
    async (
      id: string,
      input: CreditNoteInput,
      items: CreditNoteItemInput[]
    ): Promise<CreditNote | null> => {
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

        const { data: creditNote, error: updateError } = await supabase
          .from('credit_notes')
          .update({
            original_invoice_id: input.original_invoice_id,
            customer_id: input.customer_id,
            customer_name: input.customer_name,
            customer_email: input.customer_email,
            issued_at: input.issued_at,
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

        const { error: deleteError } = await supabase
          .from('credit_note_items')
          .delete()
          .eq('credit_note_id', id)

        if (deleteError) throw deleteError

        const cnItems = items.map((item, idx) => ({
          credit_note_id: id,
          product_id: item.product_id,
          name: item.name,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          amount: item.amount,
          sort_order: idx,
        }))

        if (cnItems.length > 0) {
          const { error: itemsError } = await supabase
            .from('credit_note_items')
            .insert(cnItems)

          if (itemsError) throw itemsError
        }

        setCreditNotes((prev) =>
          prev.map((cn) => (cn.id === id ? (creditNote as CreditNote) : cn))
        )
        return creditNote as CreditNote
      } catch (err) {
        setError(
          err instanceof Error ? err.message : '신용전표 수정에 실패했습니다.'
        )
        return null
      }
    },
    []
  )

  const updateCreditNoteStatus = useCallback(
    async (id: string, status: CreditNoteStatus): Promise<boolean> => {
      setError(null)
      try {
        const { error: updateError } = await supabase
          .from('credit_notes')
          .update({ status })
          .eq('id', id)

        if (updateError) throw updateError

        setCreditNotes((prev) =>
          prev.map((cn) => (cn.id === id ? { ...cn, status } : cn))
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

  const deleteCreditNote = useCallback(async (id: string): Promise<boolean> => {
    setError(null)
    try {
      const { error: deleteError } = await supabase
        .from('credit_notes')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError
      setCreditNotes((prev) => prev.filter((cn) => cn.id !== id))
      return true
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '신용전표 삭제에 실패했습니다.'
      )
      return false
    }
  }, [])

  return {
    creditNotes,
    loading,
    error,
    fetchCreditNotes,
    getCreditNote,
    createCreditNote,
    updateCreditNote,
    updateCreditNoteStatus,
    deleteCreditNote,
    getNextCreditNoteNumber,
  }
}
