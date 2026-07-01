// Floor + faint walls + grid, sized from room dimensions (metres). Centred at origin.
export function Room({ width, depth, height }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color="#F1ECE1" />
      </mesh>
      <gridHelper args={[Math.max(width, depth), Math.max(width, depth), '#D8CFBE', '#E8E1D2']} position={[0, 0.01, 0]} />
      {/* Back + side walls, low opacity so they never block the view. */}
      <mesh position={[0, height / 2, -depth / 2]}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial color="#FAF8F3" transparent opacity={0.18} />
      </mesh>
      <mesh position={[-width / 2, height / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[depth, height]} />
        <meshStandardMaterial color="#FAF8F3" transparent opacity={0.12} />
      </mesh>
    </group>
  )
}
