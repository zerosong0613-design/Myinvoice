import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
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
import QuoteStatusBadge from '@/components/invoice/QuoteStatusBadge'
import { useQuotes } from '@/hooks/useQuotes'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Quote, QuoteItem, QuoteStatus } from '@/types'

export default function QuoteDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { getQuote, updateQuoteStatus, deleteQuote, error } = useQuotes()

  const [quote, setQuote] = useState<Quote | null>(null)
  const [items, setItems] = useState<QuoteItem[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    async function load() {
      if (!id) return
      setLoading(true)
      const result = await getQuote(id)
      if (result) {
        setQuote(result.quote)
        setItems(result.items)
      }
      setLoading(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const handleStatusChange = async (newStatus: QuoteStatus) => {
    if (!id) return
    setActionLoading(true)
    const success = await updateQuoteStatus(id, newStatus)
    if (success) {
      setQuote((prev) => (prev ? { ...prev, status: newStatus } : prev))
    }
    setActionLoading(false)
  }

  const handleDelete = async () => {
    if (!id) return
    setActionLoading(true)
    const success = await deleteQuote(id)
    setActionLoading(false)
    if (success) {
      navigate('/quotes')
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

  if (!quote) {
    return (
      <div className="py-10 text-center text-muted-foreground">
        견적서를 찾을 수 없습니다.
      </div>
    )
  }

  const status = quote.status as QuoteStatus

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/quotes')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{quote.quote_number}</h1>
              <QuoteStatusBadge status={status} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              발행일: {formatDate(quote.issued_at)}
              {quote.valid_until && (
                <> / 유효기한: {formatDate(quote.valid_until)}</>
              )}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {!(quote as Record<string, unknown>).converted_invoice_id && (
            <Button
              size="sm"
              onClick={() =>
                navigate('/invoices/new', {
                  state: {
                    fromQuote: true,
                    quoteId: quote.id,
                    customerId: quote.customer_id,
                    customerName: quote.customer_name,
                    customerEmail: quote.customer_email,
                    taxType: quote.tax_type,
                    memo: quote.memo,
                    items: items.map((item) => ({
                      product_id: item.product_id,
                      name: item.name,
                      description: item.description,
                      quantity: item.quantity,
                      unit_price: item.unit_price,
                      amount: item.amount,
                      sort_order: item.sort_order,
                    })),
                  },
                })
              }
            >
              <FileText className="mr-2 h-4 w-4" />
              청구서로 변환
            </Button>
          )}
          {(quote as Record<string, unknown>).converted_invoice_id && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/invoices/${(quote as Record<string, unknown>).converted_invoice_id}`)}
            >
              <FileText className="mr-2 h-4 w-4" />
              변환된 청구서 보기
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => navigate(`/quotes/${quote.id}/edit`)}>
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
              <>
                <Button
                  size="sm"
                  onClick={() => handleStatusChange('accepted')}
                  disabled={actionLoading}
                  className="bg-green-500 hover:bg-green-600"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  수락
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleStatusChange('rejected')}
                  disabled={actionLoading}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  거절
                </Button>
              </>
            )}
            {status !== 'expired' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleStatusChange('expired')}
                disabled={actionLoading}
              >
                <Clock className="mr-2 h-4 w-4" />
                만료처리
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>거래처 정보</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <span className="text-muted-foreground">거래처명: </span>
              <span className="font-medium">{quote.customer_name}</span>
            </div>
            {quote.customer_email && (
              <div>
                <span className="text-muted-foreground">이메일: </span>
                <span>{quote.customer_email}</span>
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
              <span>{formatCurrency(quote.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                부가세 ({quote.tax_type === 'inclusive' ? '포함' : '별도'})
              </span>
              <span>{formatCurrency(quote.tax_amount)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-base font-semibold">
              <span>합계</span>
              <span>{formatCurrency(quote.total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {quote.memo && (
        <Card>
          <CardHeader>
            <CardTitle>메모</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {quote.memo}
            </p>
          </CardContent>
        </Card>
      )}

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>견적서 삭제</DialogTitle>
            <DialogDescription>
              {quote.quote_number} 견적서를 삭제하시겠습니까? 이 작업은
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
