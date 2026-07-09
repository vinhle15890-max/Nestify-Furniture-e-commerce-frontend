// Floor + faint walls + grid, sized from room dimensions (metres). Centred at origin.
// Colours are the "Becoming Room" palette (WebGL can't read CSS tokens, so the hex
// values mirror tokens.css): canvas floor/walls, `unbuilt` grid + `emerging` axes —
// the empty-outline "possibility" state before furniture materialises. Never brass/cream.
export function Room({ width, depth, height }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color="#F2F0EB" /> {/* canvas */}
      </mesh>
      {/* centre axes = `emerging` #8A7C68, grid lines = `unbuilt` #C9C4B8 */}
      <gridHelper args={[Math.max(width, depth), Math.max(width, depth), '#8A7C68', '#C9C4B8']} position={[0, 0.01, 0]} />
      {/* Back + side walls, low opacity so they never block the view. */}
      <mesh position={[0, height / 2, -depth / 2]}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial color="#F2F0EB" transparent opacity={0.18} /> {/* canvas */}
      </mesh>
      <mesh position={[-width / 2, height / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[depth, height]} />
        <meshStandardMaterial color="#F2F0EB" transparent opacity={0.12} /> {/* canvas */}
      </mesh>
    </group>
  )
}
