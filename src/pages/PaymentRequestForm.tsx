import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
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
import { usePaymentRequests, type PaymentRequestItemInput } from '@/hooks/usePaymentRequests'
import { useCustomers } from '@/hooks/useCustomers'
import { useProducts } from '@/hooks/useProducts'
import { formatCurrency } from '@/lib/utils'
import type { PaymentRequestStatus } from '@/types'

function today() {
  return new Date().toISOString().split('T')[0]
}

function emptyItem(): PaymentRequestItemInput {
  return {
    name: '',
    description: null,
    quantity: 1,
    unit_price: 0,
    amount: 0,
    sort_order: 0,
  }
}

const WITHHOLDING_RATE_OPTIONS = [
  { value: '0', label: '0%' },
  { value: '3.3', label: '3.3%' },
  { value: '8.8', label: '8.8%' },
]

export default function PaymentRequestForm() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()

  const {
    getPaymentRequest,
    getNextNumber,
    createPaymentRequest,
    error,
  } = usePaymentRequests()
  const { customers, fetchCustomers } = useCustomers()
  const { products, fetchProducts } = useProducts()

  // Form state
  const [requestNumber, setRequestNumber] = useState('')
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState<string | null>(null)
  const [customerBizNumber, setCustomerBizNumber] = useState<string | null>(null)
  const [issuedAt, setIssuedAt] = useState(today())
  const [withholdingRate, setWithholdingRate] = useState(3.3)
  const [bankName, setBankName] = useState<string | null>(null)
  const [accountNumber, setAccountNumber] = useState<string | null>(null)
  const [accountHolder, setAccountHolder] = useState<string | null>(null)
  const [memo, setMemo] = useState('')
  const [items, setItems] = useState<PaymentRequestItemInput[]>([emptyItem()])
  const [saving, setSaving] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)

  // Load supporting data
  useEffect(() => {
    fetchCustomers()
    fetchProducts()
  }, [fetchCustomers, fetchProducts])

  // Load for editing or generate next number
  useEffect(() => {
    async function init() {
      setPageLoading(true)
      if (isEdit && id) {
        const result = await getPaymentRequest(id)
        if (result) {
          const { pr, items: prItems } = result
          setRequestNumber(pr.request_number)
          setCustomerId(pr.customer_id)
          setCustomerName(pr.customer_name)
          setCustomerEmail(pr.customer_email)
          setCustomerBizNumber(pr.customer_biz_number)
          setIssuedAt(pr.issued_at)
          setWithholdingRate(pr.withholding_rate)
          setBankName(pr.bank_name)
          setAccountNumber(pr.account_number)
          setAccountHolder(pr.account_holder)
          setMemo(pr.memo ?? '')
          setItems(
            prItems.length > 0
              ? prItems.map((item) => ({
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
        const nextNumber = await getNextNumber()
        setRequestNumber(nextNumber)
      }
      setPageLoading(false)
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEdit])

  // Item management
  const updateItem = useCallback(
    (index: number, updates: Partial<PaymentRequestItemInput>) => {
      setItems((prev) =>
        prev.map((item, i) => {
          if (i !== index) return item
          const updated = { ...item, ...updates }
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
      updateItem(index, { name: '', unit_price: 0, amount: 0 })
      return
    }
    const product = products.find((p) => p.id === productId)
    if (product) {
      const quantity = items[index].quantity || 1
      updateItem(index, {
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
      setCustomerBizNumber(null)
      return
    }
    const customer = customers.find((c) => c.id === value)
    if (customer) {
      setCustomerId(customer.id)
      setCustomerName(customer.name)
      setCustomerEmail(customer.email)
      setCustomerBizNumber(customer.biz_number)
    }
  }

  // Calculated totals
  const subtotal = items.reduce((sum, item) => sum + item.amount, 0)
  const withholdingTax = Math.round(subtotal * withholdingRate / 100)
  const netAmount = subtotal - withholdingTax

  const handleSave = async (status: PaymentRequestStatus) => {
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
      customer_biz_number: customerBizNumber,
      issued_at: issuedAt,
      due_at: null,
      status,
      withholding_rate: withholdingRate,
      bank_name: bankName,
      account_number: accountNumber,
      account_holder: accountHolder,
      memo: memo.trim() || null,
    }

    const validItems = items
      .filter((item) => item.name.trim())
      .map((item, idx) => ({ ...item, sort_order: idx }))

    const result = await createPaymentRequest(input, validItems)

    setSaving(false)
    if (result) {
      navigate(`/payment-requests/${result.id}`)
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
            {isEdit ? '지급요청서 수정' : '새 지급요청서'}
          </h1>
          {!isEdit && (
            <p className="text-sm text-muted-foreground">
              거래처에 용역 대금 지급을 요청하는 문서입니다. 원천세가 자동 계산됩니다.
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
              <Label>요청번호</Label>
              <Input value={requestNumber} disabled />
            </div>
            <div className="space-y-2">
              <Label>원천징수세율</Label>
              <Select
                value={String(withholdingRate)}
                onValueChange={(v) => v && setWithholdingRate(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WITHHOLDING_RATE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
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
              <Label>이메일</Label>
              <Input
                value={customerEmail ?? ''}
                onChange={(e) => setCustomerEmail(e.target.value || null)}
                placeholder="거래처 이메일"
              />
            </div>
            <div className="space-y-2">
              <Label>사업자번호</Label>
              <Input
                value={customerBizNumber ?? ''}
                onChange={(e) => setCustomerBizNumber(e.target.value || null)}
                placeholder="사업자번호"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>발행일</Label>
            <Input
              type="date"
              value={issuedAt}
              onChange={(e) => setIssuedAt(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* B. 입금 계좌 정보 */}
      <Card>
        <CardHeader>
          <CardTitle>입금 계좌 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>은행명</Label>
              <Input
                value={bankName ?? ''}
                onChange={(e) => setBankName(e.target.value || null)}
                placeholder="은행명"
              />
            </div>
            <div className="space-y-2">
              <Label>계좌번호</Label>
              <Input
                value={accountNumber ?? ''}
                onChange={(e) => setAccountNumber(e.target.value || null)}
                placeholder="계좌번호"
              />
            </div>
            <div className="space-y-2">
              <Label>예금주</Label>
              <Input
                value={accountHolder ?? ''}
                onChange={(e) => setAccountHolder(e.target.value || null)}
                placeholder="예금주"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* C. 품목 목록 */}
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
                    value="__custom__"
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

      {/* D. 금액 요약 */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">공급가액</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                원천세 ({withholdingRate}%)
              </span>
              <span>-{formatCurrency(withholdingTax)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-base font-semibold">
              <span>실지급액</span>
              <span>{formatCurrency(netAmount)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* E. 메모 */}
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

      {/* F. Actions */}
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
