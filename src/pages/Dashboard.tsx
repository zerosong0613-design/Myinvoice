import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  DollarSign,
  Clock,
  AlertTriangle,
  FileText,
  Plus,
  ClipboardList,
  CreditCard,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import InvoiceStatusBadge from '@/components/invoice/InvoiceStatusBadge'
import QuoteStatusBadge from '@/components/invoice/QuoteStatusBadge'
import CreditNoteStatusBadge from '@/components/invoice/CreditNoteStatusBadge'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import { useWorkspaceStore } from '@/store/useWorkspaceStore'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { WorkspaceInvoiceStats, Invoice, InvoiceStatus, Quote, QuoteStatus, CreditNote, CreditNoteStatus } from '@/types'

export default function Dashboard() {
  const { user } = useAuthStore()
  const { workspace } = useWorkspaceStore()
  const navigate = useNavigate()

  // 사용자 이름 추출 (Google OAuth에서 이름 가져오기)
  const userName = user?.user_metadata?.full_name
    || user?.user_metadata?.name
    || user?.email?.split('@')[0]
    || '사용자'

  const [stats, setStats] = useState<WorkspaceInvoiceStats | null>(null)
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([])
  const [recentQuotes, setRecentQuotes] = useState<Quote[]>([])
  const [recentCreditNotes, setRecentCreditNotes] = useState<CreditNote[]>([])
  const [pendingQuotesCount, setPendingQuotesCount] = useState(0)
  const [creditNotesTotal, setCreditNotesTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!workspace) return
      setLoading(true)

      const [statsRes, invoicesRes, quotesRes, creditNotesRes, pendingQuotesRes, cnTotalRes] = await Promise.all([
        supabase
          .from('workspace_invoice_stats')
          .select('*')
          .eq('workspace_id', workspace.id)
          .single(),
        supabase
          .from('invoices')
          .select('*')
          .eq('workspace_id', workspace.id)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('quotes')
          .select('*')
          .eq('workspace_id', workspace.id)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('credit_notes')
          .select('*')
          .eq('workspace_id', workspace.id)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('quotes')
          .select('id', { count: 'exact', head: true })
          .eq('workspace_id', workspace.id)
          .in('status', ['draft', 'sent']),
        supabase
          .from('credit_notes')
          .select('total')
          .eq('workspace_id', workspace.id)
          .in('status', ['sent', 'applied']),
      ])

      if (statsRes.data) setStats(statsRes.data as WorkspaceInvoiceStats)
      if (invoicesRes.data) setRecentInvoices(invoicesRes.data as Invoice[])
      if (quotesRes.data) setRecentQuotes(quotesRes.data as Quote[])
      if (creditNotesRes.data) setRecentCreditNotes(creditNotesRes.data as CreditNote[])
      setPendingQuotesCount(pendingQuotesRes.count ?? 0)
      setCreditNotesTotal(
        (cnTotalRes.data ?? []).reduce((sum: number, cn: { total: number }) => sum + cn.total, 0)
      )

      setLoading(false)
    }
    load()
  }, [workspace])

  const totalCount =
    stats
      ? stats.paid_count + stats.overdue_count + stats.sent_count + stats.draft_count
      : 0

  if (loading) {
    return (
      <div className="py-10 text-center text-muted-foreground">
        불러오는 중...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 환영 메시지 */}
      <div className="rounded-xl border bg-card p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">안녕하세요, {userName}님!</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {workspace?.name}의 청구서와 견적서를 한눈에 관리하세요.
            </p>
          </div>
          <div className="flex gap-2">
            <Link to="/invoices/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                새 청구서
              </Button>
            </Link>
            <Link to="/quotes/new">
              <Button variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                새 견적서
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 초보자 안내 — 문서가 하나도 없을 때 */}
      {totalCount === 0 && recentQuotes.length === 0 && (
        <div className="rounded-xl border border-dashed p-6">
          <h3 className="font-semibold">처음이신가요? 이렇게 시작해보세요!</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Link to="/customers" className="group rounded-lg border p-4 transition-colors hover:border-primary hover:bg-primary/5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-600">1</div>
              <p className="mt-3 font-medium group-hover:text-primary">거래처 등록</p>
              <p className="mt-1 text-xs text-muted-foreground">
                자주 거래하는 업체를 등록하면 문서 작성이 훨씬 빨라져요.
              </p>
            </Link>
            <Link to="/quotes/new" className="group rounded-lg border p-4 transition-colors hover:border-primary hover:bg-primary/5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-sm font-bold text-green-600">2</div>
              <p className="mt-3 font-medium group-hover:text-primary">견적서 작성</p>
              <p className="mt-1 text-xs text-muted-foreground">
                견적서를 보내고, 고객이 수락하면 청구서로 바로 변환할 수 있어요.
              </p>
            </Link>
            <Link to="/invoices/new" className="group rounded-lg border p-4 transition-colors hover:border-primary hover:bg-primary/5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-sm font-bold text-purple-600">3</div>
              <p className="mt-3 font-medium group-hover:text-primary">청구서 발행</p>
              <p className="mt-1 text-xs text-muted-foreground">
                PDF 다운로드, 이메일 발송까지 한 곳에서 해결하세요.
              </p>
            </Link>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">이번 달 매출</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats?.total_revenue ?? 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">미수금</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats?.total_outstanding ?? 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">연체</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats?.total_overdue ?? 0)}
            </div>
            {(stats?.overdue_count ?? 0) > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                {stats!.overdue_count}건
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">청구서</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">진행 중 견적</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingQuotesCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">신용전표 합계</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(creditNotesTotal)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent invoices */}
      <Card>
        <CardHeader>
          <CardTitle>최근 청구서</CardTitle>
        </CardHeader>
        <CardContent>
          {recentInvoices.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              등록된 청구서가 없습니다.
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>청구서번호</TableHead>
                    <TableHead>거래처</TableHead>
                    <TableHead>발행일</TableHead>
                    <TableHead className="text-right">금액</TableHead>
                    <TableHead>상태</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentInvoices.map((invoice) => (
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
        </CardContent>
      </Card>
      {/* Recent Quotes */}
      <Card>
        <CardHeader>
          <CardTitle>최근 견적서</CardTitle>
        </CardHeader>
        <CardContent>
          {recentQuotes.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              등록된 견적서가 없습니다.
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>견적서번호</TableHead>
                    <TableHead>거래처</TableHead>
                    <TableHead>발행일</TableHead>
                    <TableHead className="text-right">금액</TableHead>
                    <TableHead>상태</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentQuotes.map((quote) => (
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
                      <TableCell className="text-right font-medium">
                        {formatCurrency(quote.total)}
                      </TableCell>
                      <TableCell>
                        <QuoteStatusBadge status={quote.status as QuoteStatus} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Credit Notes */}
      {recentCreditNotes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>최근 신용전표</CardTitle>
          </CardHeader>
          <CardContent>
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
                  {recentCreditNotes.map((cn) => (
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
                        <CreditNoteStatusBadge status={cn.status as CreditNoteStatus} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
