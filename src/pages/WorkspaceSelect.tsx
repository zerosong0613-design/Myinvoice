import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Loader2, Plus, Trash2, RotateCcw, Trash } from 'lucide-react'
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
  const [trashedWorkspaces, setTrashedWorkspaces] = useState<Workspace[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<Workspace | null>(null)
  const [permanentDeleteTarget, setPermanentDeleteTarget] = useState<Workspace | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [showTrash, setShowTrash] = useState(false)

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

    // 활성 워크스페이스
    const { data } = await supabase
      .from('workspace_members')
      .select('workspace_id, workspaces(*)')
      .eq('user_id', user.id)
      .eq('status', 'active')

    if (data) {
      const all = data
        .map((d) => d.workspaces as unknown as Workspace)
        .filter(Boolean)

      const active = all.filter((ws) => !ws.deleted_at)
      const trashed = all.filter((ws) => {
        if (!ws.deleted_at) return false
        // 30일 지났으면 표시 안 함
        const deletedDate = new Date(ws.deleted_at)
        const now = new Date()
        const diffDays = (now.getTime() - deletedDate.getTime()) / (1000 * 60 * 60 * 24)
        return diffDays <= 30
      })

      if (active.length === 0 && trashed.length === 0) {
        navigate('/workspace-setup', { replace: true })
        return
      }
      if (active.length === 1 && trashed.length === 0) {
        setWorkspace(active[0])
        navigate('/', { replace: true })
        return
      }
      setWorkspaces(active)
      setTrashedWorkspaces(trashed)
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

  // 소프트 삭제 (휴지통으로 이동)
  const handleSoftDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)

    await supabase
      .from('workspaces')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', deleteTarget.id)

    setDeleting(false)
    setDeleteTarget(null)
    await loadWorkspaces()
  }

  // 복원
  const handleRestore = async (ws: Workspace) => {
    await supabase
      .from('workspaces')
      .update({ deleted_at: null })
      .eq('id', ws.id)

    await loadWorkspaces()
  }

  // 영구 삭제
  const handlePermanentDelete = async () => {
    if (!permanentDeleteTarget || !user) return
    setDeleting(true)
    const wsId = permanentDeleteTarget.id

    // FK 순서대로 삭제
    const { data: invoiceIds } = await supabase.from('invoices').select('id').eq('workspace_id', wsId)
    if (invoiceIds?.length) {
      await supabase.from('invoice_items').delete().in('invoice_id', invoiceIds.map((i) => i.id))
    }
    const { data: quoteIds } = await supabase.from('quotes').select('id').eq('workspace_id', wsId)
    if (quoteIds?.length) {
      await supabase.from('quote_items').delete().in('quote_id', quoteIds.map((q) => q.id))
    }
    const { data: cnIds } = await supabase.from('credit_notes').select('id').eq('workspace_id', wsId)
    if (cnIds?.length) {
      await supabase.from('credit_note_items').delete().in('credit_note_id', cnIds.map((c) => c.id))
    }

    await supabase.from('credit_notes').delete().eq('workspace_id', wsId)
    await supabase.from('invoices').delete().eq('workspace_id', wsId)
    await supabase.from('quotes').delete().eq('workspace_id', wsId)
    await supabase.from('products').delete().eq('workspace_id', wsId)
    await supabase.from('categories').delete().eq('workspace_id', wsId)
    await supabase.from('customers').delete().eq('workspace_id', wsId)
    try { await supabase.from('invitations').delete().eq('workspace_id', wsId) } catch { /* */ }
    await supabase.from('workspace_members').delete().eq('workspace_id', wsId)
    await supabase.from('workspaces').delete().eq('id', wsId)

    setDeleting(false)
    setPermanentDeleteTarget(null)
    await loadWorkspaces()
  }

  function daysLeft(deletedAt: string): number {
    const deleted = new Date(deletedAt)
    const now = new Date()
    return Math.max(0, 30 - Math.floor((now.getTime() - deleted.getTime()) / (1000 * 60 * 60 * 24)))
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

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => navigate('/workspace-setup')}
            >
              <Plus className="mr-2 h-4 w-4" />
              새 워크스페이스
            </Button>
            {trashedWorkspaces.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => setShowTrash(!showTrash)}
              >
                <Trash className="mr-1 h-4 w-4" />
                휴지통 ({trashedWorkspaces.length})
              </Button>
            )}
          </div>

          {/* 휴지통 */}
          {showTrash && trashedWorkspaces.length > 0 && (
            <div className="space-y-2 rounded-lg border border-dashed p-3">
              <p className="text-xs font-medium text-muted-foreground">
                휴지통 (30일 후 자동 삭제)
              </p>
              {trashedWorkspaces.map((ws) => (
                <div
                  key={ws.id}
                  className="flex items-center justify-between rounded-md bg-muted/50 p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-muted-foreground line-through">
                      {ws.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {daysLeft(ws.deleted_at!)}일 후 영구 삭제
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => handleRestore(ws)}
                    >
                      <RotateCcw className="mr-1 h-3 w-3" />
                      복원
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-destructive hover:text-destructive"
                      onClick={() => setPermanentDeleteTarget(ws)}
                    >
                      영구삭제
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 소프트 삭제 확인 */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>워크스페이스 삭제</DialogTitle>
            <DialogDescription>
              <strong>{deleteTarget?.name}</strong>을(를) 휴지통으로 이동합니다.
              30일 이내에 복원할 수 있으며, 이후 자동으로 영구 삭제됩니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              취소
            </Button>
            <Button variant="destructive" onClick={handleSoftDelete} disabled={deleting}>
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              휴지통으로 이동
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 영구 삭제 확인 */}
      <Dialog open={!!permanentDeleteTarget} onOpenChange={(open) => !open && setPermanentDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>영구 삭제</DialogTitle>
            <DialogDescription>
              <strong>{permanentDeleteTarget?.name}</strong>을(를) 영구 삭제합니다.
              청구서, 견적서, 거래처 등 모든 데이터가 완전히 삭제되며 복구할 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPermanentDeleteTarget(null)} disabled={deleting}>
              취소
            </Button>
            <Button variant="destructive" onClick={handlePermanentDelete} disabled={deleting}>
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              영구 삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
