import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useWorkspaceStore } from '@/store/useWorkspaceStore'
import { useAuthStore } from '@/store/useAuthStore'
import type { Invitation, MemberRole } from '@/types'

export function useInvitations() {
  const { workspace } = useWorkspaceStore()
  const { user } = useAuthStore()
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchInvitations = useCallback(async () => {
    if (!workspace) return
    setLoading(true)
    setError(null)
    try {
      const { data, error: fetchError } = await supabase
        .from('invitations')
        .select('*')
        .eq('workspace_id', workspace.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      setInvitations(data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : '초대 목록을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [workspace])

  const createInvitation = useCallback(
    async (role: MemberRole = 'member', email?: string): Promise<Invitation | null> => {
      if (!workspace || !user) return null
      setError(null)

      try {
        const { data, error: insertError } = await supabase
          .from('invitations')
          .insert({
            workspace_id: workspace.id,
            invited_by: user.id,
            email: email?.trim() || null,
            role,
          })
          .select()
          .single()

        if (insertError) throw insertError

        const invitation = data as Invitation
        setInvitations((prev) => [invitation, ...prev])
        return invitation
      } catch (err) {
        setError(err instanceof Error ? err.message : '초대 생성에 실패했습니다.')
        return null
      }
    },
    [workspace, user]
  )

  const cancelInvitation = useCallback(async (id: string): Promise<boolean> => {
    setError(null)
    try {
      const { error: updateError } = await supabase
        .from('invitations')
        .update({ status: 'cancelled' })
        .eq('id', id)

      if (updateError) throw updateError
      setInvitations((prev) => prev.filter((inv) => inv.id !== id))
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : '초대 취소에 실패했습니다.')
      return false
    }
  }, [])

  // 토큰으로 초대 조회 (수락 플로우용)
  const getInvitationByToken = useCallback(
    async (token: string): Promise<Invitation | null> => {
      try {
        const { data, error: fetchError } = await supabase
          .from('invitations')
          .select('*')
          .eq('token', token)
          .eq('status', 'pending')
          .single()

        if (fetchError) throw fetchError
        return data as Invitation
      } catch {
        return null
      }
    },
    []
  )

  // 초대 수락
  const acceptInvitation = useCallback(
    async (token: string): Promise<boolean> => {
      if (!user) return false
      setError(null)

      try {
        const invitation = await getInvitationByToken(token)
        if (!invitation) {
          setError('유효하지 않거나 만료된 초대입니다.')
          return false
        }

        if (new Date(invitation.expires_at) < new Date()) {
          setError('초대가 만료되었습니다.')
          await supabase
            .from('invitations')
            .update({ status: 'expired' })
            .eq('id', invitation.id)
          return false
        }

        // 이미 멤버인지 확인
        const { data: existing } = await supabase
          .from('workspace_members')
          .select('id')
          .eq('workspace_id', invitation.workspace_id)
          .eq('user_id', user.id)
          .eq('status', 'active')
          .single()

        if (existing) {
          setError('이미 이 워크스페이스의 멤버입니다.')
          return false
        }

        // 멤버 추가
        const { error: memberError } = await supabase
          .from('workspace_members')
          .insert({
            workspace_id: invitation.workspace_id,
            user_id: user.id,
            role: invitation.role,
            status: 'active',
            joined_at: new Date().toISOString(),
          })

        if (memberError) throw memberError

        // 초대 상태 업데이트
        await supabase
          .from('invitations')
          .update({ status: 'accepted', accepted_at: new Date().toISOString() })
          .eq('id', invitation.id)

        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : '초대 수락에 실패했습니다.')
        return false
      }
    },
    [user, getInvitationByToken]
  )

  return {
    invitations,
    loading,
    error,
    fetchInvitations,
    createInvitation,
    cancelInvitation,
    getInvitationByToken,
    acceptInvitation,
  }
}
