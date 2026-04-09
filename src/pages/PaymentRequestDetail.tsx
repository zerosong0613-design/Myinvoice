import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Send,
  CheckCircle2,
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
import PaymentRequestStatusBadge from '@/components/invoice/PaymentRequestStatusBadge'
import PDFDownloadBtn from '@/components/pdf/PDFDownloadBtn'
import SendEmailDialog from '@/components/email/SendEmailDialog'
import { usePaymentRequests } from '@/hooks/usePaymentRequests'
import { useWorkspaceStore } from '@/store/useWorkspaceStore'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { PaymentRequest, PaymentRequestItem, PaymentRequestStatus, Invoice, InvoiceItem } from '@/types'

export default function PaymentRequestDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { getPaymentRequest, updatePaymentRequestStatus, deletePaymentRequest, error } =
    usePaymentRequests()
  const { workspace } = useWorkspaceStore()

  const [pr, setPr] = useState<PaymentRequest | null>(null)
  const [items, setItems] = useState<PaymentRequestItem[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    async function load() {
      if (!id) return
      setLoading(true)
      const result = await getPaymentRequest(id)
      if (result) {
        setPr(result.pr)
        setItems(result.items)
      }
      setLoading(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const handleStatusChange = async (newStatus: PaymentRequestStatus) => {
    if (!id) return
    setActionLoading(true)
    const success = await updatePaymentRequestStatus(id, newStatus)
    if (success) {
      setPr((prev) => (prev ? { ...prev, status: newStatus } : prev))
    }
    setActionLoading(false)
  }

  const handleDelete = async () => {
    if (!id) return
    setActionLoading(true)
    const success = await deletePaymentRequest(id)
    setActionLoading(false)
    if (success) {
      navigate('/payment-requests')
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

  if (!pr) {
    return (
      <div className="py-10 text-center text-muted-foreground">
        지급요청서를 찾을 수 없습니다.
      </div>
    )
  }

  const status = pr.status as PaymentRequestStatus

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/payment-requests')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{pr.request_number}</h1>
              <PaymentRequestStatusBadge status={status} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              발행일: {formatDate(pr.issued_at)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {workspace && (
            <PDFDownloadBtn
              type="invoice"
              document={pr as unknown as Invoice}
              items={items as unknown as InvoiceItem[]}
              workspace={workspace}
              filename={pr.request_number}
            />
          )}
          {workspace && (
            <SendEmailDialog
              type="invoice"
              document={pr as unknown as Invoice}
              items={items as unknown as InvoiceItem[]}
              workspace={workspace}
              docNumber={pr.request_number}
              customerEmail={pr.customer_email}
              onSent={() => handleStatusChange('sent')}
            />
          )}
          <Button variant="outline" size="sm" onClick={() => navigate(`/payment-requests/${pr.id}/edit`)}>
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
              <Button
                size="sm"
                onClick={() => handleStatusChange('paid')}
                disabled={actionLoading}
                className="bg-green-500 hover:bg-green-600"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                지급완료
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
              <span className="font-medium">{pr.customer_name}</span>
            </div>
            {Boolean(pr.customer_email) && (
              <div>
                <span className="text-muted-foreground">이메일: </span>
                <span>{pr.customer_email}</span>
              </div>
            )}
            {Boolean(pr.customer_biz_number) && (
              <div>
                <span className="text-muted-foreground">사업자번호: </span>
                <span>{pr.customer_biz_number}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bank account info */}
      {Boolean(pr.bank_name || pr.account_number || pr.account_holder) && (
        <Card>
          <CardHeader>
            <CardTitle>입금 계좌 정보</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 text-sm sm:grid-cols-3">
              {Boolean(pr.bank_name) && (
                <div>
                  <span className="text-muted-foreground">은행명: </span>
                  <span className="font-medium">{pr.bank_name}</span>
                </div>
              )}
              {Boolean(pr.account_number) && (
                <div>
                  <span className="text-muted-foreground">계좌번호: </span>
                  <span className="font-medium">{pr.account_number}</span>
                </div>
              )}
              {Boolean(pr.account_holder) && (
                <div>
                  <span className="text-muted-foreground">예금주: </span>
                  <span className="font-medium">{pr.account_holder}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

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
              <span>{formatCurrency(pr.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                원천세 ({pr.withholding_rate}%)
              </span>
              <span>-{formatCurrency(pr.withholding_tax)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-base font-semibold">
              <span>실지급액</span>
              <span>{formatCurrency(pr.net_amount)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Memo */}
      {Boolean(pr.memo) && (
        <Card>
          <CardHeader>
            <CardTitle>메모</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {pr.memo}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>지급요청서 삭제</DialogTitle>
            <DialogDescription>
              {pr.request_number} 지급요청서를 삭제하시겠습니까? 이 작업은
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
