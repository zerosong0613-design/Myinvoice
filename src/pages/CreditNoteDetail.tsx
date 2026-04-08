import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Send,
  CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import CreditNoteStatusBadge from '@/components/invoice/CreditNoteStatusBadge'
import { useCreditNotes } from '@/hooks/useCreditNotes'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { CreditNote, CreditNoteItem, CreditNoteStatus } from '@/types'

export default function CreditNoteDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { getCreditNote, updateCreditNoteStatus, deleteCreditNote, error } =
    useCreditNotes()

  const [creditNote, setCreditNote] = useState<CreditNote | null>(null)
  const [items, setItems] = useState<CreditNoteItem[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    async function load() {
      if (!id) return
      setLoading(true)
      const result = await getCreditNote(id)
      if (result) {
        setCreditNote(result.creditNote)
        setItems(result.items)
      }
      setLoading(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const handleStatusChange = async (newStatus: CreditNoteStatus) => {
    if (!id) return
    setActionLoading(true)
    const success = await updateCreditNoteStatus(id, newStatus)
    if (success) {
      setCreditNote((prev) => (prev ? { ...prev, status: newStatus } : prev))
    }
    setActionLoading(false)
  }

  const handleDelete = async () => {
    if (!id) return
    setActionLoading(true)
    const success = await deleteCreditNote(id)
    setActionLoading(false)
    if (success) {
      navigate('/credit-notes')
    }
    setDeleteDialogOpen(false)
  }

  if (loading) {
    return (
      <div className="py-10 text-center text-muted-foreground">
        불러오는 중...
      </div>
    )
  }

  if (!creditNote) {
    return (
      <div className="py-10 text-center text-muted-foreground">
        신용전표를 찾을 수 없습니다.
      </div>
    )
  }

  const status = creditNote.status as CreditNoteStatus

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/credit-notes')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">
                {creditNote.credit_note_number}
              </h1>
              <CreditNoteStatusBadge status={status} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              발행일: {formatDate(creditNote.issued_at)}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(`/credit-notes/${creditNote.id}/edit`)}>
            <Pencil className="mr-2 h-4 w-4" />
            수정
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            삭제
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>상태 변경</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {status === 'draft' && (
              <Button
                size="sm"
                onClick={() => handleStatusChange('sent')}
                disabled={actionLoading}
              >
                <Send className="mr-2 h-4 w-4" />
                발송
              </Button>
            )}
            {status === 'sent' && (
              <Button
                size="sm"
                onClick={() => handleStatusChange('applied')}
                disabled={actionLoading}
                className="bg-green-500 hover:bg-green-600"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                적용
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {creditNote.original_invoice_id && (
        <Card>
          <CardHeader>
            <CardTitle>원본 청구서</CardTitle>
          </CardHeader>
          <CardContent>
            <Link
              to={`/invoices/${creditNote.original_invoice_id}`}
              className="text-sm text-blue-600 hover:underline"
            >
              원본 청구서 보기
            </Link>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>거래처 정보</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <span className="text-muted-foreground">거래처명: </span>
              <span className="font-medium">{creditNote.customer_name}</span>
            </div>
            {creditNote.customer_email && (
              <div>
                <span className="text-muted-foreground">이메일: </span>
                <span>{creditNote.customer_email}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>품목 내역</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>품목명</TableHead>
                  <TableHead>설명</TableHead>
                  <TableHead className="text-right">수량</TableHead>
                  <TableHead className="text-right">단가</TableHead>
                  <TableHead className="text-right">금액</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.description ?? '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.quantity}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.unit_price)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(item.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">공급가액</span>
              <span>{formatCurrency(creditNote.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                부가세 ({creditNote.tax_type === 'inclusive' ? '포함' : '별도'})
              </span>
              <span>{formatCurrency(creditNote.tax_amount)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-base font-semibold">
              <span>합계</span>
              <span>{formatCurrency(creditNote.total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {creditNote.memo && (
        <Card>
          <CardHeader>
            <CardTitle>메모</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {creditNote.memo}
            </p>
          </CardContent>
        </Card>
      )}

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>신용전표 삭제</DialogTitle>
            <DialogDescription>
              {creditNote.credit_note_number} 신용전표를 삭제하시겠습니까? 이
              작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={actionLoading}
            >
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={actionLoading}
            >
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
