import { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'

// Loads a .glb and returns a fresh clone so repeated instances don't share nodes.
// Suspends while loading; an ErrorBoundary in PlacedItem renders the fallback box.
export function FurnitureModel({ url }) {
  const { scene } = useGLTF(url)
  const object = useMemo(() => cloneSkinned(scene), [scene])
  return <primitive object={object} />
}

export function PlaceholderBox() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      {/* `emerging` #8A7C68 — a being-considered placeholder while the .glb loads
          (or on load failure). Never brass: DNA §2 removed that hue. */}
      <meshStandardMaterial color="#8A7C68" transparent opacity={0.6} />
    </mesh>
  )
}
