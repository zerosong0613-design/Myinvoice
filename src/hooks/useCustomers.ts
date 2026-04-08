import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useWorkspaceStore } from '@/store/useWorkspaceStore'
import type { Customer } from '@/types'

type CustomerInput = Omit<Customer, 'id' | 'workspace_id' | 'created_at'>

export function useCustomers() {
  const { workspace } = useWorkspaceStore()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchCustomers = useCallback(async () => {
    if (!workspace) return
    setLoading(true)
    setError(null)
    try {
      const { data, error: fetchError } = await supabase
        .from('customers')
        .select('*')
        .eq('workspace_id', workspace.id)
        .order('name')

      if (fetchError) throw fetchError
      setCustomers(data ?? [])
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '거래처 목록을 불러오지 못했습니다.'
      )
    } finally {
      setLoading(false)
    }
  }, [workspace])

  const createCustomer = useCallback(
    async (input: CustomerInput) => {
      if (!workspace) return null
      setError(null)
      try {
        const { data, error: insertError } = await supabase
          .from('customers')
          .insert({ ...input, workspace_id: workspace.id })
          .select()
          .single()

        if (insertError) throw insertError
        setCustomers((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
        return data as Customer
      } catch (err) {
        setError(
          err instanceof Error ? err.message : '거래처 생성에 실패했습니다.'
        )
        return null
      }
    },
    [workspace]
  )

  const updateCustomer = useCallback(
    async (id: string, input: Partial<CustomerInput>) => {
      setError(null)
      try {
        const { data, error: updateError } = await supabase
          .from('customers')
          .update(input)
          .eq('id', id)
          .select()
          .single()

        if (updateError) throw updateError
        setCustomers((prev) =>
          prev
            .map((c) => (c.id === id ? (data as Customer) : c))
            .sort((a, b) => a.name.localeCompare(b.name))
        )
        return data as Customer
      } catch (err) {
        setError(
          err instanceof Error ? err.message : '거래처 수정에 실패했습니다.'
        )
        return null
      }
    },
    []
  )

  const deleteCustomer = useCallback(async (id: string) => {
    setError(null)
    try {
      const { error: deleteError } = await supabase
        .from('customers')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError
      setCustomers((prev) => prev.filter((c) => c.id !== id))
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '거래처 삭제에 실패했습니다.'
      )
    }
  }, [])

  return {
    customers,
    loading,
    error,
    fetchCustomers,
    createCustomer,
    updateCustomer,
    deleteCustomer,
  }
}
