/* eslint-disable react/no-unknown-property */
import { Component, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Html, OrbitControls, useGLTF } from '@react-three/drei'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { uploadModel } from '../../features/admin/products/api'
import { INITIAL_EVIDENCE, inspectLoadedScene, safeFailureEvidence } from './r2ModelEvidence'

export function DiagnosticModel({ url, onLoaded }) {
  const { scene, parser } = useGLTF(url)
  const clone = useMemo(() => cloneSkinned(scene), [scene])
  useEffect(() => onLoaded(inspectLoadedScene(clone), parser?.json?.extensionsUsed ?? []), [clone, onLoaded, parser])
  // `object` is Fiber's reserved primitive prop. A dashed path such as
  // `object-model` makes applyProps traverse a nested path that does not exist.
  return <primitive object={clone} />
}

export function Fallback() {
  return (
    <mesh position={[0, 0.5, 0]} name="r2-diagnostic-fallback">
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#6E6861" wireframe />
    </mesh>
  )
}

class ParseBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch() { this.props.onFailure() }
  componentDidUpdate(previousProps) {
    if (this.state.failed && previousProps.url !== this.props.url) this.setState({ failed: false })
  }
  render() { return this.state.failed ? <Fallback /> : this.props.children }
}

const formatBounds = (bounds) => bounds
  ? `${bounds.width.toFixed(3)} × ${bounds.depth.toFixed(3)} × ${bounds.height.toFixed(3)}`
  : '—'

export function R2ModelDiagnosticPage() {
  const initialUrl = new URLSearchParams(window.location.search).get('url') ?? ''
  const [url, setUrl] = useState(initialUrl)
  const [activeUrl, setActiveUrl] = useState('')
  const [evidence, setEvidence] = useState(INITIAL_EVIDENCE)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  const activatePublicUrl = async (publicUrl) => {
    const response = await fetch(publicUrl, { mode: 'cors' })
    if (!response.ok) throw new Error('Public fetch failed')
    setUrl(publicUrl)
    setEvidence((current) => ({ ...current, fetch: 'FETCH_OK' }))
    setActiveUrl(publicUrl)
  }

  const verify = async (event) => {
    event.preventDefault()
    setActiveUrl('')
    setEvidence(INITIAL_EVIDENCE)
    try {
      await activatePublicUrl(url)
    } catch {
      setEvidence(safeFailureEvidence('fetch'))
    }
  }

  const upload = async (event) => {
    event.preventDefault()
    const file = event.currentTarget.elements.model.files[0]
    if (!file) return
    setUploading(true)
    setUploadError('')
    setActiveUrl('')
    setEvidence(INITIAL_EVIDENCE)
    try {
      const formData = new FormData()
      formData.append('kind', 'model')
      formData.append('file', file)
      const result = await uploadModel(formData)
      await activatePublicUrl(result.data.url)
    } catch (error) {
      setEvidence(safeFailureEvidence('fetch'))
      setUploadError(error.message || 'Không thể tải GLB lên remote backend.')
    } finally {
      setUploading(false)
    }
  }

  const loaded = useCallback((result) => setEvidence({
    fetch: 'FETCH_OK',
    parse: result.sceneValid ? 'PARSE_OK' : 'PARSE_FAILED',
    meshCount: result.meshCount,
    bounds: result.bounds,
    rendered: result.sceneValid ? 'MODEL_RENDERED' : 'FALLBACK_RENDERED',
  }), [])

  return (
    <main className="grid min-h-screen grid-cols-1 bg-background text-foreground lg:grid-cols-[minmax(0,1fr)_20rem]">
      <section aria-label="Mô hình GLB kiểm tra" className="min-h-[65vh] lg:min-h-screen">
        <Canvas camera={{ position: [4, 3, 6], fov: 45 }}>
          <color attach="background" args={['#E9E5DE']} />
          <ambientLight intensity={1.5} />
          <directionalLight position={[4, 7, 5]} intensity={2} />
          <gridHelper args={[12, 12]} />
          {activeUrl ? (
            <ParseBoundary url={activeUrl} onFailure={() => setEvidence(safeFailureEvidence('parse'))}>
              <Suspense fallback={<Html center><span className="bg-surface px-3 py-2 text-sm">Đang tải GLB…</span></Html>}>
                <DiagnosticModel url={activeUrl} onLoaded={loaded} />
              </Suspense>
            </ParseBoundary>
          ) : <Fallback />}
          <OrbitControls makeDefault />
        </Canvas>
      </section>
      <aside className="border-l border-border bg-surface p-6">
        <form onSubmit={upload} className="mb-6 space-y-3">
          <label htmlFor="r2-model" className="block text-sm font-medium">Upload GLB qua remote API</label>
          <input id="r2-model" name="model" type="file" accept=".glb,model/gltf-binary" required className="w-full text-sm" />
          <button type="submit" disabled={uploading} className="rounded-control border border-border px-4 py-2 text-sm disabled:opacity-50">
            {uploading ? 'Đang upload…' : 'Upload và kiểm tra'}
          </button>
          {uploadError ? <p role="alert" className="text-sm text-destructive">{uploadError}</p> : null}
        </form>
        <form onSubmit={verify} className="mb-6 space-y-3">
          <label htmlFor="r2-url" className="block text-sm font-medium">Public R2 GLB URL</label>
          <input id="r2-url" type="url" required value={url} onChange={(event) => setUrl(event.target.value)} className="w-full rounded-control border border-border bg-background px-3 py-2 text-sm" />
          <button type="submit" className="rounded-control border border-border px-4 py-2 text-sm">Kiểm tra</button>
        </form>
        <dl className="space-y-4 font-mono text-sm" aria-label="R2 GLB evidence">
          <div><dt>FETCH</dt><dd>{evidence.fetch}</dd></div>
          <div><dt>PARSE</dt><dd>{evidence.parse}</dd></div>
          <div><dt>MESH_COUNT</dt><dd>{evidence.meshCount}</dd></div>
          <div><dt>COMPUTED_BOUNDS</dt><dd>{formatBounds(evidence.bounds)}</dd></div>
          <div><dt>RENDER</dt><dd>{evidence.rendered}</dd></div>
        </dl>
      </aside>
    </main>
  )
}
