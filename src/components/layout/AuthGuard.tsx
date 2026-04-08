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

    const loadWorkspace = async () => {
      setWorkspaceLoading(true)
      const { data, error } = await supabase
        .from('workspace_members')
        .select('workspace_id, workspaces(*)')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .limit(1)
        .single()

      if (!error && data?.workspaces) {
        setWorkspace(data.workspaces as unknown as import('@/types').Workspace)
      } else {
        setWorkspace(null)
      }
      setWorkspaceLoading(false)
    }

    loadWorkspace()
  }, [user, authLoading, setWorkspace, setWorkspaceLoading])

  useEffect(() => {
    if (authLoading || workspaceLoading) return
    if (!user) {
      navigate('/login', { replace: true })
    } else if (!workspace) {
      navigate('/workspace-setup', { replace: true })
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
