import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { MonitorOff, MonitorX } from 'lucide-react'
import { Room } from './Room'
import { useWebGLSupport } from '../../../hooks/useWebGLSupport'

// Overlay shown when the LIVE GPU context is lost after a successful mount
// (driver reset, GPU switch, tab parked too long) — distinct from the mount-time
// "no WebGL at all" fallback below. Without it the canvas silently freezes.
function ContextLostOverlay() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-canvas/85 px-8 text-center backdrop-blur-sm">
      <MonitorX size={36} className="text-muted-foreground" aria-hidden="true" />
      <p className="text-base font-medium text-foreground">Mất kết nối đồ hoạ tạm thời</p>
      <p className="max-w-sm text-sm text-muted-foreground">Đang khôi phục hiển thị 3D…</p>
    </div>
  )
}

// Shown instead of <Canvas> when the browser can't create a WebGL context.
function WebGLUnsupportedFallback({ room }) {
  const hasDims = room.width > 0 || room.depth > 0 || room.height > 0
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
      <MonitorOff size={40} className="text-muted-foreground" aria-hidden="true" />
      <p className="text-lg font-medium text-foreground">
        Trình duyệt hoặc thiết bị này không hỗ trợ hiển thị 3D
      </p>
      <p className="max-w-sm text-sm text-muted-foreground">
        Xem phòng trong không gian 3D cần WebGL. Vui lòng thử trình duyệt hoặc thiết bị khác.
      </p>
      {hasDims && (
        <p className="text-sm text-muted-foreground">
          Kích thước phòng: {room.width} × {room.depth} × {room.height} m
        </p>
      )}
    </div>
  )
}

// Shared presentational stage for the room: the WebGL-support gate + <Canvas> +
// lights + <Room> + <OrbitControls> + runtime context-loss handling. The editor
// (RoomCanvas) and the read-only viewer (SharedSceneCanvas) both compose it,
// passing their own scene content (gizmo-editable items, or static models) as
// `children`. Deciding support BEFORE mounting <Canvas> means react-three-fiber
// never attempts (and crashes on) context creation when WebGL is unavailable.
export function SceneStage({ room, orbitEnabled = true, children }) {
  const webglSupported = useWebGLSupport()
  const [contextLost, setContextLost] = useState(false)

  if (!webglSupported) {
    return <WebGLUnsupportedFallback room={room} />
  }

  const camDistance = Math.max(room.width, room.depth, 4) * 1.4

  // onCreated hands us the real <canvas>, so we can react to a context lost/restored
  // AFTER mount. preventDefault on the lost event is required for the browser to
  // attempt automatic restoration. The listeners die with the canvas on unmount.
  const handleCreated = ({ gl }) => {
    const canvas = gl.domElement
    canvas.addEventListener('webglcontextlost', (event) => {
      event.preventDefault()
      setContextLost(true)
    })
    canvas.addEventListener('webglcontextrestored', () => setContextLost(false))
  }

  return (
    <div className="relative h-full w-full">
      <Canvas onCreated={handleCreated} shadows camera={{ position: [camDistance, camDistance, camDistance], fov: 45 }}>
        <hemisphereLight intensity={0.9} groundColor="#C9C4B8" /> {/* unbuilt — Becoming ground bounce */}
        <directionalLight position={[5, 8, 5]} intensity={1.1} castShadow />
        <Room width={room.width} depth={room.depth} height={room.height} />
        {children}
        <OrbitControls makeDefault enabled={orbitEnabled} target={[0, room.height / 4, 0]} />
      </Canvas>
      {contextLost && <ContextLostOverlay />}
    </div>
  )
}
