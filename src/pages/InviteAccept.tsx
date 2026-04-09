import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FileText, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import { useWorkspaceStore } from '@/store/useWorkspaceStore'
import { useInvitations } from '@/hooks/useInvitations'
import type { Invitation, Workspace } from '@/types'

export default function InviteAccept() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const { user, loading: authLoading, setUser, setLoading: setAuthLoading } = useAuthStore()
  const { setWorkspace } = useWorkspaceStore()
  const { acceptInvitation, error: inviteError } = useInvitations()

  const [invitation, setInvitation] = useState<Invitation | null>(null)
  const [workspaceName, setWorkspaceName] = useState('')
  const [status, setStatus] = useState<'loading' | 'ready' | 'accepting' | 'success' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')

  // 인증 초기화
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

  // 초대 정보 조회
  useEffect(() => {
    if (!token) return

    const loadInvitation = async () => {
      const { data, error } = await supabase
        .from('invitations')
        .select('*, workspaces(name)')
        .eq('token', token)
        .eq('status', 'pending')
        .single()

      if (error || !data) {
        setStatus('error')
        setErrorMsg('유효하지 않거나 만료된 초대 링크입니다.')
        return
      }

      if (new Date(data.expires_at) < new Date()) {
        setStatus('error')
        setErrorMsg('초대가 만료되었습니다.')
        return
      }

      setInvitation(data as unknown as Invitation)
      setWorkspaceName((data.workspaces as unknown as { name: string })?.name ?? '')
      setStatus('ready')
    }

    loadInvitation()
  }, [token])

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/invite/${token}`,
      },
    })
  }

  const handleAccept = async () => {
    if (!token) return
    setStatus('accepting')

    const success = await acceptInvitation(token)
    if (success) {
      // 새 워크스페이스로 전환
      if (invitation) {
        const { data } = await supabase
          .from('workspaces')
          .select('*')
          .eq('id', invitation.workspace_id)
          .single()
        if (data) setWorkspace(data as Workspace)
      }
      setStatus('success')
      setTimeout(() => navigate('/'), 2000)
    } else {
      setStatus('error')
      setErrorMsg(inviteError ?? '초대 수락에 실패했습니다.')
    }
  }

  if (authLoading || status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center space-y-2 pb-2">
          <FileText className="h-8 w-8 text-primary" />
          <h1 className="text-xl font-bold">워크스페이스 초대</h1>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'error' && (
            <div className="flex flex-col items-center gap-3 py-4">
              <XCircle className="h-12 w-12 text-destructive" />
              <p className="text-center text-sm text-destructive">{errorMsg}</p>
              <Button variant="outline" onClick={() => navigate('/login')}>
                로그인 페이지로
              </Button>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center gap-3 py-4">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <p className="text-center text-sm font-medium">
                {workspaceName}에 합류했습니다!
              </p>
              <p className="text-center text-xs text-muted-foreground">
                잠시 후 대시보드로 이동합니다...
              </p>
            </div>
          )}

          {status === 'ready' && !user && (
            <div className="space-y-3">
              <p className="text-center text-sm text-muted-foreground">
                <strong>{workspaceName}</strong>에 초대되었습니다.
                <br />로그인하여 수락하세요.
              </p>
              <Button className="w-full gap-2" variant="outline" onClick={handleLogin}>
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Google로 로그인
              </Button>
            </div>
          )}

          {(status === 'ready' || status === 'accepting') && user && (
            <div className="space-y-3">
              <p className="text-center text-sm text-muted-foreground">
                <strong>{workspaceName}</strong>에 초대되었습니다.
              </p>
              <p className="text-center text-xs text-muted-foreground">
                역할: {invitation?.role === 'admin' ? '관리자' : '멤버'}
              </p>
              <Button
                className="w-full"
                onClick={handleAccept}
                disabled={status === 'accepting'}
              >
                {status === 'accepting' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                초대 수락
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
