import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  Clock,
  TrendingUp,
  CalendarClock,
  ShieldAlert,
  ShieldCheck,
  Shield,
  Mail,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
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
import { useReceivables } from '@/hooks/useReceivables'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { InvoiceStatus } from '@/types'
import InvoiceStatusBadge from '@/components/invoice/InvoiceStatusBadge'

function RiskBadge({ level, reason }: { level: string; reason: string }) {
  if (level === 'danger') return <Badge variant="destructive" title={reason}><ShieldAlert className="mr-1 h-3 w-3" />위험</Badge>
  if (level === 'warning') return <Badge className="bg-yellow-500 hover:bg-yellow-600" title={reason}><Shield className="mr-1 h-3 w-3" />주의</Badge>
  return <Badge variant="secondary" title={reason}><ShieldCheck className="mr-1 h-3 w-3" />양호</Badge>
}

export default function Receivables() {
  const navigate = useNavigate()
  const { summary, loading, analyze } = useReceivables()

  useEffect(() => {
    analyze()
  }, [analyze])

  if (loading || !summary) {
    return <div className="py-10 text-center text-muted-foreground">분석 중...</div>
  }

  const { totalOutstanding, totalOverdue, dueThisWeek, dueThisMonth, aging, customerAnalysis, overdueInvoices } = summary

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">미수금 관리</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          받아야 할 돈을 한눈에 파악하고, 연체 고객을 관리하세요.
        </p>
      </div>

      {/* KPI */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 미수금</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalOutstanding)}</div>
          </CardContent>
        </Card>
        <Card className={totalOverdue > 0 ? 'border-destructive/50' : ''}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">연체 금액</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalOverdue > 0 ? 'text-destructive' : ''}`}>
              {formatCurrency(totalOverdue)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">이번 주 납기</CardTitle>
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(dueThisWeek)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">이번 달 납기</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(dueThisMonth)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Aging 분석 */}
      <Card>
        <CardHeader>
          <CardTitle>연체 기간별 분석 (Aging)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-2">
            {aging.map((bucket) => (
              <div
                key={bucket.label}
                className={`rounded-lg border p-3 text-center ${
                  bucket.label === '90일+' && bucket.count > 0 ? 'border-destructive bg-destructive/5' :
                  bucket.label === '61~90일' && bucket.count > 0 ? 'border-yellow-500 bg-yellow-50' : ''
                }`}
              >
                <p className="text-xs text-muted-foreground">{bucket.label}</p>
                <p className="mt-1 text-lg font-bold">{formatCurrency(bucket.total)}</p>
                <p className="text-xs text-muted-foreground">{bucket.count}건</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 연체 청구서 */}
      {overdueInvoices.length > 0 && (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              연체 청구서 ({overdueInvoices.length}건)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>청구서번호</TableHead>
                    <TableHead>거래처</TableHead>
                    <TableHead>납기일</TableHead>
                    <TableHead>연체일수</TableHead>
                    <TableHead className="text-right">금액</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overdueInvoices.map((inv) => {
                    const overdueDays = inv.due_at
                      ? Math.max(0, Math.floor((Date.now() - new Date(inv.due_at).getTime()) / (1000 * 60 * 60 * 24)))
                      : 0
                    return (
                      <TableRow key={inv.id} className="cursor-pointer" onClick={() => navigate(`/invoices/${inv.id}`)}>
                        <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                        <TableCell>{inv.customer_name}</TableCell>
                        <TableCell>{inv.due_at ? formatDate(inv.due_at) : '-'}</TableCell>
                        <TableCell>
                          <span className={`font-medium ${overdueDays > 30 ? 'text-destructive' : 'text-yellow-600'}`}>
                            D+{overdueDays}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(inv.total)}</TableCell>
                        <TableCell><InvoiceStatusBadge status={inv.status as InvoiceStatus} /></TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={(e) => {
                              e.stopPropagation()
                              navigate(`/invoices/${inv.id}`)
                            }}
                          >
                            <Mail className="mr-1 h-3 w-3" />
                            독촉
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 클라이언트별 분석 */}
      <Card>
        <CardHeader>
          <CardTitle>클라이언트별 결제 분석</CardTitle>
        </CardHeader>
        <CardContent>
          {customerAnalysis.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">거래 이력이 없습니다.</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>거래처</TableHead>
                    <TableHead>위험도</TableHead>
                    <TableHead className="text-right">총 거래</TableHead>
                    <TableHead className="text-right">미수금</TableHead>
                    <TableHead className="text-right">연체</TableHead>
                    <TableHead className="text-right">평균 결제일</TableHead>
                    <TableHead className="text-right">총 매출</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customerAnalysis.map((c) => (
                    <TableRow key={c.customerName}>
                      <TableCell className="font-medium">{c.customerName}</TableCell>
                      <TableCell><RiskBadge level={c.riskLevel} reason={c.riskReason} /></TableCell>
                      <TableCell className="text-right">{c.totalInvoices}건</TableCell>
                      <TableCell className="text-right">
                        {c.totalOutstanding > 0 ? (
                          <span className="font-medium text-blue-600">{formatCurrency(c.totalOutstanding)}</span>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {c.overdueInvoices > 0 ? (
                          <span className="font-medium text-destructive">{c.overdueInvoices}건</span>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {c.avgPaymentDays !== null ? (
                          <span className={c.avgPaymentDays > 30 ? 'text-yellow-600 font-medium' : ''}>
                            {c.avgPaymentDays}일
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(c.totalRevenue)}</TableCell>
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
