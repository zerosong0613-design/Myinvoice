import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useWorkspaceStore } from '@/store/useWorkspaceStore'
import type { Invoice } from '@/types'

// 미수금 aging 구간
export interface AgingBucket {
  label: string
  count: number
  total: number
  invoices: Invoice[]
}

// 클라이언트별 분석
export interface CustomerAnalysis {
  customerId: string | null
  customerName: string
  customerEmail: string | null
  totalInvoices: number
  paidInvoices: number
  overdueInvoices: number
  totalRevenue: number
  totalOutstanding: number
  avgPaymentDays: number | null  // 평균 결제 소요일
  lastInvoiceDate: string | null
  riskLevel: 'good' | 'warning' | 'danger'  // 결제 위험도
  riskReason: string
}

// 전체 미수금 요약
export interface ReceivablesSummary {
  totalOutstanding: number
  totalOverdue: number
  dueThisWeek: number
  dueThisMonth: number
  aging: AgingBucket[]
  customerAnalysis: CustomerAnalysis[]
  overdueInvoices: Invoice[]
}

function daysBetween(dateA: string, dateB: string): number {
  const a = new Date(dateA)
  const b = new Date(dateB)
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24))
}

export function useReceivables() {
  const { workspace } = useWorkspaceStore()
  const [summary, setSummary] = useState<ReceivablesSummary | null>(null)
  const [loading, setLoading] = useState(false)

  const analyze = useCallback(async () => {
    if (!workspace) return
    setLoading(true)

    // 모든 청구서 조회
    const { data: allInvoices } = await supabase
      .from('invoices')
      .select('*')
      .eq('workspace_id', workspace.id)
      .order('created_at', { ascending: false })

    const invoices = (allInvoices ?? []) as Invoice[]
    const today = new Date().toISOString().split('T')[0]
    const now = new Date()
    const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const monthLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    // 미수금 = sent 또는 overdue 상태
    const outstanding = invoices.filter((inv) => inv.status === 'sent' || inv.status === 'overdue')
    const overdue = invoices.filter((inv) => {
      if (inv.status === 'overdue') return true
      if (inv.status === 'sent' && inv.due_at && inv.due_at < today) return true
      return false
    })

    // 이번 주/이번 달 납기
    const dueThisWeek = outstanding
      .filter((inv) => inv.due_at && inv.due_at >= today && inv.due_at <= weekLater)
      .reduce((sum, inv) => sum + inv.total, 0)

    const dueThisMonth = outstanding
      .filter((inv) => inv.due_at && inv.due_at >= today && inv.due_at <= monthLater)
      .reduce((sum, inv) => sum + inv.total, 0)

    // Aging 분석
    const agingBuckets: AgingBucket[] = [
      { label: '미도래', count: 0, total: 0, invoices: [] },     // 아직 납기 전
      { label: '1~30일', count: 0, total: 0, invoices: [] },     // 연체 1~30일
      { label: '31~60일', count: 0, total: 0, invoices: [] },
      { label: '61~90일', count: 0, total: 0, invoices: [] },
      { label: '90일+', count: 0, total: 0, invoices: [] },
    ]

    for (const inv of outstanding) {
      if (!inv.due_at || inv.due_at >= today) {
        agingBuckets[0].count++
        agingBuckets[0].total += inv.total
        agingBuckets[0].invoices.push(inv)
      } else {
        const overdueDays = daysBetween(inv.due_at, today)
        const idx = overdueDays <= 30 ? 1 : overdueDays <= 60 ? 2 : overdueDays <= 90 ? 3 : 4
        agingBuckets[idx].count++
        agingBuckets[idx].total += inv.total
        agingBuckets[idx].invoices.push(inv)
      }
    }

    // 클라이언트별 분석
    const customerMap = new Map<string, Invoice[]>()
    for (const inv of invoices) {
      const key = inv.customer_name
      if (!customerMap.has(key)) customerMap.set(key, [])
      customerMap.get(key)!.push(inv)
    }

    const customerAnalysis: CustomerAnalysis[] = []
    for (const [name, custInvoices] of customerMap) {
      const paid = custInvoices.filter((inv) => inv.status === 'paid')
      const unpaid = custInvoices.filter((inv) => inv.status === 'sent' || inv.status === 'overdue')
      const overdueCount = custInvoices.filter((inv) =>
        inv.status === 'overdue' || (inv.status === 'sent' && inv.due_at && inv.due_at < today)
      ).length

      // 평균 결제 소요일 계산 (발행일 → 결제완료일 추정: updated_at)
      const paymentDays: number[] = []
      for (const inv of paid) {
        if (inv.issued_at && inv.updated_at) {
          const days = daysBetween(inv.issued_at, inv.updated_at.split('T')[0])
          if (days >= 0 && days < 365) paymentDays.push(days)
        }
      }
      const avgDays = paymentDays.length > 0
        ? Math.round(paymentDays.reduce((a, b) => a + b, 0) / paymentDays.length)
        : null

      // 위험도 판정
      let riskLevel: 'good' | 'warning' | 'danger' = 'good'
      let riskReason = '정상 거래'

      if (overdueCount >= 3) {
        riskLevel = 'danger'
        riskReason = `연체 ${overdueCount}건 — 결제 위험 높음`
      } else if (overdueCount >= 1) {
        riskLevel = 'warning'
        riskReason = `연체 ${overdueCount}건 발생`
      } else if (avgDays !== null && avgDays > 45) {
        riskLevel = 'warning'
        riskReason = `평균 ${avgDays}일 걸림 — 느린 결제`
      }

      customerAnalysis.push({
        customerId: custInvoices[0].customer_id,
        customerName: name,
        customerEmail: custInvoices[0].customer_email,
        totalInvoices: custInvoices.length,
        paidInvoices: paid.length,
        overdueInvoices: overdueCount,
        totalRevenue: paid.reduce((s, inv) => s + inv.total, 0),
        totalOutstanding: unpaid.reduce((s, inv) => s + inv.total, 0),
        avgPaymentDays: avgDays,
        lastInvoiceDate: custInvoices[0]?.issued_at ?? null,
        riskLevel,
        riskReason,
      })
    }

    // 위험 높은 순 정렬
    customerAnalysis.sort((a, b) => {
      const riskOrder = { danger: 0, warning: 1, good: 2 }
      if (riskOrder[a.riskLevel] !== riskOrder[b.riskLevel]) {
        return riskOrder[a.riskLevel] - riskOrder[b.riskLevel]
      }
      return b.totalOutstanding - a.totalOutstanding
    })

    setSummary({
      totalOutstanding: outstanding.reduce((s, inv) => s + inv.total, 0),
      totalOverdue: overdue.reduce((s, inv) => s + inv.total, 0),
      dueThisWeek,
      dueThisMonth,
      aging: agingBuckets,
      customerAnalysis,
      overdueInvoices: overdue,
    })

    setLoading(false)
  }, [workspace])

  return { summary, loading, analyze }
}
