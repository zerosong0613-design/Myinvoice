import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Loader2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
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

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      navigate('/login', { replace: true })
      return
    }

    const load = async () => {
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
    load()
  }, [authLoading, user, navigate, setWorkspace])

  const handleSelect = (ws: Workspace) => {
    setWorkspace(ws)
    navigate('/', { replace: true })
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
            <button
              key={ws.id}
              onClick={() => handleSelect(ws)}
              className="flex w-full items-center gap-3 rounded-lg border p-4 text-left transition-colors hover:bg-accent"
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
    </div>
  )
}
