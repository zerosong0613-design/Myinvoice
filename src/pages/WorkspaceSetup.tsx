import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import { useWorkspaceStore } from '@/store/useWorkspaceStore'
import type { Workspace } from '@/types'

export default function WorkspaceSetup() {
  const navigate = useNavigate()
  const { user, loading: authLoading, setUser, setLoading: setAuthLoading } = useAuthStore()
  const { setWorkspace } = useWorkspaceStore()

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checking, setChecking] = useState(true)

  const [name, setName] = useState('')
  const [bizNumber, setBizNumber] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')

  // 1) 인증 초기화 — AuthGuard 밖이므로 직접 세션 확인
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

  // 2) 기존 워크스페이스 확인 — 있으면 바로 대시보드로
  useEffect(() => {
    if (authLoading) return
    if (!user) {
      navigate('/login', { replace: true })
      return
    }

    const checkExisting = async () => {
      setChecking(true)
      const { data, error: fetchError } = await supabase
        .from('workspace_members')
        .select('workspace_id, workspaces(*)')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .limit(1)
        .single()

      if (!fetchError && data?.workspaces) {
        setWorkspace(data.workspaces as unknown as Workspace)
        navigate('/', { replace: true })
        return
      }
      setChecking(false)
    }
    checkExisting()
  }, [authLoading, user, navigate, setWorkspace])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!user) return

    setSubmitting(true)
    setError(null)

    try {
      const { data: workspace, error: wsError } = await supabase
        .from('workspaces')
        .insert({
          name: name.trim(),
          biz_number: bizNumber.trim() || null,
          address: address.trim() || null,
          phone: phone.trim() || null,
          email: email.trim() || null,
          owner_id: user.id,
        })
        .select()
        .single()

      if (wsError) throw wsError

      const { error: memberError } = await supabase
        .from('workspace_members')
        .insert({
          workspace_id: workspace.id,
          user_id: user.id,
          role: 'owner',
          status: 'active',
          joined_at: new Date().toISOString(),
        })

      if (memberError) throw memberError

      setWorkspace(workspace)
      navigate('/')
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '워크스페이스 생성에 실패했습니다.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading || checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center space-y-2 pb-2">
          <div className="flex items-center gap-2">
            <FileText className="h-7 w-7 text-primary" />
            <h1 className="text-xl font-bold">워크스페이스 설정</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            사업장 정보를 입력하여 시작하세요.
          </p>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                상호명 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="상호명을 입력하세요"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bizNumber">사업자등록번호</Label>
              <Input
                id="bizNumber"
                value={bizNumber}
                onChange={(e) => setBizNumber(e.target.value)}
                placeholder="000-00-00000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">주소</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="사업장 주소"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">전화번호</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="02-0000-0000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              워크스페이스 생성
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
