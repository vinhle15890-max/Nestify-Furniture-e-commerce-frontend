import { Box3, Vector3 } from 'three'

export const INITIAL_EVIDENCE = Object.freeze({
  fetch: 'FETCH_FAILED',
  parse: 'PARSE_FAILED',
  meshCount: 0,
  bounds: null,
  rendered: 'FALLBACK_RENDERED',
})

export function inspectLoadedScene(scene) {
  let meshCount = 0
  scene.traverse((node) => {
    if (node.isMesh) meshCount += 1
  })
  const box = new Box3().setFromObject(scene)
  const size = box.getSize(new Vector3())
  const bounds = { width: size.x, height: size.y, depth: size.z }
  const finite = Object.values(bounds).every(Number.isFinite)
  const nonZero = Object.values(bounds).every((value) => value > 0)

  return {
    meshCount,
    bounds,
    sceneValid: meshCount > 0 && finite && nonZero,
  }
}

export function safeFailureEvidence(stage) {
  return {
    ...INITIAL_EVIDENCE,
    fetch: stage === 'fetch' ? 'FETCH_FAILED' : 'FETCH_OK',
  }
}
