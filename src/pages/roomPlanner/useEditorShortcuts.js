import { useEffect } from 'react'
import { useEditorStore } from '../../features/roomPlanner/editorStore'

const GIZMO_KEYS = { 1: 'translate', 2: 'rotate' }
const MOVE_KEYS = {
  ArrowLeft: { x: -1, z: 0 },
  ArrowRight: { x: 1, z: 0 },
  ArrowUp: { x: 0, z: -1 },
  ArrowDown: { x: 0, z: 1 },
}
const ROTATE_KEYS = { '[': -1, ']': 1 }

// Keyboard editing for the planner. Reads the store via getState() so the single
// window listener never goes stale. No-ops while typing in a field or before the
// room is ready.
export function useEditorShortcuts(enabled = true) {
  useEffect(() => {
    if (!enabled) return undefined

    const handler = (e) => {
      const store = useEditorStore.getState()
      if (store.status !== 'ready') return

      const t = e.target
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return

      const mod = e.ctrlKey || e.metaKey
      const key = e.key.toLowerCase()

      if (mod && key === 'z') { e.preventDefault(); e.shiftKey ? store.redo() : store.undo(); return }
      if (mod && key === 'y') { e.preventDefault(); store.redo(); return }
      if (mod && key === 'd') { e.preventDefault(); store.duplicateSelected(); return }
      if (mod) return // leave other ctrl/cmd combos to the browser

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (store.selectedId !== null) { e.preventDefault(); store.deleteSelected() }
        return
      }
      if (MOVE_KEYS[e.key] && store.selectedId !== null) {
        e.preventDefault()
        const step = e.shiftKey ? 0.5 : 0.1
        const direction = MOVE_KEYS[e.key]
        store.nudgeSelected({ x: direction.x * step, z: direction.z * step })
        return
      }
      if (ROTATE_KEYS[e.key] && store.selectedId !== null) {
        e.preventDefault()
        store.rotateSelected(ROTATE_KEYS[e.key] * Math.PI / 12)
        return
      }
      if (e.key === 'Enter' && store.pendingPlacementId !== null) {
        e.preventDefault()
        store.confirmPlacement()
        return
      }
      if (e.key === 'Escape') {
        if (store.pendingPlacementId !== null) store.cancelPlacement()
        else store.selectItem(null)
        return
      }
      if (GIZMO_KEYS[e.key]) { store.setGizmoMode(GIZMO_KEYS[e.key]) }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [enabled])
}
