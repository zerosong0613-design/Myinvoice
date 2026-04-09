import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useWorkspaceStore } from '@/store/useWorkspaceStore'
import { useAuthStore } from '@/store/useAuthStore'
import { useActivityLog } from '@/hooks/useActivityLog'
import type { PaymentRequest, PaymentRequestItem, PaymentRequestStatus } from '@/types'

export interface PaymentRequestInput {
  customer_id: string | null
  customer_name: string
  customer_email: string | null
  customer_biz_number: string | null
  issued_at: string
  due_at: string | null
  status: PaymentRequestStatus
  withholding_rate: number
  bank_name: string | null
  account_number: string | null
  account_holder: string | null
  memo: string | null
}

export interface PaymentRequestItemInput {
  name: string
  description: string | null
  quantity: number
  unit_price: number
  amount: number
  sort_order: number
}

export function usePaymentRequests() {
  const { workspace } = useWorkspaceStore()
  const { user } = useAuthStore()
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { log: activityLog } = useActivityLog()

  const fetchPaymentRequests = useCallback(
    async (statusFilter?: string) => {
      if (!workspace) return
      setLoading(true)
      setError(null)
      try {
        let query = supabase
          .from('payment_requests')
          .select('*')
          .eq('workspace_id', workspace.id)
          .order('created_at', { ascending: false })

        if (statusFilter && statusFilter !== 'all') {
          query = query.eq('status', statusFilter)
        }
        const { data, error: e } = await query
        if (e) throw e
        setPaymentRequests(data ?? [])
      } catch (err) {
        setError(err instanceof Error ? err.message : '목록을 불러오지 못했습니다.')
      } finally {
        setLoading(false)
      }
    },
    [workspace]
  )

  const getPaymentRequest = useCallback(
    async (id: string): Promise<{ pr: PaymentRequest; items: PaymentRequestItem[] } | null> => {
      try {
        const [prRes, itemsRes] = await Promise.all([
          supabase.from('payment_requests').select('*').eq('id', id).single(),
          supabase.from('payment_request_items').select('*').eq('payment_request_id', id).order('sort_order'),
        ])
        if (prRes.error) throw prRes.error
        return { pr: prRes.data as PaymentRequest, items: (itemsRes.data ?? []) as PaymentRequestItem[] }
      } catch (err) {
        setError(err instanceof Error ? err.message : '불러오지 못했습니다.')
        return null
      }
    },
    []
  )

  const getNextNumber = useCallback(async (): Promise<string> => {
    if (!workspace) return ''
    const now = new Date()
    const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
    const prefix = `PR-${ym}-`
    try {
      const { data } = await supabase
        .from('payment_requests')
        .select('request_number')
        .eq('workspace_id', workspace.id)
        .like('request_number', `${prefix}%`)
        .order('request_number', { ascending: false })
        .limit(1)
      let seq = 1
      if (data?.[0]) {
        const last = parseInt(data[0].request_number.replace(prefix, ''), 10)
        if (!isNaN(last)) seq = last + 1
      }
      return `${prefix}${String(seq).padStart(3, '0')}`
    } catch {
      return `${prefix}001`
    }
  }, [workspace])

  const createPaymentRequest = useCallback(
    async (input: PaymentRequestInput, items: PaymentRequestItemInput[]): Promise<PaymentRequest | null> => {
      if (!workspace || !user) return null
      setError(null)
      try {
        const requestNumber = await getNextNumber()
        const subtotal = items.reduce((s, i) => s + i.amount, 0)
        const withholdingTax = Math.round(subtotal * input.withholding_rate / 100)
        const netAmount = subtotal - withholdingTax

        const { data, error: e } = await supabase
          .from('payment_requests')
          .insert({
            workspace_id: workspace.id,
            request_number: requestNumber,
            customer_id: input.customer_id,
            customer_name: input.customer_name,
            customer_email: input.customer_email,
            customer_biz_number: input.customer_biz_number,
            issued_at: input.issued_at,
            due_at: input.due_at,
            status: input.status,
            subtotal,
            withholding_tax: withholdingTax,
            net_amount: netAmount,
            withholding_rate: input.withholding_rate,
            bank_name: input.bank_name,
            account_number: input.account_number,
            account_holder: input.account_holder,
            memo: input.memo,
            created_by: user.id,
          })
          .select()
          .single()

        if (e) throw e

        const prItems = items.map((item, idx) => ({
          payment_request_id: data.id,
          name: item.name,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          amount: item.amount,
          sort_order: idx,
        }))
        if (prItems.length) {
          const { error: ie } = await supabase.from('payment_request_items').insert(prItems)
          if (ie) throw ie
        }

        activityLog('created', 'invoice', data.id, requestNumber)
        setPaymentRequests((prev) => [data as PaymentRequest, ...prev])
        return data as PaymentRequest
      } catch (err) {
        setError(err instanceof Error ? err.message : '생성에 실패했습니다.')
        return null
      }
    },
    [workspace, user, getNextNumber, activityLog]
  )

  const updatePaymentRequestStatus = useCallback(
    async (id: string, status: PaymentRequestStatus): Promise<boolean> => {
      setError(null)
      try {
        const { error: e } = await supabase
          .from('payment_requests')
          .update({ status })
          .eq('id', id)
        if (e) throw e
        setPaymentRequests((prev) => prev.map((pr) => (pr.id === id ? { ...pr, status } : pr)))
        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : '상태 변경 실패')
        return false
      }
    },
    []
  )

  const deletePaymentRequest = useCallback(async (id: string): Promise<boolean> => {
    setError(null)
    try {
      const { error: e } = await supabase.from('payment_requests').delete().eq('id', id)
      if (e) throw e
      setPaymentRequests((prev) => prev.filter((pr) => pr.id !== id))
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : '삭제 실패')
      return false
    }
  }, [])

  return {
    paymentRequests, loading, error,
    fetchPaymentRequests, getPaymentRequest, createPaymentRequest,
    updatePaymentRequestStatus, deletePaymentRequest, getNextNumber,
  }
}
