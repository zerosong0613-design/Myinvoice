import { useEffect, useState, useCallback } from 'react'
import { Plus, FolderOpen, FolderPlus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import CategoryDialog from '@/components/category/CategoryDialog'
import { useCategories } from '@/hooks/useCategories'
import { useProducts } from '@/hooks/useProducts'
import type { Category } from '@/types'

interface CategoryNodeProps {
  category: Category
  depth: number
  productCounts: Map<string, number>
  onAddChild: (parent: Category) => void
  onEdit: (category: Category) => void
  onDelete: (id: string) => void
}

function CategoryNode({
  category,
  depth,
  productCounts,
  onAddChild,
  onEdit,
  onDelete,
}: CategoryNodeProps) {
  const count = productCounts.get(category.id) ?? 0

  return (
    <>
      <div
        className="group flex items-center gap-2 rounded-md px-3 py-2 hover:bg-accent/50 transition-colors"
        style={{ paddingLeft: `${depth * 24 + 12}px` }}
      >
        {depth > 0 && (
          <div
            className="absolute left-0 top-0 bottom-0 border-l border-muted-foreground/20"
            style={{ marginLeft: `${(depth - 1) * 24 + 22}px` }}
          />
        )}
        <FolderOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="flex-1 text-sm font-medium">{category.name}</span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {count}개 품목
        </span>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => onAddChild(category)}
          >
            <FolderPlus className="mr-1 h-3 w-3" />
            하위 추가
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onEdit(category)}
          >
            <Pencil className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onDelete(category.id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
      {category.children?.map((child) => (
        <CategoryNode
          key={child.id}
          category={child}
          depth={depth + 1}
          productCounts={productCounts}
          onAddChild={onAddChild}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </>
  )
}

export default function Categories() {
  const {
    categoryTree,
    loading,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
  } = useCategories()

  const { products, fetchProducts } = useProducts()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [parentForNew, setParentForNew] = useState<Category | null>(null)

  useEffect(() => {
    fetchCategories()
    fetchProducts()
  }, [fetchCategories, fetchProducts])

  const productCounts = useCallback(() => {
    const counts = new Map<string, number>()
    for (const product of products) {
      if (product.category_id) {
        counts.set(
          product.category_id,
          (counts.get(product.category_id) ?? 0) + 1
        )
      }
    }
    return counts
  }, [products])

  const handleCreate = () => {
    setEditingCategory(null)
    setParentForNew(null)
    setDialogOpen(true)
  }

  const handleAddChild = (parent: Category) => {
    setEditingCategory(null)
    setParentForNew(parent)
    setDialogOpen(true)
  }

  const handleEdit = (category: Category) => {
    setEditingCategory(category)
    setParentForNew(null)
    setDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('이 카테고리를 삭제하시겠습니까? 하위 카테고리도 함께 삭제됩니다.')) return
    await deleteCategory(id)
  }

  const handleSave = async (data: { name: string; parent_id: string | null }) => {
    if (editingCategory) {
      await updateCategory(editingCategory.id, data)
    } else {
      await createCategory(data)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">카테고리 관리</h1>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          카테고리 추가
        </Button>
      </div>

      {loading ? (
        <p className="py-10 text-center text-muted-foreground">
          불러오는 중...
        </p>
      ) : categoryTree.length === 0 ? (
        <div className="py-10 text-center text-muted-foreground">
          등록된 카테고리가 없습니다.
        </div>
      ) : (
        <div className="rounded-md border">
          <div className="divide-y">
            {categoryTree.map((category) => (
              <CategoryNode
                key={category.id}
                category={category}
                depth={0}
                productCounts={productCounts()}
                onAddChild={handleAddChild}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </div>
      )}

      <CategoryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        category={editingCategory}
        parentCategory={parentForNew}
        categories={categoryTree}
        onSave={handleSave}
      />
    </div>
  )
}
