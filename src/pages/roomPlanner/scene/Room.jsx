import { Grid } from '@react-three/drei'

// Pure decision of which wall faces render, out of the wall toggle flags stored
// on `room.walls` — kept as a standalone function because R3F meshes aren't
// assertable via RTL DOM, so this is what Room.test.jsx exercises directly.
// Fixed wall set: back/left/right only (no front — that's the viewing side).
export function visibleWalls(walls) {
  return {
    back: walls?.back ?? true,
    left: walls?.left ?? true,
    right: walls?.right ?? true,
  }
}

// Floor + faint walls + grid, sized from room dimensions (metres). Centred at origin.
// Colours are the "Becoming Room" palette (WebGL can't read CSS tokens, so the hex
// values mirror tokens.css): canvas floor/walls, `unbuilt` grid — the empty-outline
// "possibility" state before furniture materialises. Never brass/cream.
export function Room({ width, depth, height, walls }) {
  const v = visibleWalls(walls)
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color="#F2F0EB" /> {/* canvas */}
      </mesh>
      {/* Lưới KHÍT đúng hình phòng rộng×sâu, mỗi ô = 1m (giúp đọc tỉ lệ). `unbuilt`
          #C9C4B8. Trước đây gridHelper vuông max(w,d) → tràn ra ngoài tường. */}
      <Grid
        args={[width, depth]}
        position={[0, 0.01, 0]}
        cellSize={1}
        cellThickness={1}
        cellColor="#C9C4B8"
        sectionSize={Math.max(width, depth)}
        sectionColor="#C9C4B8"
        infiniteGrid={false}
        fadeDistance={40}
        fadeStrength={1}
      />
      {/* Back + side walls, low opacity so they never block the view. Each is
          toggleable via `walls` so the editor can hide a face for a clearer view. */}
      {v.back && (
        <mesh position={[0, height / 2, -depth / 2]}>
          <planeGeometry args={[width, height]} />
          <meshStandardMaterial color="#F2F0EB" transparent opacity={0.18} /> {/* canvas */}
        </mesh>
      )}
      {v.left && (
        <mesh position={[-width / 2, height / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[depth, height]} />
          <meshStandardMaterial color="#F2F0EB" transparent opacity={0.12} /> {/* canvas */}
        </mesh>
      )}
      {v.right && (
        <mesh position={[width / 2, height / 2, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[depth, height]} />
          <meshStandardMaterial color="#F2F0EB" transparent opacity={0.12} /> {/* canvas */}
        </mesh>
      )}
    </group>
  )
}
