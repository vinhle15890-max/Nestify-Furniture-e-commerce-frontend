import { useRef } from 'react'
import { TransformControls } from '@react-three/drei'
import { Plane, Vector3 } from 'three'

const COLORS = { column: '#6E6861', cutout: '#292A20', restricted: '#B5754A', door_swing: '#A58B4C' }

function ObstacleShape({ obstacle, selected, interactive, onSelect, onUpdate, onDragChange, mode }) {
  const groupRef = useRef()
  const dragRef = useRef(null)
  const floor = useRef(new Plane(new Vector3(0, 1, 0), 0))
  const point = useRef(new Vector3())

  const commit = () => {
    const node = groupRef.current
    if (!node) return
    onUpdate?.(obstacle.id, { x: node.position.x, z: node.position.z, rotation: node.rotation.y })
  }
  const start = (event) => {
    event.stopPropagation()
    onSelect?.(obstacle.id)
    if (mode !== 'translate' || !event.ray?.intersectPlane(floor.current, point.current)) return
    dragRef.current = { pointerId: event.pointerId, dx: obstacle.x - point.current.x, dz: obstacle.z - point.current.z }
    event.target?.setPointerCapture?.(event.pointerId)
    onDragChange?.(true)
  }
  const move = (event) => {
    if (!dragRef.current || !groupRef.current || !event.ray?.intersectPlane(floor.current, point.current)) return
    event.stopPropagation()
    groupRef.current.position.x = point.current.x + dragRef.current.dx
    groupRef.current.position.z = point.current.z + dragRef.current.dz
  }
  const end = (event) => {
    if (!dragRef.current) return
    event.stopPropagation()
    event.target?.releasePointerCapture?.(dragRef.current.pointerId)
    dragRef.current = null
    commit()
    onDragChange?.(false)
  }

  const radius = Math.max(obstacle.width, obstacle.depth)
  const content = (
    <group ref={groupRef} position={[obstacle.x, 0.04, obstacle.z]} rotation={[0, obstacle.rotation ?? 0, 0]} onPointerDown={interactive ? start : undefined} onPointerMove={interactive ? move : undefined} onPointerUp={interactive ? end : undefined} onPointerCancel={interactive ? end : undefined} onClick={interactive ? (event) => { event.stopPropagation(); onSelect?.(obstacle.id) } : undefined}>
      {obstacle.type === 'door_swing' ? (
        <group>
          {/* Invisible hit area makes the thin arc easy to select without drawing its collision box. */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} visible={false}><planeGeometry args={[radius * 2, radius * 2]} /><meshBasicMaterial /></mesh>
          {/* Hinge, closed leaf, and 90° sweep communicate a door instead of an abstract square. */}
          <mesh position={[0, 0.012, 0]}><cylinderGeometry args={[0.075, 0.075, 0.025, 20]} /><meshBasicMaterial color={COLORS.door_swing} /></mesh>
          <mesh position={[radius / 2, 0.008, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[radius, 0.035]} /><meshBasicMaterial color={COLORS.door_swing} /></mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[Math.max(0.05, radius - (selected ? 0.06 : 0.035)), radius, 32, 1, 0, Math.PI / 2]} />
            <meshBasicMaterial color={COLORS.door_swing} transparent opacity={selected ? 1 : 0.75} side={2} />
          </mesh>
        </group>
      ) : (
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[obstacle.width, obstacle.depth]} />
          <meshBasicMaterial color={COLORS[obstacle.type] ?? COLORS.restricted} transparent opacity={selected ? 0.72 : 0.42} side={2} />
        </mesh>
      )}
    </group>
  )

  if (!interactive || !selected) return content
  return <TransformControls object={groupRef} mode={mode} showX={mode === 'translate'} showY={mode === 'rotate'} showZ={mode === 'translate'} translationSnap={0.1} rotationSnap={Math.PI / 12} onMouseDown={() => onDragChange?.(true)} onMouseUp={() => { commit(); onDragChange?.(false) }}>{content}</TransformControls>
}

export function ObstacleLayer({ obstacles = [], interactive = false, selectedId, mode = 'translate', onSelect, onUpdate, onDragChange }) {
  return obstacles.map((obstacle) => <ObstacleShape key={obstacle.id} obstacle={obstacle} selected={obstacle.id === selectedId} interactive={interactive} mode={mode} onSelect={onSelect} onUpdate={onUpdate} onDragChange={onDragChange} />)
}
