import { useState, useEffect, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Product, Category, ProductType, RateType } from '@/types'

interface ProductFormData {
  name: string
  unit_price: number
  unit: string | null
  description: string | null
  category_id: string | null
  type: ProductType
  rate_type: RateType
}

const RATE_TYPE_OPTIONS: { value: RateType; label: string; unit: string }[] = [
  { value: 'unit', label: '건당/개당', unit: '개' },
  { value: 'hourly', label: '시간당', unit: '시간' },
  { value: 'daily', label: '일당', unit: '일' },
  { value: 'monthly', label: '월 단위', unit: '월' },
  { value: 'project', label: '프로젝트 단위', unit: '건' },
]

function flattenCategories(
  categories: Category[],
  depth = 0
): { category: Category; depth: number }[] {
  const result: { category: Category; depth: number }[] = []
  for (const cat of categories) {
    result.push({ category: cat, depth })
    if (cat.children?.length) {
      result.push(...flattenCategories(cat.children, depth + 1))
    }
  }
  return result
}

interface ProductDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product?: Product | null
  categories?: Category[]
  onSave: (data: ProductFormData) => Promise<void>
}

export default function ProductDialog({
  open,
  onOpenChange,
  product,
  categories = [],
  onSave,
}: ProductDialogProps) {
  const isEdit = !!product

  const [name, setName] = useState('')
  const [unitPrice, setUnitPrice] = useState('')
  const [unit, setUnit] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState<string>('none')
  const [type, setType] = useState<ProductType>('product')
  const [rateType, setRateType] = useState<RateType>('unit')
  const [saving, setSaving] = useState(false)

  const flatOptions = flattenCategories(categories)

  useEffect(() => {
    if (open) {
      setName(product?.name ?? '')
      setUnitPrice(product?.unit_price != null ? String(product.unit_price) : '')
      setUnit(product?.unit ?? '')
      setDescription(product?.description ?? '')
      setCategoryId(product?.category_id ?? 'none')
      setType(product?.type ?? 'product')
      setRateType(product?.rate_type ?? 'unit')
    }
  }, [open, product])

  // 타입 변경 시 기본 단위 자동 설정
  const handleRateTypeChange = (value: RateType) => {
    setRateType(value)
    const option = RATE_TYPE_OPTIONS.find((o) => o.value === value)
    if (option && !unit) setUnit(option.unit)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await onSave({
        name: name.trim(),
        unit_price: unitPrice ? Number(unitPrice) : 0,
        unit: unit.trim() || null,
        description: description.trim() || null,
        category_id: categoryId === 'none' ? null : categoryId,
        type,
        rate_type: rateType,
      })
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? '품목 수정' : '품목 추가'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 유형 선택 */}
          <div className="space-y-2">
            <Label>유형</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={type === 'product' ? 'default' : 'outline'}
                size="sm"
                className="flex-1"
                onClick={() => { setType('product'); setRateType('unit') }}
              >
                상품
              </Button>
              <Button
                type="button"
                variant={type === 'service' ? 'default' : 'outline'}
                size="sm"
                className="flex-1"
                onClick={() => { setType('service'); setRateType('hourly') }}
              >
                서비스/용역
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {type === 'product'
                ? '물리적 상품이나 재화를 판매할 때 선택하세요.'
                : '컨설팅, 디자인, 개발 등 사람이 수행하는 용역에 선택하세요.'}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="product-name">
              {type === 'product' ? '품목명' : '서비스명'} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="product-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={type === 'product' ? '예: A4 용지, 노트북' : '예: 웹 개발, UI 디자인, 법률 자문'}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>카테고리</Label>
            <Select value={categoryId} onValueChange={(v) => v && setCategoryId(v)}>
              <SelectTrigger>
                <SelectValue placeholder="카테고리 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">없음</SelectItem>
                {flatOptions.map(({ category: cat, depth }) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {'  '.repeat(depth)}
                    {depth > 0 ? 'ㄴ ' : ''}
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 서비스인 경우 요금 유형 */}
          {type === 'service' && (
            <div className="space-y-2">
              <Label>과금 방식</Label>
              <Select value={rateType} onValueChange={(v) => v && handleRateTypeChange(v as RateType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RATE_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                청구서 작성 시 수량 단위가 자동으로 설정됩니다.
              </p>
            </div>
          )}

          <div className="grid gap-4 grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="product-price">
                {type === 'service' ? '단가 (1' + (RATE_TYPE_OPTIONS.find((o) => o.value === rateType)?.unit ?? '') + '당)' : '단가'}
              </Label>
              <Input
                id="product-price"
                type="number"
                min={0}
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-unit">단위</Label>
              <Input
                id="product-unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder={type === 'service' ? '시간, 일, 건' : '개, EA, 박스'}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="product-desc">설명</Label>
            <Textarea
              id="product-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={type === 'service'
                ? '서비스 범위, 포함 사항 등을 입력하세요'
                : '품목 설명을 입력하세요'}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              취소
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? '수정' : '추가'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
