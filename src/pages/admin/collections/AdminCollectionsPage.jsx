import { useEffect, useState } from 'react'
import { Layers3, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '../../../components/Button'
import { Card } from '../../../components/Card'
import { Spinner } from '../../../components/Spinner'
import { LoadErrorState } from '../../../components/LoadErrorState'
import { PageHeader } from '../../../components/admin/PageHeader'
import { useAdminCollections, useCollectionProductOptions, useCreateCollection, useDeleteCollection, useUpdateCollection } from '../../../features/admin/collections/hooks'
import { useToastStore } from '../../../store/toastStore'

const empty = { name: '', slug: '', description: '', is_active: false, show_on_home: false, position: '', productIds: [] }
const field = 'w-full rounded-control border border-border bg-surface px-3 py-2 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

export function AdminCollectionsPage() {
  const query = useAdminCollections()
  const productsQuery = useCollectionProductOptions()
  const create = useCreateCollection()
  const update = useUpdateCollection()
  const remove = useDeleteCollection()
  const toast = useToastStore((state) => state.addToast)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(empty)
  const collections = query.data?.data ?? []
  const products = productsQuery.data?.data ?? []

  useEffect(() => {
    if (!form.name || editingId) return
    setForm((current) => ({ ...current, slug: current.slug || current.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') }))
  }, [form.name, editingId])

  const change = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  const edit = (collection) => {
    setEditingId(collection.id)
    setForm({ ...empty, ...collection, position: collection.position ?? '', productIds: (collection.products ?? []).map((p) => p.id) })
  }
  const reset = () => { setEditingId(null); setForm(empty) }
  const destroy = (item) => {
    if (!window.confirm(`Xóa bộ sưu tập “${item.name}”? Sản phẩm vẫn được giữ nguyên.`)) return
    remove.mutate(item.id, {
      onSuccess: () => toast({ title: 'Đã xóa bộ sưu tập' }),
      onError: (error) => toast({ title: error.message ?? 'Không thể xóa bộ sưu tập', variant: 'error' }),
    })
  }
  const submit = (event) => {
    event.preventDefault()
    const payload = {
      name: form.name, slug: form.slug, description: form.description || null,
      is_active: form.is_active, show_on_home: form.show_on_home,
      position: form.position === '' ? null : Number(form.position),
      products: form.productIds.map((id, index) => ({ id, position: index + 1 })),
    }
    const action = editingId ? update : create
    action.mutate(editingId ? { id: editingId, ...payload } : payload, {
      onSuccess: () => { toast({ title: editingId ? 'Đã cập nhật bộ sưu tập' : 'Đã tạo bộ sưu tập' }); reset() },
      onError: (error) => toast({ title: error.message ?? 'Không thể lưu bộ sưu tập', variant: 'error' }),
    })
  }

  if (query.isLoading) return <Spinner label="Đang tải bộ sưu tập..." />
  if (query.isError) return <LoadErrorState title="Chưa thể tải bộ sưu tập" onRetry={query.refetch} />

  return (
    <div>
      <PageHeader icon={Layers3} title="Bộ sưu tập" description="Nhóm và sắp xếp sản phẩm theo một ý tưởng không gian rõ ràng." />
      <div className="mt-6 grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,0.72fr)]">
        <Card className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead><tr className="border-b border-border text-muted-foreground"><th className="p-3">Tên</th><th className="p-3">Hiển thị</th><th className="p-3">Sản phẩm</th><th className="p-3"><span className="sr-only">Thao tác</span></th></tr></thead>
            <tbody>{collections.map((item) => <tr key={item.id} className="border-b border-border last:border-0"><td className="p-3"><strong>{item.name}</strong><p className="text-muted-foreground">/{item.slug}</p></td><td className="p-3">{item.is_active ? (item.show_on_home ? 'Trang chủ' : 'Công khai') : 'Bản nháp'}</td><td className="p-3">{item.products?.length ?? 0}</td><td className="p-3 text-right"><button className="p-2 text-foreground" aria-label={`Sửa ${item.name}`} onClick={() => edit(item)}><Pencil size={16} /></button><button className="p-2 text-muted-foreground" aria-label={`Xóa ${item.name}`} onClick={() => destroy(item)}><Trash2 size={16} /></button></td></tr>)}</tbody>
          </table>
          {collections.length === 0 && <p className="p-6 text-muted-foreground">Chưa có bộ sưu tập. Tạo một nhóm nhỏ, có chủ đích để bắt đầu.</p>}
        </Card>

        <Card>
          <form onSubmit={submit} className="space-y-5">
            <h2 className="font-display text-2xl font-normal text-foreground">{editingId ? 'Chỉnh sửa bộ sưu tập' : 'Tạo bộ sưu tập'}</h2>
            <label className="block text-sm font-medium">Tên<input required value={form.name} onChange={(e) => change('name', e.target.value)} className={`${field} mt-2`} /></label>
            <label className="block text-sm font-medium">Slug<input required value={form.slug} onChange={(e) => change('slug', e.target.value)} className={`${field} mt-2`} /></label>
            <label className="block text-sm font-medium">Mô tả<textarea rows={4} value={form.description ?? ''} onChange={(e) => change('description', e.target.value)} className={`${field} mt-2`} /></label>
            <label className="block text-sm font-medium">Thứ tự hiển thị<input type="number" min="1" max="9999" value={form.position} onChange={(e) => change('position', e.target.value)} className={`${field} mt-2`} /></label>
            <fieldset><legend className="text-sm font-medium">Sản phẩm theo thứ tự chọn</legend><div className="mt-2 max-h-56 space-y-2 overflow-y-auto rounded-control border border-border p-3">{products.map((product) => <label key={product.id} className="flex items-center gap-3 text-sm"><input type="checkbox" checked={form.productIds.includes(product.id)} onChange={(e) => change('productIds', e.target.checked ? [...form.productIds, product.id] : form.productIds.filter((id) => id !== product.id))} />{product.name}</label>)}</div></fieldset>
            <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={form.is_active} onChange={(e) => change('is_active', e.target.checked)} />Công khai bộ sưu tập</label>
            <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={form.show_on_home} onChange={(e) => change('show_on_home', e.target.checked)} />Giới thiệu trên trang chủ</label>
            <div className="flex flex-wrap gap-3"><Button type="submit" disabled={create.isPending || update.isPending}><Plus size={16} />{editingId ? 'Lưu thay đổi' : 'Tạo bộ sưu tập'}</Button>{editingId && <Button type="button" variant="secondary" onClick={reset}>Hủy sửa</Button>}</div>
          </form>
        </Card>
      </div>
    </div>
  )
}
