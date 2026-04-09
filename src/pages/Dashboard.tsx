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
import { useWorkspaceStore } from '@/store/useWorkspaceStore'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { WorkspaceInvoiceStats, Invoice, InvoiceStatus, Quote, QuoteStatus, CreditNote, CreditNoteStatus } from '@/types'

export default function Dashboard() {
  const { workspace } = useWorkspaceStore()
  const navigate = useNavigate()

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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">대시보드</h1>
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

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
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
