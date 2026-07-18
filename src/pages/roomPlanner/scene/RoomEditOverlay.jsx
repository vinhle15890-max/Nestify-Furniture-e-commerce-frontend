import { useRef } from 'react'
import { TransformControls } from '@react-three/drei'
import { useEditorStore } from '../../../features/roomPlanner/editorStore'
import { snapHalf } from './roomHelpers'

// Núm ở giữa mỗi cạnh sàn. axis 'x' → đổi width; 'z' → đổi depth.
// Vị trí núm = nửa-chiều tương ứng, trên trục đó.
function EdgeHandle({ axis, sign, room, onDragChange }) {
  const ref = useRef()
  const resizeRoom = useEditorStore((s) => s.resizeRoom)
  const half = axis === 'x' ? room.width / 2 : room.depth / 2
  const pos = axis === 'x' ? [sign * half, 0.05, 0] : [0, 0.05, sign * half]

  return (
    <TransformControls
      mode="translate"
      showX={axis === 'x'}
      showZ={axis === 'z'}
      showY={false}
      onMouseDown={() => onDragChange(true)}
      onMouseUp={() => onDragChange(false)}
      onObjectChange={() => {
        const o = ref.current
        if (!o) return
        if (axis === 'x') resizeRoom({ width: snapHalf(Math.abs(o.position.x) * 2) })
        else resizeRoom({ depth: snapHalf(Math.abs(o.position.z) * 2) })
      }}
    >
      <mesh ref={ref} position={pos}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshBasicMaterial color="#C9C4B8" />
      </mesh>
    </TransformControls>
  )
}

// Cạnh tường bấm được (lưng/trái/phải). Bấm → toggleWall.
function WallEdge({ side, room }) {
  const toggleWall = useEditorStore((s) => s.toggleWall)
  const on = room.walls?.[side] ?? true
  const geo = side === 'back'
    ? { pos: [0, 0.03, -room.depth / 2], args: [room.width, 0.08], rot: [-Math.PI / 2, 0, 0] }
    : side === 'left'
      ? { pos: [-room.width / 2, 0.03, 0], args: [room.depth, 0.08], rot: [-Math.PI / 2, 0, Math.PI / 2] }
      : { pos: [room.width / 2, 0.03, 0], args: [room.depth, 0.08], rot: [-Math.PI / 2, 0, Math.PI / 2] }

  return (
    <mesh position={geo.pos} rotation={geo.rot} onClick={(e) => { e.stopPropagation(); toggleWall(side) }}>
      <planeGeometry args={geo.args} />
      <meshBasicMaterial color="#C9C4B8" transparent opacity={on ? 0.9 : 0.35} />
    </mesh>
  )
}

export function RoomEditOverlay({ room, onDragChange }) {
  return (
    <group>
      <EdgeHandle axis="x" sign={1} room={room} onDragChange={onDragChange} />
      <EdgeHandle axis="x" sign={-1} room={room} onDragChange={onDragChange} />
      <EdgeHandle axis="z" sign={1} room={room} onDragChange={onDragChange} />
      <EdgeHandle axis="z" sign={-1} room={room} onDragChange={onDragChange} />
      <WallEdge side="back" room={room} />
      <WallEdge side="left" room={room} />
      <WallEdge side="right" room={room} />
    </group>
  )
}
