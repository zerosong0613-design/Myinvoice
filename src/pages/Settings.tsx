import { useEffect, useState, useCallback } from 'react'
import { Copy, Loader2, Plus, Trash2, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase'
import { useWorkspaceStore } from '@/store/useWorkspaceStore'
import { useAuthStore } from '@/store/useAuthStore'
import { useInvitations } from '@/hooks/useInvitations'
import type { WorkspaceMember, MemberRole } from '@/types'

function roleBadge(role: string) {
  switch (role) {
    case 'owner': return <Badge className="bg-purple-500">소유자</Badge>
    case 'admin': return <Badge className="bg-blue-500">관리자</Badge>
    default: return <Badge variant="secondary">멤버</Badge>
  }
}

export default function Settings() {
  const { workspace, setWorkspace } = useWorkspaceStore()
  const { user } = useAuthStore()

  // 워크스페이스 정보
  const [name, setName] = useState('')
  const [bizNumber, setBizNumber] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [memo, setMemo] = useState('')
  const [defaultDueDays, setDefaultDueDays] = useState(30)
  const [defaultMemo, setDefaultMemo] = useState('')
  const [defaultTaxType, setDefaultTaxType] = useState('exclusive')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  // 멤버 관리
  const [members, setMembers] = useState<(WorkspaceMember & { email?: string })[]>([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [currentRole, setCurrentRole] = useState<MemberRole>('member')

  // 초대
  const { invitations, fetchInvitations, createInvitation, cancelInvitation } = useInvitations()
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [inviteRole, setInviteRole] = useState<MemberRole>('member')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteCreating, setInviteCreating] = useState(false)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  useEffect(() => {
    if (workspace) {
      setName(workspace.name ?? '')
      setBizNumber(workspace.biz_number ?? '')
      setAddress(workspace.address ?? '')
      setPhone(workspace.phone ?? '')
      setEmail(workspace.email ?? '')
      setMemo(workspace.memo ?? '')
      setDefaultDueDays(workspace.default_due_days ?? 30)
      setDefaultMemo(workspace.default_memo ?? '')
      setDefaultTaxType(workspace.default_tax_type ?? 'exclusive')
    }
  }, [workspace])

  const fetchMembers = useCallback(async () => {
    if (!workspace) return
    setMembersLoading(true)
    const { data } = await supabase
      .from('workspace_members')
      .select('*')
      .eq('workspace_id', workspace.id)
      .eq('status', 'active')
      .order('joined_at')

    if (data) {
      // 사용자 이메일 가져오기 (Supabase에서 직접 조회는 불가하므로 auth.users 대신 간접적으로)
      setMembers(data as (WorkspaceMember & { email?: string })[])
      // 현재 사용자의 역할 확인
      const myMember = data.find((m: WorkspaceMember) => m.user_id === user?.id)
      if (myMember) setCurrentRole(myMember.role as MemberRole)
    }
    setMembersLoading(false)
  }, [workspace, user])

  useEffect(() => {
    fetchMembers()
    fetchInvitations()
  }, [fetchMembers, fetchInvitations])

  const isOwner = currentRole === 'owner'
  const isAdmin = currentRole === 'owner' || currentRole === 'admin'

  const handleSave = async () => {
    if (!workspace) return
    if (!name.trim()) {
      setMessage('상호명을 입력해주세요.')
      return
    }

    setSaving(true)
    setMessage(null)

    try {
      const { data, error } = await supabase
        .from('workspaces')
        .update({
          name: name.trim(),
          biz_number: bizNumber.trim() || null,
          address: address.trim() || null,
          phone: phone.trim() || null,
          email: email.trim() || null,
          memo: memo.trim() || null,
          default_due_days: defaultDueDays || 30,
          default_memo: defaultMemo.trim() || null,
          default_tax_type: defaultTaxType,
        })
        .eq('id', workspace.id)
        .select()
        .single()

      if (error) throw error
      setWorkspace(data)
      setMessage('설정이 저장되었습니다.')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleInvite = async () => {
    setInviteCreating(true)
    const inv = await createInvitation(inviteRole, inviteEmail || undefined)
    setInviteCreating(false)
    if (inv) {
      setInviteDialogOpen(false)
      setInviteEmail('')
      setInviteRole('member')
      fetchInvitations()
    }
  }

  const copyInviteLink = (token: string) => {
    const link = `${window.location.origin}/invite/${token}`
    navigator.clipboard.writeText(link)
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 2000)
  }

  const handleRoleChange = async (memberId: string, newRole: MemberRole) => {
    if (!isOwner) return
    await supabase
      .from('workspace_members')
      .update({ role: newRole })
      .eq('id', memberId)
    fetchMembers()
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!isOwner) return
    if (!confirm('이 멤버를 제거하시겠습니까?')) return
    await supabase
      .from('workspace_members')
      .update({ status: 'invited' })
      .eq('id', memberId)
    fetchMembers()
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">설정</h1>

      <Tabs defaultValue="workspace">
        <TabsList>
          <TabsTrigger value="workspace">워크스페이스</TabsTrigger>
          <TabsTrigger value="members">멤버 관리</TabsTrigger>
        </TabsList>

        {/* 워크스페이스 정보 탭 */}
        <TabsContent value="workspace" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>워크스페이스 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>상호명</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="상호명 입력" />
              </div>
              <div className="space-y-2">
                <Label>사업자등록번호</Label>
                <Input value={bizNumber} onChange={(e) => setBizNumber(e.target.value)} placeholder="000-00-00000" />
              </div>
              <div className="space-y-2">
                <Label>주소</Label>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="사업장 주소" />
              </div>
              <div className="space-y-2">
                <Label>전화번호</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="전화번호" />
              </div>
              <div className="space-y-2">
                <Label>이메일</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="이메일 주소" />
              </div>
              <div className="space-y-2">
                <Label>메모</Label>
                <Textarea value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="메모 (선택)" rows={3} />
              </div>
            </CardContent>
          </Card>

          {/* 기본 설정 */}
          <Card>
            <CardHeader>
              <CardTitle>기본 설정</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                새 청구서·견적서 작성 시 자동으로 적용되는 기본값입니다.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>기본 납부기한 (일)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={defaultDueDays}
                    onChange={(e) => setDefaultDueDays(Number(e.target.value) || 30)}
                    placeholder="30"
                  />
                  <p className="text-xs text-muted-foreground">발행일로부터 며칠 후가 납기일인지 설정</p>
                </div>
                <div className="space-y-2">
                  <Label>기본 부가세 유형</Label>
                  <Select value={defaultTaxType} onValueChange={(v) => v && setDefaultTaxType(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="exclusive">별도 (공급가 + 10%)</SelectItem>
                      <SelectItem value="inclusive">포함 (총액에 포함)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>기본 메모 템플릿</Label>
                <Textarea
                  value={defaultMemo}
                  onChange={(e) => setDefaultMemo(e.target.value)}
                  placeholder="예: 입금계좌 - 국민은행 000-000-000 (주)회사명"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">새 문서 작성 시 메모란에 자동 입력됩니다.</p>
              </div>
            </CardContent>
          </Card>

          {message && (
            <div className={`rounded-md p-3 text-sm ${message.includes('저장되었습니다') ? 'bg-green-50 text-green-700' : 'bg-destructive/10 text-destructive'}`}>
              {message}
            </div>
          )}
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? '저장 중...' : '저장'}
            </Button>
          </div>
        </TabsContent>

        {/* 멤버 관리 탭 */}
        <TabsContent value="members" className="space-y-4">
          {/* 멤버 목록 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>멤버</CardTitle>
              {isAdmin && (
                <Button size="sm" onClick={() => setInviteDialogOpen(true)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  초대
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {membersLoading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>사용자 ID</TableHead>
                        <TableHead>역할</TableHead>
                        <TableHead>가입일</TableHead>
                        {isOwner && <TableHead className="w-[120px]">관리</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {members.map((member) => (
                        <TableRow key={member.id}>
                          <TableCell className="font-mono text-xs">
                            {member.user_id === user?.id ? '나' : member.user_id.slice(0, 8) + '...'}
                          </TableCell>
                          <TableCell>
                            {isOwner && member.user_id !== user?.id && member.role !== 'owner' ? (
                              <Select
                                value={member.role}
                                onValueChange={(v) => handleRoleChange(member.id, v as MemberRole)}
                              >
                                <SelectTrigger className="h-7 w-24">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="admin">관리자</SelectItem>
                                  <SelectItem value="member">멤버</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              roleBadge(member.role)
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {member.joined_at ? new Date(member.joined_at).toLocaleDateString('ko-KR') : '-'}
                          </TableCell>
                          {isOwner && (
                            <TableCell>
                              {member.user_id !== user?.id && member.role !== 'owner' && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive"
                                  onClick={() => handleRemoveMember(member.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 대기 중인 초대 */}
          {invitations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>대기 중인 초대</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {invitations.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between rounded-md border p-3">
                      <div>
                        <p className="text-sm font-medium">
                          {inv.email || '이메일 미지정'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          역할: {inv.role === 'admin' ? '관리자' : '멤버'} · 만료: {new Date(inv.expires_at).toLocaleDateString('ko-KR')}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyInviteLink(inv.token)}
                        >
                          <Copy className="mr-1 h-3 w-3" />
                          {copiedToken === inv.token ? '복사됨!' : '링크 복사'}
                        </Button>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => cancelInvitation(inv.id)}
                          >
                            취소
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* 초대 다이얼로그 */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>멤버 초대</DialogTitle>
            <DialogDescription>
              초대 링크를 생성하여 공유하세요. 7일 후 만료됩니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>이메일 (선택)</Label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="초대할 이메일 (선택)"
              />
            </div>
            <div className="space-y-2">
              <Label>역할</Label>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as MemberRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">멤버 (조회·생성)</SelectItem>
                  <SelectItem value="admin">관리자 (관리)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleInvite} disabled={inviteCreating}>
              {inviteCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Plus className="mr-2 h-4 w-4" />
              초대 생성
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
