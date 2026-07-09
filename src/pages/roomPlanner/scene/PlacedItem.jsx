import { Suspense, useRef } from 'react'
import { TransformControls } from '@react-three/drei'
import { FurnitureModel, PlaceholderBox, ModelErrorBoundary } from './FurnitureModel'

export function PlacedItem({ item, selected, gizmoMode, snap, conflict, onSelect, onTransform, onDragChange, onMeasure }) {
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

  const content = (
    <group
      ref={groupRef}
      position={[position.x, position.y, position.z]}
      rotation={[rotation.x, rotation.y, rotation.z]}
      scale={[scale.x, scale.y, scale.z]}
      onClick={(event) => {
        event.stopPropagation()
        onSelect(item.localId)
      }}
    >
      <ModelErrorBoundary>
        <Suspense fallback={<PlaceholderBox />}>
          {item.variant.model_3d_url
            ? <FurnitureModel url={item.variant.model_3d_url} onMeasure={onMeasure} />
            : <PlaceholderBox />}
        </Suspense>
      </ModelErrorBoundary>
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

  if (!selected) return content

  return (
    <TransformControls
      object={groupRef}
      mode={gizmoMode}
      translationSnap={snap ? 0.25 : null}
      rotationSnap={snap ? Math.PI / 12 : null}
      scaleSnap={snap ? 0.1 : null}
      onMouseUp={commit}
      onDraggingChanged={(e) => onDragChange(Boolean(e?.value))}
    >
      {content}
    </TransformControls>
  )
}
