import { useEffect, useState } from 'react'
import { Modal } from '../../../components/Modal'
import { Button } from '../../../components/Button'
import { SearchInput } from '../../../components/SearchInput'
import { Pagination } from '../../../components/Pagination'
import { EmptyState } from '../../../components/admin/EmptyState'
import { MediaGrid } from './MediaGrid'
import { MediaUploadDropzone } from './MediaUploadDropzone'
import { useMediaLibrary } from './hooks'

// Reusable asset picker shared by the product edit and category form screens
// (see hooks.js / MediaGrid.jsx / MediaUploadDropzone.jsx from Task 9/10).
// Public API — keep stable, other features depend on it:
//   <MediaLibraryModal open onClose multiple accept attachedAssetIds onSelect />
export function MediaLibraryModal({
  open,
  onClose,
  multiple = true,
  accept = 'image/*',
  attachedAssetIds = [],
  onSelect,
}) {
  const [tab, setTab] = useState('library')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState([]) // asset objects

  const { data, isLoading } = useMediaLibrary({ page, search, enabled: open })
  const items = data?.data ?? []
  const lastPage = data?.meta?.pagination?.last_page ?? 1

  // Reset transient state each time the modal (re)opens.
  useEffect(() => {
    if (open) {
      setTab('library')
      setSearch('')
      setPage(1)
      setSelected([])
    }
  }, [open])

  function toggle(asset) {
    setSelected((prev) => {
      if (prev.some((a) => a.id === asset.id)) return prev.filter((a) => a.id !== asset.id)
      return multiple ? [...prev, asset] : [asset]
    })
  }

  function confirm() {
    onSelect(selected)
    onClose()
  }

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
      title="Thư viện ảnh"
      description="Chọn ảnh có sẵn trong thư viện hoặc tải ảnh mới lên."
      contentClassName="max-w-3xl"
    >
      <div className="flex gap-2 border-b border-border">
        <button
          type="button"
          onClick={() => setTab('library')}
          aria-pressed={tab === 'library'}
          className={`px-3 py-2 text-sm ${
            tab === 'library' ? 'border-b-2 border-foreground text-foreground' : 'text-muted-foreground'
          }`}
        >
          Thư viện
        </button>
        <button
          type="button"
          onClick={() => setTab('upload')}
          aria-pressed={tab === 'upload'}
          className={`px-3 py-2 text-sm ${
            tab === 'upload' ? 'border-b-2 border-foreground text-foreground' : 'text-muted-foreground'
          }`}
        >
          Tải lên
        </button>
      </div>

      <div className="mt-4 max-h-[55vh] overflow-y-auto">
        {tab === 'library' ? (
          <>
            <SearchInput
              onDebouncedChange={(value) => {
                setSearch(value)
                setPage(1)
              }}
              placeholder="Tìm theo tên/mô tả ảnh"
            />
            <div className="mt-4">
              {isLoading ? null : items.length === 0 ? (
                <EmptyState title="Chưa có ảnh nào." />
              ) : (
                <MediaGrid
                  items={items}
                  selectedIds={selected.map((a) => a.id)}
                  attachedAssetIds={attachedAssetIds}
                  onToggle={toggle}
                />
              )}
            </div>
            <div className="mt-4">
              <Pagination page={page} lastPage={lastPage} onPageChange={setPage} />
            </div>
          </>
        ) : (
          <MediaUploadDropzone
            accept={accept}
            onUploaded={(asset) => {
              toggle(asset)
              setTab('library')
            }}
          />
        )}
      </div>

      <div className="mt-4 flex justify-end gap-2 border-t border-border pt-4">
        <Button type="button" variant="ghost" onClick={onClose}>
          Huỷ
        </Button>
        <Button type="button" variant="primary" onClick={confirm} disabled={selected.length === 0}>
          Chọn{selected.length > 0 ? ` (${selected.length})` : ''}
        </Button>
      </div>
    </Modal>
  )
}
