import { useEffect, useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { useWorkspaceStore } from '@/store/useWorkspaceStore'
import { formatCurrency } from '@/lib/utils'
import type { MonthlyRevenue } from '@/types'

function formatMonth(month: string): string {
  // month is "YYYY-MM" format
  const [year, m] = month.split('-')
  return `${year}년 ${parseInt(m, 10)}월`
}

export default function Statistics() {
  const { workspace } = useWorkspaceStore()
  const [data, setData] = useState<MonthlyRevenue[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!workspace) return
      setLoading(true)

      const { data: rows } = await supabase
        .from('monthly_revenue')
        .select('*')
        .eq('workspace_id', workspace.id)
        .order('month', { ascending: true })
        .limit(12)

      setData((rows ?? []) as MonthlyRevenue[])
      setLoading(false)
    }
    load()
  }, [workspace])

  const totalRevenue = data.reduce((sum, d) => sum + d.paid_total, 0)
  const totalInvoices = data.reduce((sum, d) => sum + d.invoice_count, 0)
  const totalAll = data.reduce((sum, d) => sum + d.total, 0)

  if (loading) {
    return (
      <div className="py-10 text-center text-muted-foreground">
        불러오는 중...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">통계</h1>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">총 결제 금액</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalRevenue)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">총 청구 금액</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalAll)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">총 청구서 수</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalInvoices}건</div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>월별 매출 현황</CardTitle>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              통계 데이터가 없습니다.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={data.map((d) => ({
                  ...d,
                  monthLabel: formatMonth(d.month),
                }))}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="monthLabel" fontSize={12} />
                <YAxis
                  fontSize={12}
                  tickFormatter={(value: number) => formatCurrency(value)}
                />
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value))}
                />
                <Legend />
                <Bar
                  dataKey="total"
                  name="전체"
                  fill="#94a3b8"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="paid_total"
                  name="결제완료"
                  fill="#22c55e"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
