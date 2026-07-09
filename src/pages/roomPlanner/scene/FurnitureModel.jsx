import { Component, useEffect, useMemo } from 'react'
import { Box3, Vector3 } from 'three'
import { useGLTF } from '@react-three/drei'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { baseOffset } from '../../../features/roomPlanner/threeD'

// Loads a .glb and returns a fresh clone so repeated instances don't share nodes.
// The clone is shifted so its base sits at local y=0 — a group at y=0 then rests
// on the floor instead of sinking (models are authored around a centred origin).
// Suspends while loading; an ErrorBoundary in PlacedItem renders the fallback box.
// `onMeasure(size)` reports the model's real footprint (metres) up to the store so
// overlap-detection and wall-clamp know how big the item actually is.
export function FurnitureModel({ url, onMeasure }) {
  const { scene } = useGLTF(url)
  const measured = useMemo(() => {
    const clone = cloneSkinned(scene)
    const box = new Box3().setFromObject(clone)
    const size = box.getSize(new Vector3())
    clone.position.y += baseOffset(box)
    return { clone, size: { x: size.x, y: size.y, z: size.z } }
  }, [scene])

  // Push the real size once when the model is ready. reportFootprint no-ops when
  // the size is unchanged, so re-firing (if onMeasure's identity changes) is safe.
  useEffect(() => {
    onMeasure?.(measured.size)
  }, [measured, onMeasure])

  return <primitive object={measured.clone} />
}

export function PlaceholderBox() {
  // `emerging` #8A7C68 — a being-considered placeholder while the .glb loads (or
  // on load failure). Centred unit cube, lifted 0.5 so its base rests on the floor.
  return (
    <mesh position={[0, 0.5, 0]}>
      <boxGeometry args={[1, 1, 1]} />
      {/* Never brass: DNA §2 removed that hue. */}
      <meshStandardMaterial color="#8A7C68" transparent opacity={0.6} />
    </mesh>
  )
}

// Renders a placeholder if its child throws (e.g. a broken/missing .glb). Shared
// by the editor's PlacedItem and the read-only SharedSceneCanvas.
export class ModelErrorBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? <PlaceholderBox /> : this.props.children
  }
}
