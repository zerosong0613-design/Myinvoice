import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useWorkspaceStore } from '@/store/useWorkspaceStore'
import { useAuthStore } from '@/store/useAuthStore'
import { useActivityLog } from '@/hooks/useActivityLog'
import type { Quote, QuoteItem, QuoteStatus, TaxType } from '@/types'

export interface QuoteInput {
  customer_id: string | null
  customer_name: string
  customer_email: string | null
  issued_at: string
  valid_until: string | null
  status: QuoteStatus
  tax_type: TaxType
  memo: string | null
}

export interface QuoteItemInput {
  product_id: string | null
  name: string
  description: string | null
  quantity: number
  unit_price: number
  amount: number
  sort_order: number
}

export function useQuotes() {
  const { workspace } = useWorkspaceStore()
  const { user } = useAuthStore()
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { log: activityLog } = useActivityLog()

  const fetchQuotes = useCallback(
    async (statusFilter?: string) => {
      if (!workspace) return
      setLoading(true)
      setError(null)
      try {
        let query = supabase
          .from('quotes')
          .select('*')
          .eq('workspace_id', workspace.id)
          .order('created_at', { ascending: false })

        if (statusFilter && statusFilter !== 'all') {
          query = query.eq('status', statusFilter)
        }

        const { data, error: fetchError } = await query
        if (fetchError) throw fetchError
        setQuotes(data ?? [])
      } catch (err) {
        setError(
          err instanceof Error ? err.message : '견적서 목록을 불러오지 못했습니다.'
        )
      } finally {
        setLoading(false)
      }
    },
    [workspace]
  )

  const getQuote = useCallback(
    async (id: string): Promise<{ quote: Quote; items: QuoteItem[] } | null> => {
      try {
        const [quoteRes, itemsRes] = await Promise.all([
          supabase.from('quotes').select('*').eq('id', id).single(),
          supabase
            .from('quote_items')
            .select('*')
            .eq('quote_id', id)
            .order('sort_order'),
        ])

        if (quoteRes.error) throw quoteRes.error
        if (itemsRes.error) throw itemsRes.error

        return {
          quote: quoteRes.data as Quote,
          items: (itemsRes.data ?? []) as QuoteItem[],
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : '견적서를 불러오지 못했습니다.'
        )
        return null
      }
    },
    []
  )

  const getNextQuoteNumber = useCallback(async (): Promise<string> => {
    if (!workspace) return ''

    const now = new Date()
    const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
    const prefix = `QT-${ym}-`

    try {
      const { data } = await supabase
        .from('quotes')
        .select('quote_number')
        .eq('workspace_id', workspace.id)
        .like('quote_number', `${prefix}%`)
        .order('quote_number', { ascending: false })
        .limit(1)

      let nextSeq = 1
      if (data && data.length > 0) {
        const lastNum = data[0].quote_number
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

  const createQuote = useCallback(
    async (
      input: QuoteInput,
      items: QuoteItemInput[]
    ): Promise<Quote | null> => {
      if (!workspace || !user) return null
      setError(null)

      try {
        const quoteNumber = await getNextQuoteNumber()

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

        const { data: quote, error: insertError } = await supabase
          .from('quotes')
          .insert({
            workspace_id: workspace.id,
            quote_number: quoteNumber,
            customer_id: input.customer_id,
            customer_name: input.customer_name,
            customer_email: input.customer_email,
            issued_at: input.issued_at,
            valid_until: input.valid_until,
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

        const quoteItems = items.map((item, idx) => ({
          quote_id: quote.id,
          product_id: item.product_id,
          name: item.name,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          amount: item.amount,
          sort_order: idx,
        }))

        const { error: itemsError } = await supabase
          .from('quote_items')
          .insert(quoteItems)

        if (itemsError) throw itemsError

        setQuotes((prev) => [quote as Quote, ...prev])
        activityLog('created', 'quote', quote.id, quoteNumber)
        return quote as Quote
      } catch (err) {
        setError(
          err instanceof Error ? err.message : '견적서 생성에 실패했습니다.'
        )
        return null
      }
    },
    [workspace, user, getNextQuoteNumber]
  )

  const updateQuote = useCallback(
    async (
      id: string,
      input: QuoteInput,
      items: QuoteItemInput[]
    ): Promise<Quote | null> => {
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

        const { data: quote, error: updateError } = await supabase
          .from('quotes')
          .update({
            customer_id: input.customer_id,
            customer_name: input.customer_name,
            customer_email: input.customer_email,
            issued_at: input.issued_at,
            valid_until: input.valid_until,
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
          .from('quote_items')
          .delete()
          .eq('quote_id', id)

        if (deleteError) throw deleteError

        const quoteItems = items.map((item, idx) => ({
          quote_id: id,
          product_id: item.product_id,
          name: item.name,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          amount: item.amount,
          sort_order: idx,
        }))

        if (quoteItems.length > 0) {
          const { error: itemsError } = await supabase
            .from('quote_items')
            .insert(quoteItems)

          if (itemsError) throw itemsError
        }

        setQuotes((prev) =>
          prev.map((q) => (q.id === id ? (quote as Quote) : q))
        )
        return quote as Quote
      } catch (err) {
        setError(
          err instanceof Error ? err.message : '견적서 수정에 실패했습니다.'
        )
        return null
      }
    },
    []
  )

  const updateQuoteStatus = useCallback(
    async (id: string, status: QuoteStatus): Promise<boolean> => {
      setError(null)
      try {
        const { error: updateError } = await supabase
          .from('quotes')
          .update({ status })
          .eq('id', id)

        if (updateError) throw updateError

        setQuotes((prev) =>
          prev.map((q) => (q.id === id ? { ...q, status } : q))
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

  const deleteQuote = useCallback(async (id: string): Promise<boolean> => {
    setError(null)
    try {
      const { error: deleteError } = await supabase
        .from('quotes')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError
      setQuotes((prev) => prev.filter((q) => q.id !== id))
      return true
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '견적서 삭제에 실패했습니다.'
      )
      return false
    }
  }, [])

  return {
    quotes,
    loading,
    error,
    fetchQuotes,
    getQuote,
    createQuote,
    updateQuote,
    updateQuoteStatus,
    deleteQuote,
    getNextQuoteNumber,
  }
}
