import { useState } from 'react'
import { SceneStage } from './SceneStage'
import { PlacedItem } from './PlacedItem'
import { useEditorStore } from '../../../features/roomPlanner/editorStore'

// Editor canvas: composes the shared SceneStage and adds the interactive layer —
// the deselect plane and the gizmo-editable placed items, wired to the editor
// store. Dragging an item disables orbit so the two gestures don't fight.
export function RoomCanvas() {
  const room = useEditorStore((s) => s.room)
  const items = useEditorStore((s) => s.items)
  const selectedId = useEditorStore((s) => s.selectedId)
  const gizmoMode = useEditorStore((s) => s.gizmoMode)
  const selectItem = useEditorStore((s) => s.selectItem)
  const updateTransform = useEditorStore((s) => s.updateTransform)
  const snap = useEditorStore((s) => s.snap)
  const [orbitEnabled, setOrbitEnabled] = useState(true)

  return (
    <SceneStage room={room} orbitEnabled={orbitEnabled}>
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
          snap={snap}
          onSelect={selectItem}
          onTransform={updateTransform}
          onDragChange={(dragging) => setOrbitEnabled(!dragging)}
        />
      ))}
    </SceneStage>
  )
}

export default RoomCanvas
