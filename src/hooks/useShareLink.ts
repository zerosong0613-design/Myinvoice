import { useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useWorkspaceStore } from '@/store/useWorkspaceStore'
import { useAuthStore } from '@/store/useAuthStore'

type DocumentType = 'invoice' | 'quote' | 'credit_note'

export function useShareLink() {
  const { workspace } = useWorkspaceStore()
  const { user } = useAuthStore()

  const createShareLink = useCallback(
    async (documentType: DocumentType, documentId: string): Promise<string | null> => {
      if (!workspace || !user) return null

      // 기존 링크 확인
      const { data: existing } = await supabase
        .from('share_links')
        .select('token')
        .eq('document_type', documentType)
        .eq('document_id', documentId)
        .limit(1)
        .single()

      if (existing) {
        return `${window.location.origin}/share/${existing.token}`
      }

      // 새 링크 생성
      const { data, error } = await supabase
        .from('share_links')
        .insert({
          workspace_id: workspace.id,
          document_type: documentType,
          document_id: documentId,
          created_by: user.id,
        })
        .select('token')
        .single()

      if (error || !data) return null
      return `${window.location.origin}/share/${data.token}`
    },
    [workspace, user]
  )

  return { createShareLink }
}
