import { useState } from 'react'
import { Card } from '../../../components/Card'
import { Button } from '../../../components/Button'
import { Spinner } from '../../../components/Spinner'
import { useAdminCategories, useDeleteCategory } from '../../../features/admin/categories/hooks'
import { useToastStore } from '../../../store/toastStore'
import { CategoryFormModal } from './CategoryFormModal'

function CategoryRow({ category, depth, onEdit, onDelete }) {
  return (
    <>
      <div className="flex items-center justify-between gap-4 border-b border-border py-3 text-sm last:border-b-0">
        <div className="flex items-center gap-3" style={{ paddingLeft: `${depth * 1.5}rem` }}>
          {category.image_url && (
            <img src={category.image_url} alt="" loading="lazy" decoding="async" className="h-8 w-8 rounded-control object-cover" />
          )}
          <div>
            <p className="font-medium text-foreground">{category.name}</p>
            <p className="text-muted-foreground">{category.slug}</p>
          </div>
        </div>
        <div className="flex gap-4">
          <button type="button" className="cursor-pointer text-foreground transition-colors hover:text-accent" onClick={() => onEdit(category)}>
            Sửa
          </button>
          <button type="button" className="cursor-pointer text-destructive hover:opacity-80" onClick={() => onDelete(category)}>
            Xóa
          </button>
        </div>
      </div>
      {category.children?.map((child) => (
        <CategoryRow key={child.id} category={child} depth={depth + 1} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </>
  )
}

export function AdminCategoriesPage() {
  const { data, isLoading } = useAdminCategories()
  const deleteCategory = useDeleteCategory()
  const addToast = useToastStore((state) => state.addToast)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)

  const categories = data?.data ?? []

  const openCreateModal = () => {
    setEditingCategory(null)
    setModalOpen(true)
  }

  const openEditModal = (category) => {
    setEditingCategory(category)
    setModalOpen(true)
  }

  const handleDelete = async (category) => {
    if (!window.confirm(`Xóa danh mục "${category.name}"?`)) return

    try {
      await deleteCategory.mutateAsync(category.id)
      addToast({ title: 'Đã xóa danh mục.', variant: 'success' })
    } catch (error) {
      addToast({ title: 'Không thể xóa danh mục.', description: error.message, variant: 'error' })
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-display text-2xl text-foreground">Danh mục</h2>
        <Button onClick={openCreateModal}>Thêm danh mục</Button>
      </div>

      <div className="mt-6">
        {isLoading ? (
          <Spinner label="Đang tải danh mục..." />
        ) : categories.length === 0 ? (
          <Card>
            <p className="text-sm text-muted-foreground">Chưa có danh mục nào.</p>
          </Card>
        ) : (
          <Card>
            {categories.map((category) => (
              <CategoryRow key={category.id} category={category} depth={0} onEdit={openEditModal} onDelete={handleDelete} />
            ))}
          </Card>
        )}
      </div>

      <CategoryFormModal open={modalOpen} onOpenChange={setModalOpen} category={editingCategory} categoryTree={categories} />
    </div>
  )
}
