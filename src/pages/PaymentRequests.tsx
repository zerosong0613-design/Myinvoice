import { useEffect, useMemo, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Plus, Search, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import PaymentRequestStatusBadge from '@/components/invoice/PaymentRequestStatusBadge'
import { usePaymentRequests } from '@/hooks/usePaymentRequests'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { PaymentRequestStatus } from '@/types'

const STATUS_TABS: { value: string; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'draft', label: '임시저장' },
  { value: 'sent', label: '발행완료' },
  { value: 'paid', label: '지급완료' },
  { value: 'cancelled', label: '취소' },
]

export default function PaymentRequests() {
  const navigate = useNavigate()
  const { paymentRequests, loading, fetchPaymentRequests } = usePaymentRequests()
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchPaymentRequests(statusFilter)
  }, [fetchPaymentRequests, statusFilter])

  const filtered = useMemo(
    () =>
      paymentRequests.filter((pr) => {
        if (!search) return true
        const q = search.toLowerCase()
        return (
          pr.customer_name.toLowerCase().includes(q) ||
          pr.request_number.toLowerCase().includes(q)
        )
      }),
    [paymentRequests, search]
  )

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: paymentRequests.length }
    for (const pr of paymentRequests) {
      counts[pr.status] = (counts[pr.status] ?? 0) + 1
    }
    return counts
  }, [paymentRequests])

  const emptyMessages: Record<string, string> = {
    all: '등록된 지급요청서가 없습니다.',
    draft: '임시저장된 지급요청서가 없습니다.',
    sent: '발행완료된 지급요청서가 없습니다.',
    paid: '지급완료된 지급요청서가 없습니다.',
    cancelled: '취소된 지급요청서가 없습니다.',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">지급요청서</h1>
            <Badge variant="secondary" className="text-sm">
              {filtered.length}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            프리랜서·외주 용역 대금을 요청하는 지급요청서입니다. 원천세 3.3%가 자동 계산됩니다.
          </p>
        </div>
        <Link to="/payment-requests/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            새 지급요청서
          </Button>
        </Link>
      </div>

      {/* Status filter tabs */}
      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList>
          {STATUS_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5">
              {tab.label}
              {(statusCounts[tab.value] ?? 0) > 0 && (
                <span className="ml-1 text-xs text-muted-foreground">
                  {statusCounts[tab.value]}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="거래처명 또는 요청번호로 검색"
          className="pl-9"
        />
      </div>

      {/* Table */}
      {loading ? (
        <p className="py-10 text-center text-muted-foreground">
          불러오는 중...
        </p>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
          <FileText className="h-12 w-12" />
          <p>{search ? '검색 결과가 없습니다.' : emptyMessages[statusFilter]}</p>
          {!search && statusFilter === 'all' && (
            <Link to="/payment-requests/new">
              <Button variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                첫 지급요청서 작성하기
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>번호</TableHead>
                <TableHead>거래처</TableHead>
                <TableHead>발행일</TableHead>
                <TableHead className="text-right">공급가액</TableHead>
                <TableHead className="text-right">원천세</TableHead>
                <TableHead className="text-right">실지급액</TableHead>
                <TableHead>상태</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((pr) => (
                <TableRow
                  key={pr.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/payment-requests/${pr.id}`)}
                >
                  <TableCell className="font-medium">
                    {pr.request_number}
                  </TableCell>
                  <TableCell>{pr.customer_name}</TableCell>
                  <TableCell>{formatDate(pr.issued_at)}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(pr.subtotal)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(pr.withholding_tax)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(pr.net_amount)}
                  </TableCell>
                  <TableCell>
                    <PaymentRequestStatusBadge
                      status={pr.status as PaymentRequestStatus}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
