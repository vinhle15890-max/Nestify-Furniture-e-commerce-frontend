import { useParams, Link } from 'react-router-dom'
import { Logo } from '../../components/Logo'
import { Spinner } from '../../components/Spinner'
import { SharedSceneCanvas } from './scene/SharedSceneCanvas'
import { SharedRoomItems } from './SharedRoomItems'
import { useSharedScene } from '../../features/roomPlanner/hooks'
import { sceneToEditorState } from '../../features/roomPlanner/mappers'

// Public, read-only viewer for a shared scene. No auth, no storefront chrome —
// just the room in 3D and a way back into the store. Allowed on mobile (orbit
// only), unlike the desktop-only editor.
export function SharedRoomPage() {
  const { token } = useParams()
  const { data, isLoading, isError } = useSharedScene(token)

  if (isLoading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-canvas">
        <Spinner label="Đang tải phòng" />
      </div>
    )
  }

  if (isError || !data?.data) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-3 bg-canvas px-8 text-center">
        <p className="text-foreground">Phòng chia sẻ không tồn tại hoặc đã gỡ.</p>
        <Link to="/" className="text-accent hover:underline">Về cửa hàng Nestify</Link>
      </div>
    )
  }

  const scene = data.data
  const state = sceneToEditorState(scene)

  return (
    <div className="flex h-dvh flex-col bg-canvas text-ink">
      <header className="flex items-center justify-between gap-4 border-b border-border bg-surface px-4 py-3 md:px-6">
        <Link to="/" aria-label="Nestify — trang chủ">
          <Logo className="h-8 w-auto" />
        </Link>
        <p className="min-w-0 flex-1 truncate text-center text-sm font-medium text-foreground">{scene.name}</p>
        <Link
          to="/c/all"
          className="shrink-0 rounded-control bg-ink px-3 py-1.5 text-sm font-medium text-canvas transition-opacity hover:opacity-90"
        >
          Khám phá cửa hàng
        </Link>
      </header>
      <main className="flex min-h-0 flex-1 flex-col md:flex-row">
        <div className="relative min-h-0 flex-1">
          <SharedSceneCanvas room={state.room} items={state.items} />
        </div>
        <aside className="max-h-[45%] shrink-0 overflow-y-auto border-t border-border bg-surface-alt/40 p-4 md:max-h-none md:w-80 md:border-l md:border-t-0">
          <SharedRoomItems items={state.items} />
        </aside>
      </main>
    </div>
  )
}
