import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { useWorkspaceStore } from '@/store/useWorkspaceStore'

export default function Settings() {
  const { workspace, setWorkspace } = useWorkspaceStore()

  const [name, setName] = useState('')
  const [bizNumber, setBizNumber] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [memo, setMemo] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (workspace) {
      setName(workspace.name ?? '')
      setBizNumber(workspace.biz_number ?? '')
      setAddress(workspace.address ?? '')
      setPhone(workspace.phone ?? '')
      setEmail(workspace.email ?? '')
      setMemo(workspace.memo ?? '')
    }
  }, [workspace])

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
        })
        .eq('id', workspace.id)
        .select()
        .single()

      if (error) throw error

      setWorkspace(data)
      setMessage('설정이 저장되었습니다.')
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : '저장에 실패했습니다.'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">설정</h1>

      <Card>
        <CardHeader>
          <CardTitle>워크스페이스 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>상호명</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="상호명 입력"
            />
          </div>

          <div className="space-y-2">
            <Label>사업자등록번호</Label>
            <Input
              value={bizNumber}
              onChange={(e) => setBizNumber(e.target.value)}
              placeholder="000-00-00000"
            />
          </div>

          <div className="space-y-2">
            <Label>주소</Label>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="사업장 주소"
            />
          </div>

          <div className="space-y-2">
            <Label>전화번호</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="전화번호"
            />
          </div>

          <div className="space-y-2">
            <Label>이메일</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="이메일 주소"
            />
          </div>

          <div className="space-y-2">
            <Label>메모</Label>
            <Textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="메모 (선택)"
              rows={3}
            />
          </div>

          {message && (
            <div
              className={`rounded-md p-3 text-sm ${
                message.includes('저장되었습니다')
                  ? 'bg-green-50 text-green-700'
                  : 'bg-destructive/10 text-destructive'
              }`}
            >
              {message}
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? '저장 중...' : '저장'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
