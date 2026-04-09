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
import InvoiceStatusBadge from '@/components/invoice/InvoiceStatusBadge'
import { useInvoices } from '@/hooks/useInvoices'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { InvoiceStatus } from '@/types'

const STATUS_TABS: { value: string; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'draft', label: '임시저장' },
  { value: 'sent', label: '발행완료' },
  { value: 'paid', label: '결제완료' },
  { value: 'overdue', label: '연체' },
  { value: 'cancelled', label: '취소' },
]

export default function Invoices() {
  const navigate = useNavigate()
  const { invoices, loading, fetchInvoices } = useInvoices()
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchInvoices(statusFilter)
  }, [fetchInvoices, statusFilter])

  const filtered = useMemo(
    () =>
      invoices.filter((inv) => {
        if (!search) return true
        const q = search.toLowerCase()
        return (
          inv.customer_name.toLowerCase().includes(q) ||
          inv.invoice_number.toLowerCase().includes(q)
        )
      }),
    [invoices, search]
  )

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: invoices.length }
    for (const inv of invoices) {
      counts[inv.status] = (counts[inv.status] ?? 0) + 1
    }
    return counts
  }, [invoices])

  const emptyMessages: Record<string, string> = {
    all: '등록된 청구서가 없습니다.',
    draft: '임시저장된 청구서가 없습니다.',
    sent: '발행완료된 청구서가 없습니다.',
    paid: '결제완료된 청구서가 없습니다.',
    overdue: '연체된 청구서가 없습니다.',
    cancelled: '취소된 청구서가 없습니다.',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">청구서</h1>
            <Badge variant="secondary" className="text-sm">
              {filtered.length}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            거래처에 보낼 청구서를 작성하고 관리하세요. PDF 다운로드와 이메일 발송이 가능합니다.
          </p>
        </div>
        <Link to="/invoices/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            새 청구서
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
          placeholder="거래처명 또는 청구서번호로 검색"
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
            <Link to="/invoices/new">
              <Button variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                첫 청구서 작성하기
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>청구서번호</TableHead>
                <TableHead>거래처</TableHead>
                <TableHead>발행일</TableHead>
                <TableHead>납기일</TableHead>
                <TableHead className="text-right">금액</TableHead>
                <TableHead>상태</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((invoice) => (
                <TableRow
                  key={invoice.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/invoices/${invoice.id}`)}
                >
                  <TableCell className="font-medium">
                    {invoice.invoice_number}
                  </TableCell>
                  <TableCell>{invoice.customer_name}</TableCell>
                  <TableCell>{formatDate(invoice.issued_at)}</TableCell>
                  <TableCell>
                    {invoice.due_at ? formatDate(invoice.due_at) : '-'}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(invoice.total)}
                  </TableCell>
                  <TableCell>
                    <InvoiceStatusBadge
                      status={invoice.status as InvoiceStatus}
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
