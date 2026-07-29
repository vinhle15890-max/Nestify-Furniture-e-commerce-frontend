import { useRef } from 'react'
import { TransformControls } from '@react-three/drei'
import { FurnitureModelRuntime } from './FurnitureModel'
import { projectTransform } from '../../../features/roomPlanner/collision'

// `interactive = false` renders the model only — no click-to-select, no
// TransformControls gizmo — used for the "Chỉnh phòng" (top-down room-edit)
// mode where furniture is shown for reference but can't be manipulated.
export function PlacedItem({ item, room, selected, gizmoMode, alignmentEnabled = true, conflict, onSelect, onTransform, onDragChange, onMeasure, onModelError, onModelStateChange, interactive = true }) {
  const groupRef = useRef()
  const tcRef = useRef()
  const { position, rotation, scale } = item

  const commit = () => {
    const node = groupRef.current
    if (!node) return
    onTransform(item.localId, {
      position: { x: node.position.x, y: node.position.y, z: node.position.z },
      rotation: { x: node.rotation.x, y: node.rotation.y, z: node.rotation.z },
    })
  }

  const projectLive = () => {
    const node = groupRef.current
    if (!node || !room) return
    const rawX = node.position.x
    const rawY = node.position.y
    const rawZ = node.position.z
    const projected = projectTransform(item, {
      position: { x: rawX, y: rawY, z: rawZ },
      rotation: { x: node.rotation.x, y: node.rotation.y, z: node.rotation.z },
    }, room, alignmentEnabled)
    node.position.set(projected.position.x, projected.position.y, projected.position.z)
    node.rotation.set(projected.rotation.x, projected.rotation.y, projected.rotation.z)
    node.scale.set(projected.scale.x, projected.scale.y, projected.scale.z)
    // Decision Log (P0-1 gizmo desync): After clamping, shift TransformControls'
    // positionStart by the clamp delta so subsequent pointerMove frames compute
    // offset + positionStart from the corrected anchor. worldPositionStart and
    // pointStart are intentionally left unchanged — adjusting both would cancel
    // in the offset formula (offset = pointEnd − pointStart), defeating the fix.
    // Limitation: the helper drag-distance lines (START/END/DELTA) may show a
    // compressed distance near walls, but the main gizmo handles stay locked to
    // the furniture at all times. Full desync resolution occurs at pointerUp
    // when positionStart is re-initialised for the next drag.
    const tc = tcRef.current
    if (tc) {
      const dx = projected.position.x - rawX
      const dy = projected.position.y - rawY
      const dz = projected.position.z - rawZ
      if (dx !== 0 || dy !== 0 || dz !== 0) {
        tc.positionStart.x += dx
        tc.positionStart.y += dy
        tc.positionStart.z += dz
      }
    }
  }

  const content = (
    <group
      ref={groupRef}
      position={[position.x, position.y, position.z]}
      rotation={[rotation.x, rotation.y, rotation.z]}
      scale={[scale.x, scale.y, scale.z]}
      onClick={interactive ? (event) => {
        event.stopPropagation()
        onSelect(item.localId)
      } : undefined}
    >
      <FurnitureModelRuntime url={item.variant.model_3d_url} onMeasure={onMeasure} onError={onModelError} onStateChange={onModelStateChange} />
      {conflict && (
        // Quầng cảnh báo trên sàn RỘNG HƠN footprint (1.4×) để lộ viền quanh chân
        // món — mặt phẳng đúng bằng footprint sẽ bị chính model che khuất. `ink` mờ,
        // nhắc trung tính khi chồng lấn, KHÔNG đỏ báo động.
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <planeGeometry args={[item.footprint.x * 1.4, item.footprint.z * 1.4]} />
          <meshBasicMaterial color="#26262B" transparent opacity={0.22} depthWrite={false} />
        </mesh>
      )}
    </group>
  )

  if (!interactive || !selected) return content

  return (
    <TransformControls
      ref={tcRef}
      object={groupRef}
      mode={gizmoMode === 'rotate' ? 'rotate' : 'translate'}
      translationSnap={alignmentEnabled ? 0.1 : null}
      rotationSnap={alignmentEnabled ? Math.PI / 12 : null}
      showX={false}
      showY={gizmoMode !== 'translate'}
      showZ={false}
      onObjectChange={projectLive}
      onMouseUp={commit}
      onDraggingChanged={(e) => onDragChange(Boolean(e?.value))}
    >
      {content}
    </TransformControls>
  )
}
