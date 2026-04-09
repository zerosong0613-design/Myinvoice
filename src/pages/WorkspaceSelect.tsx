import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Loader2, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import { useWorkspaceStore } from '@/store/useWorkspaceStore'
import type { Workspace } from '@/types'

export default function WorkspaceSelect() {
  const navigate = useNavigate()
  const { user, loading: authLoading, setUser, setLoading: setAuthLoading } = useAuthStore()
  const { setWorkspace } = useWorkspaceStore()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<Workspace | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      setAuthLoading(false)
    }
    initAuth()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setAuthLoading(false)
    })
    return () => subscription.unsubscribe()
  }, [setUser, setAuthLoading])

  const loadWorkspaces = async () => {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from('workspace_members')
      .select('workspace_id, workspaces(*)')
      .eq('user_id', user.id)
      .eq('status', 'active')

    if (data) {
      const wsList = data
        .map((d) => d.workspaces as unknown as Workspace)
        .filter(Boolean)

      if (wsList.length === 0) {
        navigate('/workspace-setup', { replace: true })
        return
      }
      if (wsList.length === 1) {
        setWorkspace(wsList[0])
        navigate('/', { replace: true })
        return
      }
      setWorkspaces(wsList)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      navigate('/login', { replace: true })
      return
    }
    loadWorkspaces()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user])

  const handleSelect = (ws: Workspace) => {
    setWorkspace(ws)
    navigate('/', { replace: true })
  }

  const handleDelete = async () => {
    if (!deleteTarget || !user) return
    setDeleting(true)

    // 관련 데이터 순서대로 삭제 (FK 제약조건)
    const wsId = deleteTarget.id

    // 1. 품목 아이템 삭제 (invoice_items, quote_items, credit_note_items)
    const { data: invoiceIds } = await supabase
      .from('invoices').select('id').eq('workspace_id', wsId)
    if (invoiceIds?.length) {
      const ids = invoiceIds.map((i) => i.id)
      await supabase.from('invoice_items').delete().in('invoice_id', ids)
    }

    const { data: quoteIds } = await supabase
      .from('quotes').select('id').eq('workspace_id', wsId)
    if (quoteIds?.length) {
      const ids = quoteIds.map((q) => q.id)
      await supabase.from('quote_items').delete().in('quote_id', ids)
    }

    const { data: cnIds } = await supabase
      .from('credit_notes').select('id').eq('workspace_id', wsId)
    if (cnIds?.length) {
      const ids = cnIds.map((c) => c.id)
      await supabase.from('credit_note_items').delete().in('credit_note_id', ids)
    }

    // 2. 문서 삭제
    await supabase.from('credit_notes').delete().eq('workspace_id', wsId)
    await supabase.from('invoices').delete().eq('workspace_id', wsId)
    await supabase.from('quotes').delete().eq('workspace_id', wsId)

    // 3. 관련 데이터 삭제
    await supabase.from('products').delete().eq('workspace_id', wsId)
    await supabase.from('categories').delete().eq('workspace_id', wsId)
    await supabase.from('customers').delete().eq('workspace_id', wsId)

    // 4. 초대/멤버 삭제
    try {
      await supabase.from('invitations').delete().eq('workspace_id', wsId)
    } catch { /* invitations 테이블이 없을 수 있음 */ }
    await supabase.from('workspace_members').delete().eq('workspace_id', wsId)

    // 5. 워크스페이스 삭제
    await supabase.from('workspaces').delete().eq('id', wsId)

    setDeleting(false)
    setDeleteTarget(null)

    // 목록 새로고침
    await loadWorkspaces()
  }

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const userName = user?.user_metadata?.full_name
    || user?.user_metadata?.name
    || user?.email?.split('@')[0]
    || '사용자'

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center space-y-2 pb-2">
          <FileText className="h-8 w-8 text-primary" />
          <h1 className="text-xl font-bold">안녕하세요, {userName}님!</h1>
          <p className="text-sm text-muted-foreground">
            사용할 워크스페이스를 선택하세요.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {workspaces.map((ws) => (
            <div
              key={ws.id}
              className="flex items-center gap-2 rounded-lg border transition-colors hover:bg-accent"
            >
              <button
                onClick={() => handleSelect(ws)}
                className="flex flex-1 items-center gap-3 p-4 text-left"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-sm font-bold text-white">
                  {ws.name[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-medium">{ws.name}</p>
                  {ws.biz_number && (
                    <p className="text-xs text-muted-foreground">{ws.biz_number}</p>
                  )}
                </div>
              </button>
              {ws.owner_id === user?.id && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="mr-2 h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation()
                    setDeleteTarget(ws)
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate('/workspace-setup')}
          >
            <Plus className="mr-2 h-4 w-4" />
            새 워크스페이스 만들기
          </Button>
        </CardContent>
      </Card>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>워크스페이스 삭제</DialogTitle>
            <DialogDescription>
              <strong>{deleteTarget?.name}</strong> 워크스페이스를 삭제하시겠습니까?
              청구서, 견적서, 거래처 등 모든 데이터가 영구 삭제됩니다.
              이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
