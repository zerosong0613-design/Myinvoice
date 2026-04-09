import { useState } from 'react'
import { Mail, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { generatePDFBase64 } from '@/components/pdf/PDFDownloadBtn'
import type { Workspace, Invoice, Quote, CreditNote, InvoiceItem, QuoteItem, CreditNoteItem } from '@/types'

type DocumentType = 'invoice' | 'quote' | 'credit_note'

const TYPE_LABELS: Record<DocumentType, string> = {
  invoice: '청구서',
  quote: '견적서',
  credit_note: '신용전표',
}

interface SendEmailDialogProps {
  type: DocumentType
  document: Invoice | Quote | CreditNote
  items: InvoiceItem[] | QuoteItem[] | CreditNoteItem[]
  workspace: Workspace
  docNumber: string
  customerEmail: string | null
  onSent?: () => void
}

export default function SendEmailDialog({
  type,
  document,
  items,
  workspace,
  docNumber,
  customerEmail,
  onSent,
}: SendEmailDialogProps) {
  const [open, setOpen] = useState(false)
  const [to, setTo] = useState(customerEmail ?? '')
  const [subject, setSubject] = useState(
    `[${workspace.name}] ${TYPE_LABELS[type]} ${docNumber}`
  )
  const [body, setBody] = useState(
    `안녕하세요,\n\n${workspace.name}에서 보내드리는 ${TYPE_LABELS[type]}입니다.\n첨부된 PDF를 확인해주세요.\n\n감사합니다.`
  )
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSend = async () => {
    if (!to.trim()) {
      setError('수신자 이메일을 입력해주세요.')
      return
    }

    setSending(true)
    setError(null)

    try {
      // PDF 생성
      const pdfBase64 = await generatePDFBase64(type, document, items, workspace)

      // API 호출
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: to.trim(),
          subject,
          body,
          pdfBase64,
          filename: `${docNumber}.pdf`,
          resendApiKey: workspace.resend_api_key,
          fromEmail: workspace.resend_from_email,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? '이메일 발송에 실패했습니다.')
      }

      setOpen(false)
      onSent?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : '이메일 발송에 실패했습니다.')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Mail className="mr-2 h-4 w-4" />
        이메일 발송
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>이메일 발송</DialogTitle>
          <DialogDescription>
            {TYPE_LABELS[type]}를 PDF로 첨부하여 발송합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>수신자 이메일</Label>
            <Input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="email@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label>제목</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>본문</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={sending}>
            취소
          </Button>
          <Button onClick={handleSend} disabled={sending}>
            {sending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Mail className="mr-2 h-4 w-4" />
            )}
            발송
          </Button>
        </DialogFooter>
      </DialogContent>
      </Dialog>
    </>
  )
}
