import { useEffect, useMemo, useRef, useState } from 'react'
import { SceneStage } from './SceneStage'
import { PlacedItem } from './PlacedItem'
import { ScaleReference } from './ScaleReference'
import { RoomEditOverlay } from './RoomEditOverlay'
import { useEditorStore } from '../../../features/roomPlanner/editorStore'
import { findOverlaps } from '../../../features/roomPlanner/collision'
import { registerPlannerCanvas, unregisterPlannerCanvas } from '../../../features/roomPlanner/canvasCapture'

// Editor canvas: composes the shared SceneStage and adds the interactive layer —
// the deselect plane and the gizmo-editable placed items, wired to the editor
// store. Dragging an item disables orbit so the two gestures don't fight.
//
// In "room" edit mode (editMode === 'room', the "Chỉnh phòng" top-down view),
// furniture becomes non-interactive reference-only content and the
// RoomEditOverlay (wall/size handles) takes over instead.
export function RoomCanvas() {
  const room = useEditorStore((s) => s.room)
  const items = useEditorStore((s) => s.items)
  const selectedId = useEditorStore((s) => s.selectedId)
  const gizmoMode = useEditorStore((s) => s.gizmoMode)
  const editMode = useEditorStore((s) => s.editMode)
  const selectItem = useEditorStore((s) => s.selectItem)
  const updateTransform = useEditorStore((s) => s.updateTransform)
  const reportFootprint = useEditorStore((s) => s.reportFootprint)
  const snap = useEditorStore((s) => s.snap)
  const showScaleRef = useEditorStore((s) => s.showScaleRef)
  const [orbitEnabled, setOrbitEnabled] = useState(true)
  const canvasElRef = useRef(null)
  const topDown = editMode === 'room'

  // Huỷ đăng ký canvas khi editor unmount (để capturePlannerPreview không trỏ canvas cũ).
  useEffect(() => () => { if (canvasElRef.current) unregisterPlannerCanvas(canvasElRef.current) }, [])

  // Which items overlap another (top-down footprints). Recomputes when items move
  // OR when their footprints get measured — both live in `items`.
  const conflictSet = useMemo(() => findOverlaps(items), [items])

  return (
    <SceneStage
      room={room}
      orbitEnabled={orbitEnabled}
      topDown={topDown}
      onRendererReady={(gl) => { canvasElRef.current = gl.domElement; registerPlannerCanvas(gl.domElement) }}
    >
      {/* Click empty space → deselect. Hidden in room mode: nothing to select there. */}
      {!topDown && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} onClick={() => selectItem(null)} visible={false}>
          <planeGeometry args={[room.width, room.depth]} />
        </mesh>
      )}
      {items.map((item) => (
        <PlacedItem
          key={item.localId}
          item={item}
          selected={!topDown && item.localId === selectedId}
          gizmoMode={gizmoMode}
          snap={snap}
          conflict={conflictSet.has(item.localId)}
          onSelect={topDown ? undefined : selectItem}
          onTransform={updateTransform}
          onDragChange={(dragging) => setOrbitEnabled(!dragging)}
          onMeasure={(size) => reportFootprint(item.localId, size)}
          interactive={!topDown}
        />
      ))}
      {topDown && <RoomEditOverlay room={room} onDragChange={(d) => setOrbitEnabled(!d)} />}
      {showScaleRef && !topDown && <ScaleReference room={room} onDragChange={(dragging) => setOrbitEnabled(!dragging)} />}
    </SceneStage>
  )
}

export default RoomCanvas
