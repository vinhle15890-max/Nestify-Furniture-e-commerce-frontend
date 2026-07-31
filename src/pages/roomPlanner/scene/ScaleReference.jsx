import { useRef } from 'react'
import { TransformControls } from '@react-three/drei'
import { useEditorStore } from '../../../features/roomPlanner/editorStore'

// Mốc tỉ lệ THỤ ĐỘNG (không số đo, không verdict): bóng người ~1.7m = sự hiện diện
// của user (kéo được để ướm cạnh từng món) + khung cửa 0.9×2.0m cố định trên tường
// sau. Tông emerging/unbuilt, mờ. Chỉ hiện trong editor khi bật "Tỉ lệ".
export function ScaleReference({ room, onDragChange }) {
  const pos = useEditorStore((s) => s.scaleRefPos)
  const setScaleRefPos = useEditorStore((s) => s.setScaleRefPos)
  const groupRef = useRef()

  const commit = () => {
    const n = groupRef.current
    if (n) setScaleRefPos({ x: n.position.x, z: n.position.z })
  }

  return (
    <group>
      <TransformControls
        object={groupRef}
        mode="translate"
        showY={false}
        onMouseUp={commit}
        onDraggingChanged={(e) => onDragChange(Boolean(e?.value))}
      >
        {/* Người ~1.7m: capsule (thân) + sphere (đầu), emerging mờ. */}
        <group ref={groupRef} position={[pos.x, 0, pos.z]}>
          <mesh position={[0, 0.85, 0]}>
            <capsuleGeometry args={[0.2, 1.3, 6, 12]} />
            <meshStandardMaterial color="#A58B4C" transparent opacity={0.5} />
          </mesh>
          <mesh position={[0, 1.62, 0]}>
            <sphereGeometry args={[0.12, 16, 16]} />
            <meshStandardMaterial color="#A58B4C" transparent opacity={0.5} />
          </mesh>
        </group>
      </TransformControls>
      {/* Cửa 0.9×2.0m trên tường sau — unbuilt mờ, lệch ε tránh z-fighting. */}
      <mesh position={[0, 1.0, -room.depth / 2 + 0.01]}>
        <planeGeometry args={[0.9, 2.0]} />
        <meshStandardMaterial color="#D8D8CE" transparent opacity={0.4} />
      </mesh>
    </group>
  )
}
