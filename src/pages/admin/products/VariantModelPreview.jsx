/* eslint-disable react/no-unknown-property -- React Three Fiber JSX props. */
import { Suspense, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { Line, OrbitControls, useGLTF } from '@react-three/drei'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'

const AXIS_LINES = {
  x: [[0, 0, 0], [1.5, 0, 0]],
  y: [[0, 0, 0], [0, 1.5, 0]],
  z: [[0, 0, 0], [0, 0, 1.5]],
}
const AXIS_COLORS = { x: '#ff0000', y: '#00ff00', z: '#0000ff' }

function PreviewModel({ url }) {
  const { scene } = useGLTF(url)
  const clone = useMemo(() => cloneSkinned(scene), [scene])

  return <primitive object={clone} />
}

export function VariantModelPreview({ url, activeAxis }) {
  return (
    <div className="h-56 overflow-hidden rounded-card border border-border bg-background sm:h-64" aria-label="Xem trước mô hình 3D và các trục X Y Z">
      <Canvas camera={{ position: [2, 1.5, 2], fov: 45 }}>
        <ambientLight intensity={1.5} />
        <directionalLight position={[3, 5, 4]} intensity={2} />
        <gridHelper args={[4, 16]} />
        <axesHelper args={[1.5]} />
        {activeAxis && (
          <Line
            points={AXIS_LINES[activeAxis]}
            color={AXIS_COLORS[activeAxis]}
            lineWidth={6}
          />
        )}
        <Suspense fallback={null}>
          <PreviewModel url={url} />
        </Suspense>
        <OrbitControls makeDefault />
      </Canvas>
    </div>
  )
}
