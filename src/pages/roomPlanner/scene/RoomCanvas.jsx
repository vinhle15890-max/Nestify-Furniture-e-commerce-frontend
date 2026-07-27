import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SceneStage } from './SceneStage'
import { PlacedItem } from './PlacedItem'
import { ScaleReference } from './ScaleReference'
import { RoomEditOverlay } from './RoomEditOverlay'
import { useEditorStore } from '../../../features/roomPlanner/editorStore'
import { findOverlaps } from '../../../features/roomPlanner/collision'
import { registerPlannerCanvas, unregisterPlannerCanvas } from '../../../features/roomPlanner/canvasCapture'
import { DimensionComparisonFallback } from '../DimensionComparisonFallback'

const observeModelError = (error) => console.error('Planner furniture model failed to render', error)

function EditorPlacedItem({ item, setOrbitEnabled, ...props }) {
  const reportFootprint = useEditorStore((s) => s.reportFootprint)
  const handleDragChange = useCallback(
    (dragging) => setOrbitEnabled(!dragging),
    [setOrbitEnabled],
  )
  const handleMeasure = useCallback(
    (size) => reportFootprint(item.localId, size),
    [item.localId, reportFootprint],
  )

  return (
    <PlacedItem
      {...props}
      item={item}
      onDragChange={handleDragChange}
      onMeasure={handleMeasure}
    />
  )
}

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
  const viewMode = useEditorStore((s) => s.viewMode)
  const selectItem = useEditorStore((s) => s.selectItem)
  const updateTransform = useEditorStore((s) => s.updateTransform)
  const showScaleRef = useEditorStore((s) => s.showScaleRef)
  const [alignmentBypassed, setAlignmentBypassed] = useState(false)
  const [orbitEnabled, setOrbitEnabled] = useState(true)
  const canvasElRef = useRef(null)
  const topDown = editMode === 'room' || viewMode === 'top'

  // Huỷ đăng ký canvas khi editor unmount (để capturePlannerPreview không trỏ canvas cũ).
  useEffect(() => () => { if (canvasElRef.current) unregisterPlannerCanvas(canvasElRef.current) }, [])

  useEffect(() => {
    const updateBypass = (event) => setAlignmentBypassed(event.altKey)
    const clearBypass = () => setAlignmentBypassed(false)
    window.addEventListener('keydown', updateBypass)
    window.addEventListener('keyup', updateBypass)
    window.addEventListener('blur', clearBypass)
    return () => {
      window.removeEventListener('keydown', updateBypass)
      window.removeEventListener('keyup', updateBypass)
      window.removeEventListener('blur', clearBypass)
    }
  }, [])

  // Which items overlap another (top-down footprints). Recomputes when items move
  // OR when their footprints get measured — both live in `items`.
  const conflictSet = useMemo(() => findOverlaps(items), [items])

  return (
    <SceneStage
      room={room}
      fallback={<DimensionComparisonFallback room={room} items={items} />}
      orbitEnabled={orbitEnabled}
      topDown={topDown}
      onRendererReady={(gl) => { canvasElRef.current = gl.domElement; registerPlannerCanvas(gl.domElement) }}
    >
      {/* Click empty space → deselect. Hidden in room mode: nothing to select there. */}
      {editMode !== 'room' && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} onClick={() => selectItem(null)} visible={false}>
          <planeGeometry args={[room.width, room.depth]} />
        </mesh>
      )}
      {items.map((item) => (
        <EditorPlacedItem
          key={item.localId}
          item={item}
          setOrbitEnabled={setOrbitEnabled}
          room={room}
          selected={editMode !== 'room' && item.localId === selectedId}
          gizmoMode={gizmoMode}
          alignmentEnabled={!alignmentBypassed}
          conflict={conflictSet.has(item.localId)}
          onSelect={editMode === 'room' ? undefined : selectItem}
          onTransform={updateTransform}
          onModelError={observeModelError}
          interactive={editMode !== 'room'}
        />
      ))}
      {topDown && <RoomEditOverlay room={room} onDragChange={(d) => setOrbitEnabled(!d)} />}
      {showScaleRef && !topDown && <ScaleReference room={room} onDragChange={(dragging) => setOrbitEnabled(!dragging)} />}
    </SceneStage>
  )
}

export default RoomCanvas
