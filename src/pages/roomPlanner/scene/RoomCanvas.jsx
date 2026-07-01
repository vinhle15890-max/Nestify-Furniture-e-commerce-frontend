import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Room } from './Room'
import { PlacedItem } from './PlacedItem'
import { useEditorStore } from '../../../features/roomPlanner/editorStore'

export function RoomCanvas() {
  const room = useEditorStore((s) => s.room)
  const items = useEditorStore((s) => s.items)
  const selectedId = useEditorStore((s) => s.selectedId)
  const gizmoMode = useEditorStore((s) => s.gizmoMode)
  const selectItem = useEditorStore((s) => s.selectItem)
  const updateTransform = useEditorStore((s) => s.updateTransform)
  const [orbitEnabled, setOrbitEnabled] = useState(true)

  const camDistance = Math.max(room.width, room.depth, 4) * 1.4

  return (
    <Canvas shadows camera={{ position: [camDistance, camDistance, camDistance], fov: 45 }}>
      <hemisphereLight intensity={0.9} groundColor="#cfc6b5" />
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
  )
}

export default RoomCanvas
