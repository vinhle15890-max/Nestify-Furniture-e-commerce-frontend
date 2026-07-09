import { Suspense } from 'react'
import { SceneStage } from './SceneStage'
import { FurnitureModel, PlaceholderBox, ModelErrorBoundary } from './FurnitureModel'

// Read-only render of a saved scene: the same stage as the editor, but each item
// is a static group — no TransformControls, no selection handler. Items are
// editor-state-shaped ({ localId, variant, position, rotation, scale }).
export function SharedSceneCanvas({ room, items }) {
  return (
    <SceneStage room={room}>
      {items.map((item) => (
        <group
          key={item.localId}
          position={[item.position.x, item.position.y, item.position.z]}
          rotation={[item.rotation.x, item.rotation.y, item.rotation.z]}
          scale={[item.scale.x, item.scale.y, item.scale.z]}
        >
          <ModelErrorBoundary>
            <Suspense fallback={<PlaceholderBox />}>
              {item.variant.model_3d_url ? <FurnitureModel url={item.variant.model_3d_url} /> : <PlaceholderBox />}
            </Suspense>
          </ModelErrorBoundary>
        </group>
      ))}
    </SceneStage>
  )
}
