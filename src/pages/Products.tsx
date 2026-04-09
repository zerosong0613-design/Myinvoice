import { useEffect, useMemo, useState } from 'react'
import { Plus, Search, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import ProductDialog from '@/components/product/ProductDialog'
import { useProducts } from '@/hooks/useProducts'
import { useCategories } from '@/hooks/useCategories'
import { formatCurrency } from '@/lib/utils'
import type { Product } from '@/types'

export default function Products() {
  const {
    products,
    loading,
    fetchProducts,
    createProduct,
    updateProduct,
    deleteProduct,
  } = useProducts()

  const { categories, categoryTree, fetchCategories } = useCategories()

  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  useEffect(() => {
    fetchProducts()
    fetchCategories()
  }, [fetchProducts, fetchCategories])

  const filtered = useMemo(
    () =>
      products.filter((p) => {
        const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase())
        const matchesCategory =
          categoryFilter === 'all' ||
          (categoryFilter === 'uncategorized' ? !p.category_id : p.category_id === categoryFilter)
        return matchesSearch && matchesCategory
      }),
    [products, search, categoryFilter]
  )

  const handleCreate = () => {
    setEditingProduct(null)
    setDialogOpen(true)
  }

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('이 품목을 삭제하시겠습니까?')) return
    await deleteProduct(id)
  }

  const handleSave = async (data: Parameters<typeof createProduct>[0]) => {
    if (editingProduct) {
      await updateProduct(editingProduct.id, data)
    } else {
      await createProduct(data)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">품목 관리</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            자주 사용하는 상품·서비스를 등록하면 문서 작성 시 단가가 자동으로 입력돼요.
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          품목 추가
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="품목명으로 검색"
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={(v) => v && setCategoryFilter(v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="전체 카테고리" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 카테고리</SelectItem>
            <SelectItem value="uncategorized">미분류</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="py-10 text-center text-muted-foreground">
          불러오는 중...
        </p>
      ) : filtered.length === 0 ? (
        <div className="py-10 text-center text-muted-foreground">
          {search ? '검색 결과가 없습니다.' : '등록된 품목이 없습니다.'}
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>품목명</TableHead>
                <TableHead>카테고리</TableHead>
                <TableHead className="text-right">단가</TableHead>
                <TableHead>단위</TableHead>
                <TableHead>설명</TableHead>
                <TableHead className="w-[100px] text-right">액션</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">
                    {product.name}
                  </TableCell>
                  <TableCell>
                    {product.category ? (
                      <Badge variant="secondary">{product.category.name}</Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(product.unit_price)}
                  </TableCell>
                  <TableCell>{product.unit ?? '-'}</TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {product.description ?? '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(product)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(product.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ProductDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        product={editingProduct}
        categories={categoryTree}
        onSave={handleSave}
      />
    </div>
  )
}
