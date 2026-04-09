import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { FileText, Loader2 } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'

interface ShareData {
  type: 'invoice' | 'quote' | 'credit_note'
  document: Record<string, unknown>
  items: Record<string, unknown>[]
  workspace: Record<string, unknown>
}

const TYPE_TITLES: Record<string, string> = {
  invoice: '청구서',
  quote: '견적서',
  credit_note: '신용전표',
}

export default function ShareView() {
  const { token } = useParams<{ token: string }>()
  const [data, setData] = useState<ShareData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) return

    const load = async () => {
      // 1. 토큰으로 공유 링크 조회
      const { data: link, error: linkError } = await supabase
        .from('share_links')
        .select('*')
        .eq('token', token)
        .single()

      if (linkError || !link) {
        setError('유효하지 않은 공유 링크입니다.')
        setLoading(false)
        return
      }

      if (link.expires_at && new Date(link.expires_at) < new Date()) {
        setError('만료된 공유 링크입니다.')
        setLoading(false)
        return
      }

      const docType = link.document_type as string
      const docId = link.document_id as string

      // 2. 문서 + 아이템 + 워크스페이스 조회
      const tableName = docType === 'invoice' ? 'invoices'
        : docType === 'quote' ? 'quotes' : 'credit_notes'
      const itemsTable = docType === 'invoice' ? 'invoice_items'
        : docType === 'quote' ? 'quote_items' : 'credit_note_items'
      const itemFk = docType === 'invoice' ? 'invoice_id'
        : docType === 'quote' ? 'quote_id' : 'credit_note_id'

      const [docRes, itemsRes, wsRes] = await Promise.all([
        supabase.from(tableName).select('*').eq('id', docId).single(),
        supabase.from(itemsTable).select('*').eq(itemFk, docId).order('sort_order'),
        supabase.from('workspaces').select('*').eq('id', link.workspace_id).single(),
      ])

      if (docRes.error || !docRes.data) {
        setError('문서를 찾을 수 없습니다.')
        setLoading(false)
        return
      }

      setData({
        type: docType as ShareData['type'],
        document: docRes.data,
        items: itemsRes.data ?? [],
        workspace: wsRes.data ?? {},
      })
      setLoading(false)
    }
    load()
  }, [token])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40">
        <Card className="max-w-sm">
          <CardContent className="flex flex-col items-center gap-3 py-10">
            <FileText className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { type, document: doc, items, workspace: ws } = data
  const title = TYPE_TITLES[type] ?? '문서'
  const docNumber = (doc.invoice_number ?? doc.quote_number ?? doc.credit_note_number) as string

  return (
    <div className="min-h-screen bg-muted/40 py-8">
      <div className="mx-auto max-w-3xl space-y-6 px-4">
        {/* 헤더 */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground">{ws.name as string}</p>
          <h1 className="mt-1 text-2xl font-bold">{title}</h1>
          <p className="mt-1 text-lg font-medium text-primary">{docNumber}</p>
        </div>

        {/* 정보 */}
        <Card>
          <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">발행처</p>
              <p className="font-medium">{String(ws.name ?? '')}</p>
              {Boolean(ws.biz_number) && <p className="text-sm text-muted-foreground">사업자번호: {String(ws.biz_number)}</p>}
              {Boolean(ws.address) && <p className="text-sm text-muted-foreground">{String(ws.address)}</p>}
              {Boolean(ws.phone) && <p className="text-sm text-muted-foreground">TEL: {String(ws.phone)}</p>}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">수신처</p>
              <p className="font-medium">{String(doc.customer_name ?? '')}</p>
              {Boolean(doc.customer_email) && <p className="text-sm text-muted-foreground">{String(doc.customer_email)}</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex gap-6 pt-6 text-sm">
            <div>
              <span className="text-muted-foreground">발행일: </span>
              <span className="font-medium">{formatDate(String(doc.issued_at))}</span>
            </div>
            {Boolean(doc.due_at) && (
              <div>
                <span className="text-muted-foreground">납기일: </span>
                <span className="font-medium">{formatDate(String(doc.due_at))}</span>
              </div>
            )}
            {Boolean(doc.valid_until) && (
              <div>
                <span className="text-muted-foreground">유효기한: </span>
                <span className="font-medium">{formatDate(String(doc.valid_until))}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 품목 */}
        <Card>
          <CardHeader>
            <CardTitle>품목 내역</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>품목명</TableHead>
                    <TableHead>설명</TableHead>
                    <TableHead className="text-right">수량</TableHead>
                    <TableHead className="text-right">단가</TableHead>
                    <TableHead className="text-right">금액</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{item.name as string}</TableCell>
                      <TableCell className="text-muted-foreground">{(item.description as string) ?? '-'}</TableCell>
                      <TableCell className="text-right">{item.quantity as number}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.unit_price as number)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(item.amount as number)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* 합계 */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">공급가액</span>
                <span>{formatCurrency(doc.subtotal as number)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">부가세</span>
                <span>{formatCurrency(doc.tax_amount as number)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>합계</span>
                <span className="text-primary">{formatCurrency(doc.total as number)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {Boolean(doc.memo) && (
          <Card>
            <CardHeader><CardTitle>비고</CardTitle></CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{String(doc.memo)}</p>
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-muted-foreground">
          마이인보이스로 생성된 문서입니다.
        </p>
      </div>
    </div>
  )
}
