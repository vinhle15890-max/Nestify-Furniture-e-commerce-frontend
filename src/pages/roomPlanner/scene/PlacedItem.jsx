import { Suspense, useRef } from 'react'
import { TransformControls } from '@react-three/drei'
import { FurnitureModel, PlaceholderBox, ModelErrorBoundary } from './FurnitureModel'

export function PlacedItem({ item, selected, gizmoMode, snap, onSelect, onTransform, onDragChange }) {
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
          {item.variant.model_3d_url ? <FurnitureModel url={item.variant.model_3d_url} /> : <PlaceholderBox />}
        </Suspense>
      </ModelErrorBoundary>
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
