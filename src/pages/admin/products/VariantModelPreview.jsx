/* eslint-disable react/no-unknown-property -- React Three Fiber JSX props. */
import { Suspense, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, useGLTF } from '@react-three/drei'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'

function PreviewModel({ url }) {
  const { scene } = useGLTF(url)
  const clone = useMemo(() => cloneSkinned(scene), [scene])

  return <primitive object={clone} />
}

export function VariantModelPreview({ url }) {
  return (
    <div className="h-72 overflow-hidden rounded-card border border-border bg-background" aria-label="Xem trước mô hình 3D và các trục X Y Z">
      <Canvas camera={{ position: [2, 1.5, 2], fov: 45 }}>
        <ambientLight intensity={1.5} />
        <directionalLight position={[3, 5, 4]} intensity={2} />
        <gridHelper args={[4, 16]} />
        <axesHelper args={[1.5]} />
        <Suspense fallback={null}>
          <PreviewModel url={url} />
        </Suspense>
        <OrbitControls makeDefault />
      </Canvas>
    </div>
  )
}
