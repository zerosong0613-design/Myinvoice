import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useWorkspaceStore } from '@/store/useWorkspaceStore'
import { useAuthStore } from '@/store/useAuthStore'
import type { MemberRole } from '@/types'

export function useRole() {
  const { workspace } = useWorkspaceStore()
  const { user } = useAuthStore()
  const [role, setRole] = useState<MemberRole | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!workspace || !user) {
      setRole(null)
      setLoading(false)
      return
    }

    const fetchRole = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', workspace.id)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single()

      setRole((data?.role as MemberRole) ?? null)
      setLoading(false)
    }

    fetchRole()
  }, [workspace, user])

  return {
    role,
    loading,
    isOwner: role === 'owner',
    isAdmin: role === 'owner' || role === 'admin',
    canEdit: role === 'owner' || role === 'admin',
    canManageMembers: role === 'owner',
  }
}
