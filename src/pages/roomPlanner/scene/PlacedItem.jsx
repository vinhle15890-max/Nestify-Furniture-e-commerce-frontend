import { useRef } from 'react'
import { TransformControls } from '@react-three/drei'
import { FurnitureModelRuntime } from './FurnitureModel'
import { projectTransform } from '../../../features/roomPlanner/collision'

// `interactive = false` renders the model only — no click-to-select, no
// TransformControls gizmo — used for the "Chỉnh phòng" (top-down room-edit)
// mode where furniture is shown for reference but can't be manipulated.
export function PlacedItem({ item, room, selected, gizmoMode, snap, wallSnap, conflict, onSelect, onTransform, onDragChange, onMeasure, onModelError, onModelStateChange, interactive = true }) {
  const groupRef = useRef()
  const { position, rotation, scale } = item

  const commit = () => {
    const node = groupRef.current
    if (!node) return
    onTransform(item.localId, {
      position: { x: node.position.x, y: node.position.y, z: node.position.z },
      rotation: { x: node.rotation.x, y: node.rotation.y, z: node.rotation.z },
      scale: { x: node.scale.x, y: node.scale.y, z: node.scale.z },
    })
  }

  const projectLive = () => {
    const node = groupRef.current
    if (!node || !room) return
    const projected = projectTransform(item, {
      position: { x: node.position.x, y: node.position.y, z: node.position.z },
      rotation: { x: node.rotation.x, y: node.rotation.y, z: node.rotation.z },
      scale: { x: node.scale.x, y: node.scale.y, z: node.scale.z },
    }, room, wallSnap)
    const assign = (target, value) => {
      if (typeof target?.set === 'function') target.set(value.x, value.y, value.z)
      else return { ...value }
      return target
    }
    node.position = assign(node.position, projected.position)
    node.rotation = assign(node.rotation, projected.rotation)
    node.scale = assign(node.scale, projected.scale)
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
      object={groupRef}
      mode={gizmoMode}
      translationSnap={snap ? 0.25 : null}
      rotationSnap={snap ? Math.PI / 12 : null}
      scaleSnap={snap ? 0.1 : null}
      showY={gizmoMode !== 'translate'}
      onObjectChange={projectLive}
      onMouseUp={commit}
      onDraggingChanged={(e) => onDragChange(Boolean(e?.value))}
    >
      {content}
    </TransformControls>
  )
}
