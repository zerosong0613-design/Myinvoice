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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Category } from '@/types'

interface CategoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  category?: Category | null
  parentCategory?: Category | null
  categories: Category[]
  onSave: (data: { name: string; parent_id: string | null }) => Promise<void>
}

function flattenWithDepth(
  categories: Category[],
  depth = 0
): { category: Category; depth: number }[] {
  const result: { category: Category; depth: number }[] = []
  for (const cat of categories) {
    result.push({ category: cat, depth })
    if (cat.children?.length) {
      result.push(...flattenWithDepth(cat.children, depth + 1))
    }
  }
  return result
}

export default function CategoryDialog({
  open,
  onOpenChange,
  category,
  parentCategory,
  categories,
  onSave,
}: CategoryDialogProps) {
  const isEdit = !!category

  const [name, setName] = useState('')
  const [parentId, setParentId] = useState<string>('none')
  const [saving, setSaving] = useState(false)

  const flatOptions = flattenWithDepth(categories)

  // Filter out the category itself and its descendants when editing
  const availableOptions = isEdit
    ? flatOptions.filter((item) => {
        let current: { category: Category; depth: number } | undefined = item
        while (current) {
          if (current.category.id === category!.id) return false
          current = flatOptions.find(
            (f) => f.category.id === current!.category.parent_id
          )
        }
        return true
      })
    : flatOptions

  useEffect(() => {
    if (open) {
      setName(category?.name ?? '')
      if (category) {
        setParentId(category.parent_id ?? 'none')
      } else if (parentCategory) {
        setParentId(parentCategory.id)
      } else {
        setParentId('none')
      }
    }
  }, [open, category, parentCategory])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await onSave({
        name: name.trim(),
        parent_id: parentId === 'none' ? null : parentId,
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
            {isEdit ? '카테고리 수정' : '카테고리 추가'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="category-name">
              카테고리명 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="category-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="카테고리명을 입력하세요"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>상위 카테고리</Label>
            <Select value={parentId} onValueChange={(v) => v && setParentId(v)}>
              <SelectTrigger>
                <SelectValue placeholder="없음 (최상위)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">없음 (최상위)</SelectItem>
                {availableOptions.map(({ category: cat, depth }) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {'  '.repeat(depth)}
                    {depth > 0 ? 'ㄴ ' : ''}
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              취소
            </Button>
            <Button type="submit" disabled={saving || !name.trim()}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? '수정' : '추가'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
