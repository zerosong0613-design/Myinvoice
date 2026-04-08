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
import CreditNoteStatusBadge from '@/components/invoice/CreditNoteStatusBadge'
import { useCreditNotes } from '@/hooks/useCreditNotes'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { CreditNoteStatus } from '@/types'

const STATUS_TABS: { value: string; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'draft', label: '임시저장' },
  { value: 'sent', label: '발송됨' },
  { value: 'applied', label: '적용됨' },
]

export default function CreditNotes() {
  const navigate = useNavigate()
  const { creditNotes, loading, fetchCreditNotes } = useCreditNotes()
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchCreditNotes(statusFilter)
  }, [fetchCreditNotes, statusFilter])

  const filtered = useMemo(
    () =>
      creditNotes.filter((cn) => {
        if (!search) return true
        const s = search.toLowerCase()
        return (
          cn.customer_name.toLowerCase().includes(s) ||
          cn.credit_note_number.toLowerCase().includes(s)
        )
      }),
    [creditNotes, search]
  )

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: creditNotes.length }
    for (const cn of creditNotes) {
      counts[cn.status] = (counts[cn.status] ?? 0) + 1
    }
    return counts
  }, [creditNotes])

  const emptyMessages: Record<string, string> = {
    all: '등록된 신용전표가 없습니다.',
    draft: '임시저장된 신용전표가 없습니다.',
    sent: '발송된 신용전표가 없습니다.',
    applied: '적용된 신용전표가 없습니다.',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">신용전표</h1>
          <Badge variant="secondary" className="text-sm">
            {filtered.length}
          </Badge>
        </div>
        <Link to="/credit-notes/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            새 신용전표
          </Button>
        </Link>
      </div>

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

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="거래처명 또는 전표번호로 검색"
          className="pl-9"
        />
      </div>

      {loading ? (
        <p className="py-10 text-center text-muted-foreground">
          불러오는 중...
        </p>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
          <FileText className="h-12 w-12" />
          <p>{search ? '검색 결과가 없습니다.' : emptyMessages[statusFilter]}</p>
          {!search && statusFilter === 'all' && (
            <Link to="/credit-notes/new">
              <Button variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                첫 신용전표 작성하기
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>전표번호</TableHead>
                <TableHead>거래처</TableHead>
                <TableHead>발행일</TableHead>
                <TableHead className="text-right">금액</TableHead>
                <TableHead>상태</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((cn) => (
                <TableRow
                  key={cn.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/credit-notes/${cn.id}`)}
                >
                  <TableCell className="font-medium">
                    {cn.credit_note_number}
                  </TableCell>
                  <TableCell>{cn.customer_name}</TableCell>
                  <TableCell>{formatDate(cn.issued_at)}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(cn.total)}
                  </TableCell>
                  <TableCell>
                    <CreditNoteStatusBadge
                      status={cn.status as CreditNoteStatus}
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
