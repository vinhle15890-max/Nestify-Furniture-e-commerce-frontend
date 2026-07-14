import { expect, it } from 'vitest'
import { BoxGeometry, Group, Mesh, MeshBasicMaterial, Object3D } from 'three'
import { inspectLoadedScene, safeFailureEvidence } from './r2ModelEvidence'

it('reports mesh count and finite non-zero bounds for a loaded scene', () => {
  const scene = new Group()
  scene.add(new Mesh(new BoxGeometry(2, 3, 4), new MeshBasicMaterial()))
  expect(inspectLoadedScene(scene)).toMatchObject({
    meshCount: 1,
    bounds: { width: 2, height: 3, depth: 4 },
    sceneValid: true,
  })
})

it('does not report an empty scene as scene valid', () => {
  expect(inspectLoadedScene(new Object3D())).toMatchObject({ meshCount: 0, sceneValid: false })
})

it('distinguishes fetch and parse failures without retaining an input URL', () => {
  expect(safeFailureEvidence('fetch')).toEqual(expect.objectContaining({ fetch: 'FETCH_FAILED', parse: 'PARSE_FAILED', rendered: 'FALLBACK_RENDERED' }))
  expect(safeFailureEvidence('parse')).toEqual(expect.objectContaining({ fetch: 'FETCH_OK', parse: 'PARSE_FAILED', rendered: 'FALLBACK_RENDERED' }))
  expect(JSON.stringify(safeFailureEvidence('parse'))).not.toContain('http')
})
