import { Component, Suspense, useCallback, useEffect, useMemo } from 'react'
import { Box3, Vector3 } from 'three'
import { Html, useGLTF } from '@react-three/drei'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { baseOffset } from '../../../features/roomPlanner/threeD'
import { placeholderGroupProps } from './modelStateProps'

export const MODEL_STATE = Object.freeze({
  NO_MODEL: 'NO_MODEL',
  LOADING: 'LOADING',
  READY: 'READY',
  LOAD_FAILED: 'LOAD_FAILED',
})

export function FurnitureModel({ url, onMeasure, onReady }) {
  const { scene } = useGLTF(url)
  const measured = useMemo(() => {
    const clone = cloneSkinned(scene)
    const box = new Box3().setFromObject(clone)
    const size = box.getSize(new Vector3())
    clone.position.y += baseOffset(box)
    return { clone, size: { x: size.x, y: size.y, z: size.z } }
  }, [scene])

  useEffect(() => {
    onMeasure?.(measured.size)
    onReady?.()
  }, [measured, onMeasure, onReady])

  return <primitive object={measured.clone} />
}

const STATE_LABEL = {
  [MODEL_STATE.NO_MODEL]: 'Chưa có mô hình 3D',
  [MODEL_STATE.LOADING]: 'Đang tải mô hình',
  [MODEL_STATE.LOAD_FAILED]: 'Đang dùng khối thay thế',
}

export function PlaceholderBox({ state = MODEL_STATE.NO_MODEL, onStateChange }) {
  useEffect(() => onStateChange?.(state), [onStateChange, state])
  const loading = state === MODEL_STATE.LOADING
  const failed = state === MODEL_STATE.LOAD_FAILED
  return (
    <group {...placeholderGroupProps(state)}>
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={failed ? '#6E6861' : '#8A7C68'} transparent opacity={loading ? 0.35 : 0.6} wireframe={loading} />
      </mesh>
      <Html center position={[0, 1.2, 0]}>
        <span role="status" data-model-state={state} className="whitespace-nowrap rounded-control border border-border bg-surface/95 px-2 py-1 text-xs text-foreground shadow-sm">
          {STATE_LABEL[state]}
        </span>
      </Html>
    </group>
  )
}

export class ModelErrorBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error) { this.props.onError?.(error) }
  componentDidUpdate(previousProps) {
    if (this.state.failed && previousProps.resetKey !== this.props.resetKey) this.setState({ failed: false })
  }
  render() {
    return this.state.failed
      ? <PlaceholderBox state={MODEL_STATE.LOAD_FAILED} onStateChange={this.props.onStateChange} />
      : this.props.children
  }
}

export function FurnitureModelRuntime({ url, onMeasure, onError, onStateChange }) {
  const handleReady = useCallback(
    () => onStateChange?.(MODEL_STATE.READY),
    [onStateChange],
  )
  if (!url) return <PlaceholderBox state={MODEL_STATE.NO_MODEL} onStateChange={onStateChange} />
  return (
    <ModelErrorBoundary resetKey={url} onError={onError} onStateChange={onStateChange}>
      <Suspense fallback={<PlaceholderBox state={MODEL_STATE.LOADING} onStateChange={onStateChange} />}>
        <FurnitureModel url={url} onMeasure={onMeasure} onReady={handleReady} />
      </Suspense>
    </ModelErrorBoundary>
  )
}
