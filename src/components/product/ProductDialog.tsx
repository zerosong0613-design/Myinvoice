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
import type { Product } from '@/types'

interface ProductFormData {
  name: string
  unit_price: number
  unit: string | null
  description: string | null
}

interface ProductDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product?: Product | null
  onSave: (data: ProductFormData) => Promise<void>
}

export default function ProductDialog({
  open,
  onOpenChange,
  product,
  onSave,
}: ProductDialogProps) {
  const isEdit = !!product

  const [name, setName] = useState('')
  const [unitPrice, setUnitPrice] = useState('')
  const [unit, setUnit] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setName(product?.name ?? '')
      setUnitPrice(product?.unit_price != null ? String(product.unit_price) : '')
      setUnit(product?.unit ?? '')
      setDescription(product?.description ?? '')
    }
  }, [open, product])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await onSave({
        name: name.trim(),
        unit_price: unitPrice ? Number(unitPrice) : 0,
        unit: unit.trim() || null,
        description: description.trim() || null,
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
          <div className="space-y-2">
            <Label htmlFor="product-name">
              품목명 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="product-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="품목명을 입력하세요"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="product-price">단가</Label>
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
              placeholder="예: 개, EA, 시간"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="product-desc">설명</Label>
            <Textarea
              id="product-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="품목 설명을 입력하세요"
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
