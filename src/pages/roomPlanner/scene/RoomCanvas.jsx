import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { MonitorOff, MonitorX } from 'lucide-react'
import { Room } from './Room'
import { PlacedItem } from './PlacedItem'
import { useEditorStore } from '../../../features/roomPlanner/editorStore'
import { useWebGLSupport } from '../../../hooks/useWebGLSupport'

// Overlay shown when the LIVE GPU context is lost after a successful mount
// (driver reset, GPU switch, tab parked too long) — distinct from the mount-time
// "no WebGL at all" fallback above. Without it the canvas silently freezes.
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
// Minimal by design — the full Capability Boundary (numeric compare flow) is a
// later phase; here we only prevent the crash and echo any entered dimensions.
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
          Kích thước phòng đã nhập: {room.width} × {room.depth} × {room.height} m
        </p>
      )}
    </div>
  )
}

export function RoomCanvas() {
  const webglSupported = useWebGLSupport()
  const room = useEditorStore((s) => s.room)
  const items = useEditorStore((s) => s.items)
  const selectedId = useEditorStore((s) => s.selectedId)
  const gizmoMode = useEditorStore((s) => s.gizmoMode)
  const selectItem = useEditorStore((s) => s.selectItem)
  const updateTransform = useEditorStore((s) => s.updateTransform)
  const [orbitEnabled, setOrbitEnabled] = useState(true)
  const [contextLost, setContextLost] = useState(false)

  // Decide BEFORE mounting <Canvas>: if WebGL is unavailable we never mount it,
  // so react-three-fiber never attempts (and crashes on) context creation.
  if (!webglSupported) {
    return <WebGLUnsupportedFallback room={room} />
  }

  const camDistance = Math.max(room.width, room.depth, 4) * 1.4

  // Runtime context-loss handling: onCreated hands us the real <canvas>, so we
  // can react to a context lost/restored AFTER mount. preventDefault on the lost
  // event is required for the browser to attempt automatic restoration. The
  // listeners die with the canvas element on unmount.
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
        {/* Click empty space → deselect. */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} onClick={() => selectItem(null)} visible={false}>
          <planeGeometry args={[room.width, room.depth]} />
        </mesh>
        {items.map((item) => (
          <PlacedItem
            key={item.localId}
            item={item}
            selected={item.localId === selectedId}
            gizmoMode={gizmoMode}
            onSelect={selectItem}
            onTransform={updateTransform}
            onDragChange={(dragging) => setOrbitEnabled(!dragging)}
          />
        ))}
        <OrbitControls makeDefault enabled={orbitEnabled} target={[0, room.height / 4, 0]} />
      </Canvas>
      {contextLost && <ContextLostOverlay />}
    </div>
  )
}

export default RoomCanvas
