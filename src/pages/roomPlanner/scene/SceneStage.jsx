import { useEffect, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { Environment, OrbitControls } from '@react-three/drei'
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

// Repositions the camera when entering/leaving top-down "Chỉnh phòng" mode.
// <Canvas camera={...}> only applies at MOUNT, so switching modes after mount
// needs an imperative nudge here via useThree. Renders nothing itself.
function CameraRig({ topDown, room, camDistance }) {
  const { camera } = useThree()

  useEffect(() => {
    if (topDown) {
      const overheadY = Math.max(room.width, room.depth) * 1.4 + room.height
      camera.position.set(0, overheadY, 0.001) // tiny Z offset avoids the lookAt gimbal singularity
      camera.lookAt(0, 0, 0)
    } else {
      camera.position.set(camDistance, camDistance, camDistance)
      camera.lookAt(0, room.height / 4, 0)
    }
    camera.updateProjectionMatrix()
  }, [topDown, room.width, room.depth, room.height, camDistance, camera])

  return null
}

// Shared presentational stage for the room: the WebGL-support gate + <Canvas> +
// lights + <Room> + <OrbitControls> + runtime context-loss handling. The editor
// (RoomCanvas) and the read-only viewer (SharedSceneCanvas) both compose it,
// passing their own scene content (gizmo-editable items, or static models) as
// `children`. Deciding support BEFORE mounting <Canvas> means react-three-fiber
// never attempts (and crashes on) context creation when WebGL is unavailable.
//
// `topDown` drives the "Chỉnh phòng" (edit room) mode: camera looks straight
// down and orbit-rotation is locked, so the caller (RoomCanvas) can also make
// furniture non-interactive and show the room-edit overlay. Defaults to false
// so SharedSceneCanvas (which never passes it) keeps its normal perspective view.
export function SceneStage({ room, orbitEnabled = true, topDown = false, onRendererReady, fallback, children }) {
  const webglSupported = useWebGLSupport()
  const [contextLost, setContextLost] = useState(false)

  if (!webglSupported) {
    return fallback ?? <WebGLUnsupportedFallback room={room} />
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
    onRendererReady?.(gl)
  }

  return (
    <div className="relative h-full w-full">
      <Canvas gl={{ preserveDrawingBuffer: true }} onCreated={handleCreated} shadows camera={{ position: [camDistance, camDistance, camDistance], fov: 45 }}>
        <CameraRig topDown={topDown} room={room} camDistance={camDistance} />
        <Environment preset="apartment" />
        <hemisphereLight intensity={0.9} groundColor="#C9C4B8" /> {/* unbuilt — Becoming ground bounce */}
        <directionalLight position={[5, 8, 5]} intensity={1.1} castShadow />
        <Room width={room.width} depth={room.depth} height={room.height} walls={room.walls} />
        {children}
        <OrbitControls
          makeDefault
          enabled={orbitEnabled}
          enableRotate={!topDown}
          target={topDown ? [0, 0, 0] : [0, room.height / 4, 0]}
          // Keep both props present across mode changes. Removing a prop from a
          // Three primitive makes R3F construct a blank instance to discover its
          // default; OrbitControls cannot be constructed without a camera.
          minPolarAngle={0}
          maxPolarAngle={topDown ? 0.0001 : Math.PI}
        />
      </Canvas>
      {contextLost && <ContextLostOverlay />}
    </div>
  )
}
