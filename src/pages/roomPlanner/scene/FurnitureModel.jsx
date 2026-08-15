import { Component, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
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
  [MODEL_STATE.NO_MODEL]: 'Chưa thể hiển thị món đồ',
  [MODEL_STATE.LOADING]: 'Đang chuẩn bị món đồ',
  [MODEL_STATE.LOAD_FAILED]: 'Không thể tải chi tiết món đồ',
}

export function PlaceholderBox({ state = MODEL_STATE.NO_MODEL, onStateChange, onRetry, size = { x: 1, y: 1, z: 1 } }) {
  useEffect(() => onStateChange?.(state), [onStateChange, state])
  const loading = state === MODEL_STATE.LOADING
  const failed = state === MODEL_STATE.LOAD_FAILED
  return (
    <group {...placeholderGroupProps(state)}>
      <mesh position={[0, size.y / 2, 0]}>
        <boxGeometry args={[size.x, size.y, size.z]} />
        <meshStandardMaterial color={failed ? '#6E6861' : '#A58B4C'} transparent opacity={loading ? 0.35 : 0.6} wireframe={loading} />
      </mesh>
      <Html center position={[0, 1.2, 0]}>
        <span role="status" data-model-state={state} className="flex items-center gap-2 whitespace-nowrap rounded-control border border-border bg-surface/95 px-2 py-1 text-xs text-foreground shadow-sm">
          {STATE_LABEL[state]}
          {failed && onRetry && <button type="button" onClick={(event) => { event.stopPropagation(); onRetry() }} className="rounded-control font-medium underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Thử lại</button>}
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
      ? <PlaceholderBox state={MODEL_STATE.LOAD_FAILED} onStateChange={this.props.onStateChange} onRetry={this.props.onRetry} size={this.props.placeholderSize} />
      : this.props.children
  }
}

export function FurnitureModelRuntime({ url, onMeasure, onError, onStateChange, placeholderSize }) {
  const [attempt, setAttempt] = useState(0)
  const handleReady = useCallback(
    () => onStateChange?.(MODEL_STATE.READY),
    [onStateChange],
  )
  if (!url) return <PlaceholderBox state={MODEL_STATE.NO_MODEL} onStateChange={onStateChange} size={placeholderSize} />
  const retry = () => {
    useGLTF.clear(url)
    setAttempt((value) => value + 1)
    onStateChange?.(MODEL_STATE.LOADING)
  }
  return (
    <ModelErrorBoundary resetKey={`${url}:${attempt}`} onRetry={retry} onError={onError} onStateChange={onStateChange} placeholderSize={placeholderSize}>
      <Suspense fallback={<PlaceholderBox state={MODEL_STATE.LOADING} onStateChange={onStateChange} size={placeholderSize} />}>
        <FurnitureModel url={url} onMeasure={onMeasure} onReady={handleReady} />
      </Suspense>
    </ModelErrorBoundary>
  )
}
