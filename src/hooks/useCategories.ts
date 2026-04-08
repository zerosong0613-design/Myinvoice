import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useWorkspaceStore } from '@/store/useWorkspaceStore'
import type { Category } from '@/types'

function buildTree(flatList: Category[]): Category[] {
  const map = new Map<string, Category>()
  const roots: Category[] = []

  for (const item of flatList) {
    map.set(item.id, { ...item, children: [] })
  }

  for (const item of map.values()) {
    if (item.parent_id && map.has(item.parent_id)) {
      map.get(item.parent_id)!.children!.push(item)
    } else {
      roots.push(item)
    }
  }

  return roots
}

export function useCategories() {
  const { workspace } = useWorkspaceStore()
  const [categories, setCategories] = useState<Category[]>([])
  const [categoryTree, setCategoryTree] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchCategories = useCallback(async () => {
    if (!workspace) return
    setLoading(true)
    setError(null)
    try {
      const { data, error: fetchError } = await supabase
        .from('categories')
        .select('*')
        .eq('workspace_id', workspace.id)
        .order('sort_order')
        .order('name')

      if (fetchError) throw fetchError
      const flat = data ?? []
      setCategories(flat)
      setCategoryTree(buildTree(flat))
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '카테고리를 불러오지 못했습니다.'
      )
    } finally {
      setLoading(false)
    }
  }, [workspace])

  const createCategory = useCallback(
    async (input: { name: string; parent_id?: string | null }) => {
      if (!workspace) return null
      setError(null)
      try {
        const { data, error: insertError } = await supabase
          .from('categories')
          .insert({
            name: input.name,
            parent_id: input.parent_id ?? null,
            workspace_id: workspace.id,
            sort_order: 0,
          })
          .select()
          .single()

        if (insertError) throw insertError
        await fetchCategories()
        return data as Category
      } catch (err) {
        setError(
          err instanceof Error ? err.message : '카테고리 생성에 실패했습니다.'
        )
        return null
      }
    },
    [workspace, fetchCategories]
  )

  const updateCategory = useCallback(
    async (id: string, input: { name?: string; parent_id?: string | null; sort_order?: number }) => {
      setError(null)
      try {
        const { data, error: updateError } = await supabase
          .from('categories')
          .update(input)
          .eq('id', id)
          .select()
          .single()

        if (updateError) throw updateError
        await fetchCategories()
        return data as Category
      } catch (err) {
        setError(
          err instanceof Error ? err.message : '카테고리 수정에 실패했습니다.'
        )
        return null
      }
    },
    [fetchCategories]
  )

  const deleteCategory = useCallback(
    async (id: string) => {
      setError(null)
      try {
        const { error: deleteError } = await supabase
          .from('categories')
          .delete()
          .eq('id', id)

        if (deleteError) throw deleteError
        await fetchCategories()
      } catch (err) {
        setError(
          err instanceof Error ? err.message : '카테고리 삭제에 실패했습니다.'
        )
      }
    },
    [fetchCategories]
  )

  return {
    categories,
    categoryTree,
    loading,
    error,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
  }
}
