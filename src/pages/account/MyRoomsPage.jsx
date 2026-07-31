import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Box, Pencil, Trash2, Plus, Share2 } from 'lucide-react'
import { Badge } from '../../components/Badge'
import { Spinner } from '../../components/Spinner'
import { LoadErrorState } from '../../components/LoadErrorState'
import { Input } from '../../components/Input'
import { Pagination } from '../../components/Pagination'
import { useScenes, useDeleteScene, useRenameScene } from '../../features/roomPlanner/hooks'
import { useToastStore } from '../../store/toastStore'
import { formatDate } from '../../lib/format'

/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V4 */

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
          <div className="flex h-full flex-col items-center justify-center gap-2 border border-unbuilt/70 p-4 text-center">
            <Box size={28} strokeWidth={1.25} className="text-ink/35" aria-hidden="true" />
            <span className="text-xs text-muted-foreground">Ảnh phòng xuất hiện sau lần lưu đầu tiên</span>
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
          <p className="truncate  text-lg text-foreground">{scene.name}</p>
        )}
        {scene.is_public && (
          <Badge tone="in-stock" className="shrink-0 gap-1">
            <Share2 size={12} aria-hidden="true" /> Đang chia sẻ
          </Badge>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        {dims}
      </p>
      <p className="text-xs text-muted-foreground">
        {scene.items?.length ?? 0} món đang cân nhắc · cập nhật {formatDate(scene.created_at)}
      </p>
      <div className="mt-1 flex flex-wrap gap-2">
        <Link
          to={`/room-planner/${scene.id}`}
          className="inline-flex items-center gap-1.5 rounded-control bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
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
  const { data, isLoading, isError, isFetching, refetch } = useScenes(page)

  const scenes = data?.data ?? []
  const lastPage = data?.meta?.pagination?.last_page ?? 1
  const totalRooms = data?.meta?.pagination?.total ?? scenes.length
  const maxRooms = data?.meta?.limits?.max_rooms ?? 8
  const remainingRooms = data?.meta?.limits?.remaining_rooms ?? Math.max(0, maxRooms - totalRooms)
  const totalItems = scenes.reduce((sum, scene) => sum + (scene.items?.length ?? 0), 0)
  const isAtLimit = remainingRooms === 0

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <div className="mx-auto max-w-4xl px-6 py-16 md:py-20 lg:px-10">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="eyebrow">Một tổ ấm, nhiều không gian</p>
            <h1 className="mt-1 font-display text-[clamp(1.6rem,3vw,2.4rem)] leading-tight text-foreground">
              Căn hộ của bạn
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
              Lên kế hoạch từng phòng và xem toàn bộ những món bạn đang cân nhắc trong cùng một nơi.
            </p>
          </div>
          {isAtLimit ? (
            <p className="max-w-52 text-right text-sm leading-5 text-muted-foreground">
              Căn hộ đã đủ {maxRooms} phòng. Xoá một phòng nếu bạn muốn tạo phòng khác.
            </p>
          ) : (
            <Link
              to="/room-planner"
              className="inline-flex min-h-11 items-center gap-2 rounded-control bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Plus size={16} aria-hidden="true" /> Thêm phòng
            </Link>
          )}
        </div>

        {isLoading ? (
          <div className="mt-12"><Spinner label="Đang tải danh sách phòng..." /></div>
        ) : isError && !data ? (
          <LoadErrorState className="mt-12" title="Chưa thể tải danh sách phòng" description="Những căn phòng đã lưu vẫn được giữ nguyên. Hãy thử tải lại." onRetry={refetch} isRetrying={isFetching} />
        ) : scenes.length === 0 ? (
          <div className="mt-12 border-y border-unbuilt py-14 text-center">
            <p className="mx-auto max-w-sm text-muted-foreground">Căn hộ chưa có phòng nào. Bắt đầu từ không gian bạn muốn sắp xếp trước.</p>
            <Link
              to="/room-planner"
              className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-control bg-ink px-4 py-2.5 text-sm font-medium text-canvas transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Plus size={16} aria-hidden="true" /> Thêm phòng đầu tiên
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-10 grid grid-cols-2 border-y border-unbuilt py-5 sm:grid-cols-3">
              <div>
                <p className="text-2xl font-medium tabular-nums text-foreground">{totalRooms}/{maxRooms}</p>
                <p className="mt-1 text-xs text-muted-foreground">phòng đã lên kế hoạch</p>
              </div>
              <div className="border-l border-unbuilt pl-5">
                <p className="text-2xl font-medium tabular-nums text-foreground">{totalItems}</p>
                <p className="mt-1 text-xs text-muted-foreground">món đang cân nhắc</p>
              </div>
              <div className="col-span-2 mt-5 border-t border-unbuilt pt-5 sm:col-span-1 sm:mt-0 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
                <p className="text-2xl font-medium tabular-nums text-foreground">{remainingRooms}</p>
                <p className="mt-1 text-xs text-muted-foreground">phòng còn có thể thêm</p>
              </div>
            </div>
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
