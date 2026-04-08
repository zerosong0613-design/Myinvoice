import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Send,
  CheckCircle2,
  AlertTriangle,
  XCircle,
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
import InvoiceStatusBadge from '@/components/invoice/InvoiceStatusBadge'
import { useInvoices } from '@/hooks/useInvoices'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Invoice, InvoiceItem, InvoiceStatus } from '@/types'

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { getInvoice, updateInvoiceStatus, deleteInvoice, error } =
    useInvoices()

  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [items, setItems] = useState<InvoiceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    async function load() {
      if (!id) return
      setLoading(true)
      const result = await getInvoice(id)
      if (result) {
        setInvoice(result.invoice)
        setItems(result.items)
      }
      setLoading(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const handleStatusChange = async (newStatus: InvoiceStatus) => {
    if (!id) return
    setActionLoading(true)
    const success = await updateInvoiceStatus(id, newStatus)
    if (success) {
      setInvoice((prev) => (prev ? { ...prev, status: newStatus } : prev))
    }
    setActionLoading(false)
  }

  const handleDelete = async () => {
    if (!id) return
    setActionLoading(true)
    const success = await deleteInvoice(id)
    setActionLoading(false)
    if (success) {
      navigate('/invoices')
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

  if (!invoice) {
    return (
      <div className="py-10 text-center text-muted-foreground">
        청구서를 찾을 수 없습니다.
      </div>
    )
  }

  const status = invoice.status as InvoiceStatus

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/invoices')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{invoice.invoice_number}</h1>
              <InvoiceStatusBadge status={status} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              발행일: {formatDate(invoice.issued_at)}
              {invoice.due_at && <> / 납기일: {formatDate(invoice.due_at)}</>}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(`/invoices/${invoice.id}/edit`)}>
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

      {/* Status actions */}
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
                발행
              </Button>
            )}
            {status === 'sent' && (
              <>
                <Button
                  size="sm"
                  onClick={() => handleStatusChange('paid')}
                  disabled={actionLoading}
                  className="bg-green-500 hover:bg-green-600"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  결제완료
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleStatusChange('overdue')}
                  disabled={actionLoading}
                >
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  연체처리
                </Button>
              </>
            )}
            {status === 'overdue' && (
              <Button
                size="sm"
                onClick={() => handleStatusChange('paid')}
                disabled={actionLoading}
                className="bg-green-500 hover:bg-green-600"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                결제완료
              </Button>
            )}
            {status !== 'cancelled' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleStatusChange('cancelled')}
                disabled={actionLoading}
              >
                <XCircle className="mr-2 h-4 w-4" />
                취소
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Customer info */}
      <Card>
        <CardHeader>
          <CardTitle>거래처 정보</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <span className="text-muted-foreground">거래처명: </span>
              <span className="font-medium">{invoice.customer_name}</span>
            </div>
            {invoice.customer_email && (
              <div>
                <span className="text-muted-foreground">이메일: </span>
                <span>{invoice.customer_email}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Items table */}
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

      {/* Summary */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">공급가액</span>
              <span>{formatCurrency(invoice.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                부가세 ({invoice.tax_type === 'inclusive' ? '포함' : '별도'})
              </span>
              <span>{formatCurrency(invoice.tax_amount)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-base font-semibold">
              <span>합계</span>
              <span>{formatCurrency(invoice.total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Memo */}
      {invoice.memo && (
        <Card>
          <CardHeader>
            <CardTitle>메모</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {invoice.memo}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>청구서 삭제</DialogTitle>
            <DialogDescription>
              {invoice.invoice_number} 청구서를 삭제하시겠습니까? 이 작업은
              되돌릴 수 없습니다.
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
