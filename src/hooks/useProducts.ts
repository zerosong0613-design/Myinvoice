import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useWorkspaceStore } from '@/store/useWorkspaceStore'
import type { Product } from '@/types'

type ProductInput = Omit<Product, 'id' | 'workspace_id' | 'created_at'>

export function useProducts() {
  const { workspace } = useWorkspaceStore()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchProducts = useCallback(async () => {
    if (!workspace) return
    setLoading(true)
    setError(null)
    try {
      const { data, error: fetchError } = await supabase
        .from('products')
        .select('*')
        .eq('workspace_id', workspace.id)
        .order('name')

      if (fetchError) throw fetchError
      setProducts(data ?? [])
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '품목 목록을 불러오지 못했습니다.'
      )
    } finally {
      setLoading(false)
    }
  }, [workspace])

  const createProduct = useCallback(
    async (input: ProductInput) => {
      if (!workspace) return null
      setError(null)
      try {
        const { data, error: insertError } = await supabase
          .from('products')
          .insert({ ...input, workspace_id: workspace.id })
          .select()
          .single()

        if (insertError) throw insertError
        setProducts((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
        return data as Product
      } catch (err) {
        setError(
          err instanceof Error ? err.message : '품목 생성에 실패했습니다.'
        )
        return null
      }
    },
    [workspace]
  )

  const updateProduct = useCallback(
    async (id: string, input: Partial<ProductInput>) => {
      setError(null)
      try {
        const { data, error: updateError } = await supabase
          .from('products')
          .update(input)
          .eq('id', id)
          .select()
          .single()

        if (updateError) throw updateError
        setProducts((prev) =>
          prev
            .map((p) => (p.id === id ? (data as Product) : p))
            .sort((a, b) => a.name.localeCompare(b.name))
        )
        return data as Product
      } catch (err) {
        setError(
          err instanceof Error ? err.message : '품목 수정에 실패했습니다.'
        )
        return null
      }
    },
    []
  )

  const deleteProduct = useCallback(async (id: string) => {
    setError(null)
    try {
      const { error: deleteError } = await supabase
        .from('products')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError
      setProducts((prev) => prev.filter((p) => p.id !== id))
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '품목 삭제에 실패했습니다.'
      )
    }
  }, [])

  return {
    products,
    loading,
    error,
    fetchProducts,
    createProduct,
    updateProduct,
    deleteProduct,
  }
}
