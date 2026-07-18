import { useState } from 'react'

/**
 * Probe whether the browser can create a WebGL rendering context. Tries WebGL 2
 * first, then falls back to WebGL 1 — a device may lack `webgl2` but still run
 * the (sufficient) `webgl` context three.js can use.
 */
function detectWebGLSupport() {
  if (typeof document === 'undefined') return false
  try {
    const canvas = document.createElement('canvas')
    // webgl2 first; only if it's unavailable do we attempt the webgl fallback.
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
    // Release the throwaway context immediately — browsers cap the number of
    // live WebGL contexts, and this probe one is disposable. Harmless no-op when
    // gl is null or the extension is unavailable. Does not affect the result.
    gl?.getExtension('WEBGL_lose_context')?.loseContext()
    return gl != null
  } catch {
    // Some browsers throw (rather than return null) when WebGL is blocked.
    return false
  }
}

/**
 * Returns whether WebGL is available, detected ONCE per mount.
 *
 * [Decision Log] Why detect-before-mount instead of an ErrorBoundary around
 * <Canvas>:
 *   - An ErrorBoundary is *recovery after the fact*: react-three-fiber must
 *     first attempt to mount <Canvas> and create the GL context; on failure it
 *     throws, emits console errors, and the user briefly sees a crashed frame
 *     before the boundary swaps in a fallback. Detection prevents the mount
 *     entirely — no thrown error, no flash, deterministic branch.
 *   - Context-creation failure can surface imperatively (not purely in React's
 *     render phase), so an ErrorBoundary is not a reliable catch for it.
 *   - Cheap: one throwaway <canvas>.getContext() call, run once.
 * ErrorBoundary/PlaceholderBox still own a *different* failure mode (per-model
 * GLTF load errors) and are intentionally untouched.
 */
export function useWebGLSupport() {
  // Lazy initializer → runs synchronously on the first render, before the
  // caller decides whether to mount <Canvas>. Never re-checks on re-render.
  const [supported] = useState(detectWebGLSupport)
  return supported
}
