import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useWorkspaceStore } from '@/store/useWorkspaceStore'
import { useAuthStore } from '@/store/useAuthStore'

export interface ActivityLog {
  id: string
  workspace_id: string
  user_id: string
  action: string
  target_type: string
  target_id: string | null
  target_label: string | null
  details: Record<string, unknown>
  created_at: string
}

type TargetType = 'invoice' | 'quote' | 'credit_note' | 'customer' | 'product' | 'workspace' | 'member'

const ACTION_LABELS: Record<string, string> = {
  created: '생성',
  updated: '수정',
  deleted: '삭제',
  status_changed: '상태 변경',
  converted: '변환',
  sent_email: '이메일 발송',
  invited: '멤버 초대',
  joined: '워크스페이스 합류',
}

const TARGET_LABELS: Record<string, string> = {
  invoice: '청구서',
  quote: '견적서',
  credit_note: '신용전표',
  customer: '거래처',
  product: '품목',
  workspace: '워크스페이스',
  member: '멤버',
}

export function formatAction(action: string): string {
  return ACTION_LABELS[action] ?? action
}

export function formatTargetType(type: string): string {
  return TARGET_LABELS[type] ?? type
}

export function useActivityLog() {
  const { workspace } = useWorkspaceStore()
  const { user } = useAuthStore()
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(false)

  const log = useCallback(
    async (action: string, targetType: TargetType, targetId?: string, targetLabel?: string, details?: Record<string, unknown>) => {
      if (!workspace || !user) return
      try {
        await supabase.from('activity_logs').insert({
          workspace_id: workspace.id,
          user_id: user.id,
          action,
          target_type: targetType,
          target_id: targetId ?? null,
          target_label: targetLabel ?? null,
          details: details ?? {},
        })
      } catch {
        // 로그 실패는 무시 (테이블이 아직 없을 수 있음)
      }
    },
    [workspace, user]
  )

  const fetchLogs = useCallback(
    async (limit = 30) => {
      if (!workspace) return
      setLoading(true)
      try {
        const { data } = await supabase
          .from('activity_logs')
          .select('*')
          .eq('workspace_id', workspace.id)
          .order('created_at', { ascending: false })
          .limit(limit)

        setLogs((data ?? []) as ActivityLog[])
      } catch {
        // 테이블이 없으면 빈 배열
      } finally {
        setLoading(false)
      }
    },
    [workspace]
  )

  return { logs, loading, log, fetchLogs, formatAction, formatTargetType }
}
