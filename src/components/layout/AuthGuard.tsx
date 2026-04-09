import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import { useWorkspaceStore } from '@/store/useWorkspaceStore'
import { Loader2 } from 'lucide-react'

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading, setUser, setLoading: setAuthLoading } = useAuthStore()
  const {
    workspace,
    loading: workspaceLoading,
    setWorkspace,
    setLoading: setWorkspaceLoading,
  } = useWorkspaceStore()
  const navigate = useNavigate()

  useEffect(() => {
    const initAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      setAuthLoading(false)
    }

    initAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setAuthLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [setUser, setAuthLoading])

  useEffect(() => {
    if (authLoading || !user) {
      setWorkspaceLoading(false)
      return
    }

    let cancelled = false

    const loadWorkspace = async (retries = 2) => {
      setWorkspaceLoading(true)

      // 이미 워크스페이스가 설정되어 있으면 스킵
      if (workspace) {
        setWorkspaceLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('workspace_members')
        .select('workspace_id, workspaces(*)')
        .eq('user_id', user.id)
        .eq('status', 'active')

      if (cancelled) return

      const wsList = (data ?? [])
        .map((d) => d.workspaces as unknown as import('@/types').Workspace)
        .filter(Boolean)

      if (wsList.length === 1) {
        setWorkspace(wsList[0])
        setWorkspaceLoading(false)
      } else if (wsList.length > 1) {
        // 여러 워크스페이스 — 선택 화면으로 (workspace는 null 유지)
        setWorkspace(null)
        setWorkspaceLoading(false)
      } else if (retries > 0 && !error) {
        await new Promise((r) => setTimeout(r, 500))
        if (!cancelled) await loadWorkspace(retries - 1)
      } else {
        setWorkspace(null)
        setWorkspaceLoading(false)
      }
    }

    loadWorkspace()

    return () => { cancelled = true }
  }, [user, authLoading, workspace, setWorkspace, setWorkspaceLoading])

  useEffect(() => {
    if (authLoading || workspaceLoading) return
    if (!user) {
      navigate('/login', { replace: true })
    } else if (!workspace) {
      // 워크스페이스 선택/생성 화면으로 (여러 개면 선택, 0개면 생성)
      navigate('/workspace-select', { replace: true })
    }
  }, [user, workspace, authLoading, workspaceLoading, navigate])

  if (authLoading || workspaceLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!user || !workspace) return null

  return <>{children}</>
}
