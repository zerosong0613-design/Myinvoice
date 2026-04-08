import { useState, useEffect, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { Customer } from '@/types'

interface CustomerFormData {
  name: string
  email: string | null
  phone: string | null
  biz_number: string | null
  address: string | null
  memo: string | null
}

interface CustomerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer?: Customer | null
  onSave: (data: CustomerFormData) => Promise<void>
}

export default function CustomerDialog({
  open,
  onOpenChange,
  customer,
  onSave,
}: CustomerDialogProps) {
  const isEdit = !!customer

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [bizNumber, setBizNumber] = useState('')
  const [address, setAddress] = useState('')
  const [memo, setMemo] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setName(customer?.name ?? '')
      setEmail(customer?.email ?? '')
      setPhone(customer?.phone ?? '')
      setBizNumber(customer?.biz_number ?? '')
      setAddress(customer?.address ?? '')
      setMemo(customer?.memo ?? '')
    }
  }, [open, customer])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await onSave({
        name: name.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        biz_number: bizNumber.trim() || null,
        address: address.trim() || null,
        memo: memo.trim() || null,
      })
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? '거래처 수정' : '거래처 추가'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="customer-name">
              거래처명 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="customer-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="거래처명을 입력하세요"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="customer-email">이메일</Label>
            <Input
              id="customer-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="customer-phone">전화번호</Label>
            <Input
              id="customer-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="02-0000-0000"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="customer-biz">사업자등록번호</Label>
            <Input
              id="customer-biz"
              value={bizNumber}
              onChange={(e) => setBizNumber(e.target.value)}
              placeholder="000-00-00000"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="customer-address">주소</Label>
            <Input
              id="customer-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="주소를 입력하세요"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="customer-memo">메모</Label>
            <Textarea
              id="customer-memo"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="메모를 입력하세요"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              취소
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? '수정' : '추가'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
