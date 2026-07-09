import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Box, Pencil, Trash2, Plus, Share2 } from 'lucide-react'
import { Badge } from '../../components/Badge'
import { Spinner } from '../../components/Spinner'
import { Input } from '../../components/Input'
import { Pagination } from '../../components/Pagination'
import { BecomingRoomArt } from '../../components/BecomingRoomArt'
import { useScenes, useDeleteScene, useRenameScene } from '../../features/roomPlanner/hooks'
import { useToastStore } from '../../store/toastStore'
import { formatDate } from '../../lib/format'

function RoomCard({ scene }) {
  const rename = useRenameScene()
  const remove = useDeleteScene()
  const addToast = useToastStore((s) => s.addToast)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(scene.name)

  const commitName = () => {
    setEditing(false)
    const next = name.trim()
    if (!next || next === scene.name) {
      setName(scene.name)
      return
    }
    rename.mutate(
      { id: scene.id, name: next },
      { onError: () => { setName(scene.name); addToast({ title: 'Đổi tên thất bại.', variant: 'error' }) } },
    )
  }

  const handleDelete = () => {
    if (!window.confirm(`Xoá phòng “${scene.name}”?`)) return
    remove.mutate(scene.id, {
      onSuccess: () => addToast({ title: 'Đã xoá phòng.', variant: 'success' }),
      onError: () => addToast({ title: 'Xoá phòng thất bại.', variant: 'error' }),
    })
  }

  const dims = `${scene.width} × ${scene.depth} × ${scene.height} m`

  return (
    <li className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5">
      <div className="aspect-[16/9] overflow-hidden rounded-control bg-surface-alt">
        {scene.preview_url ? (
          <img src={scene.preview_url} alt={`Ảnh phòng ${scene.name}`} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center p-4">
            <BecomingRoomArt level={1} className="max-w-[220px]" />
          </div>
        )}
      </div>
      <div className="flex items-start justify-between gap-3">
        {editing ? (
          <Input
            aria-label="Tên phòng"
            className="w-full"
            value={name}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => { if (e.key === 'Enter') commitName() }}
          />
        ) : (
          <p className="truncate font-display text-lg text-foreground">{scene.name}</p>
        )}
        {scene.is_public && (
          <Badge tone="in-stock" className="shrink-0 gap-1">
            <Share2 size={12} aria-hidden="true" /> Đang chia sẻ
          </Badge>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        {dims} · {scene.items?.length ?? 0} món · {formatDate(scene.created_at)}
      </p>
      <div className="mt-1 flex flex-wrap gap-2">
        <Link
          to={`/room-planner/${scene.id}`}
          className="inline-flex items-center gap-1.5 rounded-control bg-primary px-3 py-1.5 text-sm font-medium text-surface transition-colors hover:bg-primary-hover"
        >
          <Box size={15} aria-hidden="true" /> Mở
        </Link>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="inline-flex items-center gap-1.5 rounded-control border border-border px-3 py-1.5 text-sm text-foreground transition-colors hover:border-border-strong"
        >
          <Pencil size={15} aria-hidden="true" /> Đổi tên
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={remove.isPending}
          className="inline-flex items-center gap-1.5 rounded-control border border-destructive/40 px-3 py-1.5 text-sm text-destructive transition-colors hover:bg-destructive/5 disabled:opacity-50"
        >
          <Trash2 size={15} aria-hidden="true" /> Xoá
        </button>
      </div>
    </li>
  )
}

export function MyRoomsPage() {
  const [page, setPage] = useState(1)
  const { data, isLoading, isError } = useScenes(page)

  const scenes = data?.data ?? []
  const lastPage = data?.meta?.pagination?.last_page ?? 1

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <div className="mx-auto max-w-4xl px-6 py-16 md:py-20 lg:px-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="eyebrow">Không gian của bạn</p>
            <h1 className="mt-1 font-display text-[clamp(1.6rem,3vw,2.4rem)] leading-tight text-foreground">
              Phòng của tôi
            </h1>
          </div>
          <Link
            to="/room-planner"
            className="inline-flex items-center gap-2 rounded-control bg-primary px-4 py-2 text-sm font-medium text-surface transition-colors hover:bg-primary-hover"
          >
            <Plus size={16} aria-hidden="true" /> Tạo phòng mới
          </Link>
        </div>

        {isLoading ? (
          <div className="mt-12"><Spinner label="Đang tải danh sách phòng..." /></div>
        ) : isError ? (
          <p className="mt-12 text-sm text-muted-foreground">Không tải được danh sách phòng.</p>
        ) : scenes.length === 0 ? (
          <div className="mt-12 flex flex-col items-center gap-5 text-center">
            <div className="w-full max-w-[360px]"><BecomingRoomArt level={1} /></div>
            <p className="max-w-sm text-muted-foreground">
              Chưa có phòng nào — bắt đầu hình dung không gian đầu tiên của bạn.
            </p>
            <Link
              to="/room-planner"
              className="inline-flex items-center gap-2 rounded-control bg-ink px-4 py-2.5 text-sm font-medium text-canvas transition-opacity hover:opacity-90"
            >
              <Plus size={16} aria-hidden="true" /> Tạo phòng mới
            </Link>
          </div>
        ) : (
          <>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2">
              {scenes.map((scene) => <RoomCard key={scene.id} scene={scene} />)}
            </ul>
            {lastPage > 1 && (
              <div className="mt-8">
                <Pagination page={page} lastPage={lastPage} onPageChange={setPage} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
