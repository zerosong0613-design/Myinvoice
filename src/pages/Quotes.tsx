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
import QuoteStatusBadge from '@/components/invoice/QuoteStatusBadge'
import { useQuotes } from '@/hooks/useQuotes'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { QuoteStatus } from '@/types'

const STATUS_TABS: { value: string; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'draft', label: '임시저장' },
  { value: 'sent', label: '발행완료' },
  { value: 'accepted', label: '수락됨' },
  { value: 'rejected', label: '거절됨' },
  { value: 'expired', label: '만료됨' },
]

export default function Quotes() {
  const navigate = useNavigate()
  const { quotes, loading, fetchQuotes } = useQuotes()
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchQuotes(statusFilter)
  }, [fetchQuotes, statusFilter])

  const filtered = useMemo(
    () =>
      quotes.filter((q) => {
        if (!search) return true
        const s = search.toLowerCase()
        return (
          q.customer_name.toLowerCase().includes(s) ||
          q.quote_number.toLowerCase().includes(s)
        )
      }),
    [quotes, search]
  )

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: quotes.length }
    for (const q of quotes) {
      counts[q.status] = (counts[q.status] ?? 0) + 1
    }
    return counts
  }, [quotes])

  const emptyMessages: Record<string, string> = {
    all: '등록된 견적서가 없습니다.',
    draft: '임시저장된 견적서가 없습니다.',
    sent: '발행완료된 견적서가 없습니다.',
    accepted: '수락된 견적서가 없습니다.',
    rejected: '거절된 견적서가 없습니다.',
    expired: '만료된 견적서가 없습니다.',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">견적서</h1>
            <Badge variant="secondary" className="text-sm">
              {filtered.length}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            거래 전 가격을 제안하는 견적서입니다. 고객이 수락하면 청구서로 바로 변환할 수 있어요.
          </p>
        </div>
        <Link to="/quotes/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            새 견적서
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
          placeholder="거래처명 또는 견적번호로 검색"
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
            <Link to="/quotes/new">
              <Button variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                첫 견적서 작성하기
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>견적번호</TableHead>
                <TableHead>거래처</TableHead>
                <TableHead>발행일</TableHead>
                <TableHead>유효기한</TableHead>
                <TableHead className="text-right">금액</TableHead>
                <TableHead>상태</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((quote) => (
                <TableRow
                  key={quote.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/quotes/${quote.id}`)}
                >
                  <TableCell className="font-medium">
                    {quote.quote_number}
                  </TableCell>
                  <TableCell>{quote.customer_name}</TableCell>
                  <TableCell>{formatDate(quote.issued_at)}</TableCell>
                  <TableCell>
                    {quote.valid_until ? formatDate(quote.valid_until) : '-'}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(quote.total)}
                  </TableCell>
                  <TableCell>
                    <QuoteStatusBadge
                      status={quote.status as QuoteStatus}
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
