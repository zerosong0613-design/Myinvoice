import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  DollarSign,
  Clock,
  AlertTriangle,
  FileText,
  Plus,
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
import { supabase } from '@/lib/supabase'
import { useWorkspaceStore } from '@/store/useWorkspaceStore'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { WorkspaceInvoiceStats, Invoice, InvoiceStatus } from '@/types'

export default function Dashboard() {
  const { workspace } = useWorkspaceStore()
  const navigate = useNavigate()

  const [stats, setStats] = useState<WorkspaceInvoiceStats | null>(null)
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!workspace) return
      setLoading(true)

      const [statsRes, invoicesRes] = await Promise.all([
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
      ])

      if (statsRes.data) {
        setStats(statsRes.data as WorkspaceInvoiceStats)
      }
      if (invoicesRes.data) {
        setRecentInvoices(invoicesRes.data as Invoice[])
      }

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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
            <CardTitle className="text-sm font-medium">청구서 수</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
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
    </div>
  )
}
