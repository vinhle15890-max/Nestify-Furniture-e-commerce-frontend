import { useState } from 'react'
import { Images } from 'lucide-react'
import { PageHeader } from '../../../components/admin/PageHeader'
import { Panel } from '../../../components/admin/Panel'
import { SearchInput } from '../../../components/SearchInput'
import { Pagination } from '../../../components/Pagination'
import { EmptyState } from '../../../components/admin/EmptyState'
import { Button } from '../../../components/Button'
import { MediaGrid } from '../../../features/admin/media/MediaGrid'
import { MediaUploadDropzone } from '../../../features/admin/media/MediaUploadDropzone'
import { useMediaLibrary, useDeleteMediaAsset } from '../../../features/admin/media/hooks'
import { useToastStore } from '../../../store/toastStore'

// Standalone "Thư viện ảnh" admin screen: browse/search the reusable media
// library (offset pagination), upload new assets, and delete a selected one.
// Deletion is select-then-explicit-button (never click-to-delete) so a stray
// click on a tile never destroys an asset — the tile only toggles selection.
export function AdminMediaLibraryPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState(null)
  const { data, isLoading } = useMediaLibrary({ page, search })
  const del = useDeleteMediaAsset()
  const addToast = useToastStore((s) => s.addToast)

  const items = data?.data ?? []
  const lastPage = data?.meta?.pagination?.last_page ?? 1
  const selected = items.find((a) => a.id === selectedId) ?? null

  function toggleSelect(asset) {
    setSelectedId((current) => (current === asset.id ? null : asset.id))
  }

  function handleDelete() {
    if (!selected) return
    del.mutate(selected.id, {
      onSuccess: () => {
        addToast({ title: 'Đã xoá ảnh khỏi thư viện.', variant: 'success' })
        setSelectedId(null)
      },
      onError: (e) => addToast({
        title: 'Không thể xoá ảnh.',
        description: e?.details?.usage_count != null
          ? `Ảnh đang được dùng bởi ${e.details.usage_count} nơi. Hãy gỡ khỏi các nơi đó trước.`
          : e?.message,
        variant: 'error',
      }),
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Nội dung" title="Thư viện ảnh" icon={Images}
        description="Tải ảnh lên một lần rồi dùng lại cho nhiều sản phẩm và danh mục." />

      <Panel><MediaUploadDropzone onUploaded={() => setPage(1)} /></Panel>

      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SearchInput onDebouncedChange={(v) => { setSearch(v); setPage(1) }} placeholder="Tìm theo tên hoặc mô tả ảnh" />
          {selected && (
            <Button type="button" variant="ghost" onClick={handleDelete} disabled={del.isPending}>
              Xoá ảnh đã chọn
            </Button>
          )}
        </div>
        <div className="mt-4">
          {isLoading ? null : items.length === 0
            ? <EmptyState icon={Images} title="Chưa có ảnh nào." description="Tải ảnh đầu tiên lên bằng ô phía trên." />
            : <MediaGrid items={items} selectedIds={selectedId ? [selectedId] : []} onToggle={toggleSelect} />}
        </div>
        <div className="mt-4"><Pagination page={page} lastPage={lastPage} onPageChange={setPage} /></div>
      </Panel>
    </div>
  )
}
