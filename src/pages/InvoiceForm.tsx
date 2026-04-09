import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { ArrowLeft, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useInvoices, type InvoiceItemInput } from '@/hooks/useInvoices'
import { useCustomers } from '@/hooks/useCustomers'
import { useProducts } from '@/hooks/useProducts'
import { useWorkspaceStore } from '@/store/useWorkspaceStore'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import type { InvoiceStatus, TaxType } from '@/types'

function today() {
  return new Date().toISOString().split('T')[0]
}

function emptyItem(): InvoiceItemInput {
  return {
    product_id: null,
    name: '',
    description: null,
    quantity: 1,
    unit_price: 0,
    amount: 0,
    sort_order: 0,
  }
}

interface QuoteConvertState {
  fromQuote: true
  quoteId: string
  customerId: string | null
  customerName: string
  customerEmail: string | null
  taxType: 'inclusive' | 'exclusive'
  memo: string | null
  items: InvoiceItemInput[]
}

export default function InvoiceForm() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const location = useLocation()
  const quoteState = location.state as QuoteConvertState | null
  const { workspace } = useWorkspaceStore()

  const {
    getInvoice,
    getNextInvoiceNumber,
    createInvoice,
    updateInvoice,
    error,
  } = useInvoices()
  const { customers, fetchCustomers } = useCustomers()
  const { products, fetchProducts } = useProducts()

  // Form state
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [customerId, setCustomerId] = useState<string | null>(quoteState?.customerId ?? null)
  const [customerName, setCustomerName] = useState(quoteState?.customerName ?? '')
  const [customerEmail, setCustomerEmail] = useState<string | null>(quoteState?.customerEmail ?? null)
  const defaultDueDays = workspace?.default_due_days ?? 30
  const defaultDueDate = () => {
    const d = new Date()
    d.setDate(d.getDate() + defaultDueDays)
    return d.toISOString().split('T')[0]
  }

  const [issuedAt, setIssuedAt] = useState(today())
  const [dueAt, setDueAt] = useState(defaultDueDate())
  const [taxType, setTaxType] = useState<TaxType>(quoteState?.taxType ?? (workspace?.default_tax_type as TaxType) ?? 'exclusive')
  const [memo, setMemo] = useState(quoteState?.memo ?? workspace?.default_memo ?? '')
  const [items, setItems] = useState<InvoiceItemInput[]>(
    quoteState?.items && quoteState.items.length > 0 ? quoteState.items : [emptyItem()]
  )
  const [saving, setSaving] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [sourceQuoteId] = useState<string | null>(quoteState?.quoteId ?? null)

  // Load supporting data
  useEffect(() => {
    fetchCustomers()
    fetchProducts()
  }, [fetchCustomers, fetchProducts])

  // Load invoice for editing, or generate next number for new (including quote conversion)
  useEffect(() => {
    async function init() {
      setPageLoading(true)
      if (isEdit && id) {
        const result = await getInvoice(id)
        if (result) {
          const { invoice, items: invoiceItems } = result
          setInvoiceNumber(invoice.invoice_number)
          setCustomerId(invoice.customer_id)
          setCustomerName(invoice.customer_name)
          setCustomerEmail(invoice.customer_email)
          setIssuedAt(invoice.issued_at)
          setDueAt(invoice.due_at ?? '')
          setTaxType(invoice.tax_type)
          setMemo(invoice.memo ?? '')
          setItems(
            invoiceItems.length > 0
              ? invoiceItems.map((item) => ({
                  product_id: item.product_id,
                  name: item.name,
                  description: item.description,
                  quantity: item.quantity,
                  unit_price: item.unit_price,
                  amount: item.amount,
                  sort_order: item.sort_order,
                }))
              : [emptyItem()]
          )
        }
      } else {
        // 새 청구서 — 번호만 생성 (견적서 변환의 경우 데이터는 이미 state로 pre-fill됨)
        const nextNumber = await getNextInvoiceNumber()
        setInvoiceNumber(nextNumber)
      }
      setPageLoading(false)
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEdit])

  // Item management
  const updateItem = useCallback(
    (index: number, updates: Partial<InvoiceItemInput>) => {
      setItems((prev) =>
        prev.map((item, i) => {
          if (i !== index) return item
          const updated = { ...item, ...updates }
          // Recalculate amount when quantity or unit_price changes
          if ('quantity' in updates || 'unit_price' in updates) {
            updated.amount = Math.round(updated.quantity * updated.unit_price)
          }
          return updated
        })
      )
    },
    []
  )

  const addItem = () => setItems((prev) => [...prev, emptyItem()])

  const removeItem = (index: number) => {
    setItems((prev) => {
      if (prev.length <= 1) return prev
      return prev.filter((_, i) => i !== index)
    })
  }

  const handleProductSelect = (index: number, productId: string) => {
    if (productId === '__custom__') {
      updateItem(index, { product_id: null, name: '', unit_price: 0, amount: 0 })
      return
    }
    const product = products.find((p) => p.id === productId)
    if (product) {
      const quantity = items[index].quantity || 1
      updateItem(index, {
        product_id: product.id,
        name: product.name,
        description: product.description,
        unit_price: product.unit_price,
        amount: Math.round(quantity * product.unit_price),
      })
    }
  }

  const handleCustomerSelect = (value: string) => {
    if (value === '__custom__') {
      setCustomerId(null)
      setCustomerName('')
      setCustomerEmail(null)
      return
    }
    const customer = customers.find((c) => c.id === value)
    if (customer) {
      setCustomerId(customer.id)
      setCustomerName(customer.name)
      setCustomerEmail(customer.email)
    }
  }

  // Calculated totals
  const subtotalRaw = items.reduce((sum, item) => sum + item.amount, 0)
  let displaySubtotal: number
  let displayTax: number
  let displayTotal: number

  if (taxType === 'inclusive') {
    displayTotal = subtotalRaw
    displayTax = Math.round(displayTotal - displayTotal / 1.1)
    displaySubtotal = displayTotal - displayTax
  } else {
    displaySubtotal = subtotalRaw
    displayTax = Math.round(displaySubtotal * 0.1)
    displayTotal = displaySubtotal + displayTax
  }

  const handleSave = async (status: InvoiceStatus) => {
    if (!customerName.trim()) {
      alert('거래처를 선택하거나 입력해주세요.')
      return
    }
    if (items.every((item) => !item.name.trim())) {
      alert('최소 하나의 품목을 입력해주세요.')
      return
    }

    setSaving(true)
    const input = {
      customer_id: customerId,
      customer_name: customerName.trim(),
      customer_email: customerEmail,
      issued_at: issuedAt,
      due_at: dueAt || null,
      status,
      tax_type: taxType,
      memo: memo.trim() || null,
      source_quote_id: sourceQuoteId,
    }

    const validItems = items
      .filter((item) => item.name.trim())
      .map((item, idx) => ({ ...item, sort_order: idx }))

    let result
    if (isEdit && id) {
      result = await updateInvoice(id, input, validItems)
    } else {
      result = await createInvoice(input, validItems)
    }

    // 견적서 변환인 경우, 원본 견적서에 converted_invoice_id 업데이트
    if (result && sourceQuoteId) {
      try {
        await supabase
          .from('quotes')
          .update({ converted_invoice_id: result.id, status: 'accepted' } as unknown as Record<string, never>)
          .eq('id', sourceQuoteId)
      } catch {
        // converted_invoice_id 컬럼이 없어도 상태만이라도 변경
        await supabase
          .from('quotes')
          .update({ status: 'accepted' })
          .eq('id', sourceQuoteId)
      }
    }

    setSaving(false)
    if (result) {
      navigate(`/invoices/${result.id}`)
    }
  }

  if (pageLoading) {
    return (
      <div className="py-10 text-center text-muted-foreground">
        불러오는 중...
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            {isEdit ? '청구서 수정' : '새 청구서'}
          </h1>
          {sourceQuoteId ? (
            <p className="text-sm text-muted-foreground">
              견적서에서 변환 중입니다. 내용을 확인 후 저장하세요.
            </p>
          ) : !isEdit && (
            <p className="text-sm text-muted-foreground">
              거래처와 품목을 입력하고, 임시저장 또는 바로 발행할 수 있어요.
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* A. 기본 정보 */}
      <Card>
        <CardHeader>
          <CardTitle>기본 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>청구서 번호</Label>
              <Input value={invoiceNumber} disabled />
            </div>
            <div className="space-y-2">
              <Label>부가세 유형</Label>
              <Select
                value={taxType}
                onValueChange={(v) => v && setTaxType(v as TaxType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="exclusive">별도</SelectItem>
                  <SelectItem value="inclusive">포함</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>거래처</Label>
            <Select
              value={customerId ?? '__custom__'}
              onValueChange={(v) => v && handleCustomerSelect(v)}
            >
              <SelectTrigger>
                <SelectValue>
                  {customerId
                    ? (customers.find((c) => c.id === customerId)?.name || customerName || '거래처 불러오는 중...')
                    : '직접 입력'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__custom__">직접 입력</SelectItem>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!customerId && (
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="거래처명 입력"
                className="mt-2"
              />
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>발행일</Label>
              <Input
                type="date"
                value={issuedAt}
                onChange={(e) => setIssuedAt(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>납기일</Label>
              <Input
                type="date"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* B. 품목 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>품목 목록</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.map((item, index) => (
            <div key={index} className="space-y-3 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  품목 {index + 1}
                </span>
                {items.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => removeItem(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>품목 선택</Label>
                  <Select
                    value={item.product_id ?? '__custom__'}
                    onValueChange={(v) => v && handleProductSelect(index, v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="품목 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__custom__">직접 입력</SelectItem>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} ({formatCurrency(p.unit_price)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {!item.product_id && (
                  <div className="space-y-2">
                    <Label>품목명</Label>
                    <Input
                      value={item.name}
                      onChange={(e) =>
                        updateItem(index, { name: e.target.value })
                      }
                      placeholder="품목명 입력"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>설명</Label>
                <Input
                  value={item.description ?? ''}
                  onChange={(e) =>
                    updateItem(index, {
                      description: e.target.value || null,
                    })
                  }
                  placeholder="품목 설명 (선택)"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>수량</Label>
                  <Input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(index, {
                        quantity: Math.max(1, Number(e.target.value) || 1),
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>단가</Label>
                  <Input
                    type="number"
                    min={0}
                    value={item.unit_price}
                    onChange={(e) =>
                      updateItem(index, {
                        unit_price: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>금액</Label>
                  <Input
                    value={formatCurrency(item.amount)}
                    disabled
                    className="text-right"
                  />
                </div>
              </div>
            </div>
          ))}

          <Button variant="outline" onClick={addItem} className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            품목 추가
          </Button>
        </CardContent>
      </Card>

      {/* C. 금액 요약 */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">공급가액</span>
              <span>{formatCurrency(displaySubtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">부가세 (10%)</span>
              <span>{formatCurrency(displayTax)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-base font-semibold">
              <span>합계</span>
              <span>{formatCurrency(displayTotal)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* D. 메모 */}
      <Card>
        <CardHeader>
          <CardTitle>메모</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="메모 입력 (선택)"
            rows={3}
          />
        </CardContent>
      </Card>

      {/* E. Actions */}
      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={() => handleSave('draft')}
          disabled={saving}
        >
          임시저장
        </Button>
        <Button onClick={() => handleSave('sent')} disabled={saving}>
          발행
        </Button>
      </div>
    </div>
  )
}
