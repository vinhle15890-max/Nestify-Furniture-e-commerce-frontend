import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { RoomCanvas } from './scene/RoomCanvas'
import { RoomSetupDialog } from './RoomSetupDialog'
import { CatalogTray } from './CatalogTray'
import { PlannerToolbar } from './PlannerToolbar'
import { ShareSceneDialog } from './ShareSceneDialog'
import { SelectedItemPanel } from './SelectedItemPanel'
import { RoomSummary } from './RoomSummary'
import { useEditorShortcuts } from './useEditorShortcuts'
import { SmallScreenNotice } from './SmallScreenNotice'
import { Spinner } from '../../components/Spinner'
import { useEditorStore } from '../../features/roomPlanner/editorStore'
import { useScene, useCreateScene, useUpdateScene, useAddSceneToCart, useShareScene } from '../../features/roomPlanner/hooks'
import { useProductPreload } from '../../features/catalog/hooks'
import { editorStateToPayload } from '../../features/roomPlanner/mappers'
import { useToastStore } from '../../store/toastStore'

const DEFAULT_ROOM = { width: 4, depth: 5, height: 2.8 }

export function RoomPlannerPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const addToast = useToastStore((state) => state.addToast)

  const sceneQuery = useScene(id)
  const createScene = useCreateScene()
  const updateScene = useUpdateScene()
  const addSceneToCart = useAddSceneToCart()
  const shareScene = useShareScene()

  const store = useEditorStore()
  const [setupOpen, setSetupOpen] = useState(!id)
  const [shareToken, setShareToken] = useState(null)

  // Keyboard editing (delete / undo / redo / duplicate / gizmo modes / deselect).
  useEditorShortcuts()

  // ── Deep-link preload: /room-planner?product=<slug>&variant=<id> ──────────
  // URL query params are the SINGLE source of truth for the pending preload —
  // never stashed in the (module-singleton) store or a module var, which would
  // outlive the page and bleed into a later param-less visit.
  const [searchParams, setSearchParams] = useSearchParams()
  const previewSlug = searchParams.get('product')
  const variantId = searchParams.get('variant')
  const hasDeepLink = Boolean(previewSlug && variantId)
  const numericVariantId = Number(variantId) // STEP 3 coercion (variant.id is a JSON number)
  const applied = useRef(false)
  // Request-scoped 10s timeout; disabled unless a full deep-link is present.
  const productQuery = useProductPreload(hasDeepLink ? previewSlug : null)

  // Targeted param removal — clears ONLY the two preload keys, preserving any
  // other query param (UTM, etc.). Never `setSearchParams({})` (wipes all).
  const clearPreloadParams = () => {
    const next = new URLSearchParams(searchParams)
    next.delete('product')
    next.delete('variant')
    setSearchParams(next, { replace: true })
  }

  // Fresh store whenever the route target changes.
  useEffect(() => {
    store.reset()
    setSetupOpen(!id)
    return () => store.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // Hydrate an existing scene once it loads.
  useEffect(() => {
    if (id && sceneQuery.data?.data) {
      store.loadScene(sceneQuery.data.data)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, sceneQuery.data])

  // Warn before closing the tab with unsaved work.
  useEffect(() => {
    const handler = (event) => {
      if (store.dirty) {
        event.preventDefault()
        event.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [store.dirty])

  // Combined-condition apply effect. Two async sources — the product fetch
  // (Source A) and the room becoming ready via initNew/loadScene (Source B) —
  // settle in unknown order; gate on BOTH, so it fires when whichever lands
  // last. Gating on status==='ready' also inherently runs the merge AFTER
  // initNew's item-reset (no separate fresh-visit sequencing needed).
  useEffect(() => {
    if (!hasDeepLink || applied.current) return
    if (store.status !== 'ready') return
    if (!productQuery.isSuccess) return
    const variant = productQuery.data?.data?.variants?.find((v) => v.id === numericVariantId)
    if (!variant) return // variant-absent → handled by the fail effect below
    applied.current = true

    // Edge 2: dedupe only in the deep-link path (manual tray-add keeps its
    // intentional append-duplicates behavior). Same Number() coercion here.
    const existing = store.items.find((it) => it.variant.id === numericVariantId)
    if (existing) {
      store.selectItem(existing.localId)
      addToast({ title: `${variant.name} đã có trong phòng.` })
    } else {
      store.addVariant(variant)
      addToast({ title: `Đã thêm ${variant.name} vào phòng đang mở.`, variant: 'success' })
    }
    clearPreloadParams()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.status, productQuery.isSuccess, productQuery.data, variantId])

  // Fail effect — three distinct tiers, kept out of the apply effect so it
  // stays a clean "all-green → apply" gate.
  useEffect(() => {
    if (!hasDeepLink || applied.current) return

    if (productQuery.isError) {
      applied.current = true
      const err = productQuery.error
      // Tier 1: product genuinely gone (404). Its own page would 404 too → home.
      if (err?.status === 404 || err?.code === 'NOT_FOUND') {
        addToast({ title: 'Sản phẩm không tồn tại hoặc đã ngừng bán.', variant: 'error' })
        navigate('/')
        return
      }
      // Tier 3: network / timeout / 5xx. MUST gate on store.dirty before any
      // navigate() — a programmatic nav bypasses the dirty-guard (beforeunload
      // fires only on real unload; handleExit's confirm isn't on this path).
      addToast({ title: 'Không tải được sản phẩm, vui lòng thử lại.', variant: 'error' })
      if (store.dirty) {
        // Real in-progress scene: leave it completely untouched, just drop the
        // failed intent from the URL. Do NOT navigate away.
        clearPreloadParams()
      } else {
        // Fresh / empty room — nothing to lose. Product page = a natural retry.
        navigate(`/p/${previewSlug}`)
      }
      return
    }

    // Tier 2: fetch OK but the variant isn't in variants[] (inactive OR bad id
    // — the API elides inactive variants, so we can't tell which; don't claim
    // to). The product page itself works, so send them there to re-pick.
    if (productQuery.isSuccess) {
      const variant = productQuery.data?.data?.variants?.find((v) => v.id === numericVariantId)
      if (!variant) {
        applied.current = true
        addToast({
          title: 'Phiên bản bạn chọn hiện không khả dụng — vui lòng chọn phiên bản khác.',
          variant: 'error',
        })
        navigate(`/p/${previewSlug}`)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productQuery.isError, productQuery.isSuccess, productQuery.data, productQuery.error, variantId, store.dirty])

  const handleCreateRoom = (room) => {
    store.initNew(room)
    setSetupOpen(false)
  }

  // Radix fires onOpenChange only on user-driven dismiss (Esc / overlay / X) —
  // NOT on our controlled close in handleCreateRoom. So dismissing the setup
  // dialog without submitting means abandoning the deep-link intent: drop the
  // params so the failed preload can't linger or re-trigger on back/forward.
  const handleSetupOpenChange = (open) => {
    setSetupOpen(open)
    if (!open && hasDeepLink && !applied.current) clearPreloadParams()
  }

  // Persist the scene if there are unsaved changes, returning the scene id.
  // Shared by Save and Add-to-cart — the cart handoff needs a saved scene id to
  // tag items with (the whole point of the imagined callback in the Cart).
  const ensureSaved = async () => {
    if (store.id && !store.dirty) return store.id
    const payload = editorStateToPayload(store)
    if (store.id) {
      await updateScene.mutateAsync({ id: store.id, payload })
      return store.id
    }
    const response = await createScene.mutateAsync(payload)
    store.markSaved(response.data.id)
    navigate(`/room-planner/${response.data.id}`, { replace: true })
    return response.data.id
  }

  const handleSave = async () => {
    try {
      await ensureSaved()
      addToast({ title: 'Đã lưu phòng.', variant: 'success' })
    } catch (error) {
      addToast({ title: 'Lưu phòng thất bại.', description: error?.message, variant: 'error' })
    }
  }

  const handleAddToCart = async () => {
    try {
      const sceneId = await ensureSaved()
      const response = await addSceneToCart.mutateAsync(sceneId)
      const skipped = response?.meta?.skipped ?? []
      if (skipped.length > 0) {
        addToast({
          title: 'Đã thêm phòng vào giỏ.',
          description: `Một số món hiện hết hàng, chưa thêm được: ${skipped.join(', ')}.`,
          variant: 'default',
        })
      } else {
        addToast({ title: 'Đã thêm phòng vào giỏ.', variant: 'success' })
      }
      navigate('/cart')
    } catch (error) {
      addToast({ title: 'Thêm vào giỏ thất bại.', description: error?.message, variant: 'error' })
    }
  }

  // "Đặt cả phòng": express path into the existing checkout. Reuses the same
  // save + add-to-cart handoff as "Thêm vào giỏ", but lands on /checkout instead
  // of /cart — the checkout then owns address/payment/voucher/confirm.
  const handleOrder = async () => {
    try {
      const sceneId = await ensureSaved()
      const response = await addSceneToCart.mutateAsync(sceneId)
      const skipped = response?.meta?.skipped ?? []
      if (skipped.length > 0) {
        addToast({
          title: 'Đã thêm phòng vào giỏ.',
          description: `Một số món hiện hết hàng, chưa thêm được: ${skipped.join(', ')}.`,
          variant: 'default',
        })
      }
      navigate('/checkout')
    } catch (error) {
      addToast({ title: 'Không thể đặt phòng.', description: error?.message, variant: 'error' })
    }
  }

  // Share needs a saved scene (the public link resolves a persisted scene id),
  // so persist first, then make it public and surface the copy dialog. `share`
  // is idempotent server-side, so re-sharing returns the same token.
  const handleShare = async () => {
    try {
      const sceneId = await ensureSaved()
      const response = await shareScene.mutateAsync(sceneId)
      setShareToken(response.data.share_token)
    } catch (error) {
      addToast({ title: 'Tạo link chia sẻ thất bại.', description: error?.message, variant: 'error' })
    }
  }

  const handleExit = () => {
    if (store.dirty && !window.confirm('Bạn có thay đổi chưa lưu. Thoát?')) return
    navigate('/')
  }

  const selectedItem = store.items.find((item) => item.localId === store.selectedId) ?? null

  if (id && sceneQuery.isLoading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-canvas">
        <Spinner label="Đang tải phòng" />
      </div>
    )
  }
  if (id && sceneQuery.isError) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-3 bg-canvas text-center">
        <p className="text-foreground">Không tìm thấy phòng thiết kế.</p>
        <button type="button" onClick={() => navigate('/')} className="text-accent hover:underline">Về cửa hàng</button>
      </div>
    )
  }

  return (
    <div>
      <SmallScreenNotice />
      <div className="hidden h-dvh flex-col lg:flex">
        <PlannerToolbar
          name={store.name}
          onNameChange={store.setName}
          gizmoMode={store.gizmoMode}
          onGizmoModeChange={store.setGizmoMode}
          onSave={handleSave}
          saving={createScene.isPending || updateScene.isPending}
          dirty={store.dirty}
          onAddToCart={handleAddToCart}
          addingToCart={addSceneToCart.isPending}
          onOrder={handleOrder}
          ordering={addSceneToCart.isPending || createScene.isPending || updateScene.isPending}
          onShare={handleShare}
          sharing={shareScene.isPending || createScene.isPending || updateScene.isPending}
          onUndo={store.undo}
          onRedo={store.redo}
          canUndo={store.past.length > 0}
          canRedo={store.future.length > 0}
          snap={store.snap}
          onToggleSnap={store.toggleSnap}
          itemCount={store.items.length}
          onExit={handleExit}
        />
        <div className="flex min-h-0 flex-1">
          <aside className="flex w-80 shrink-0 flex-col gap-3 overflow-hidden border-r border-border bg-surface-alt/40 p-4">
            <CatalogTray onAdd={store.addVariant} />
            <SelectedItemPanel item={selectedItem} onDelete={store.deleteSelected} onResetTransform={store.resetSelectedTransform} onDuplicate={store.duplicateSelected} />
            <RoomSummary items={store.items} />
          </aside>
          <main className="relative min-w-0 flex-1 bg-surface">
            {store.status === 'ready' && <RoomCanvas />}
          </main>
        </div>
      </div>

      <RoomSetupDialog
        open={setupOpen}
        onOpenChange={handleSetupOpenChange}
        initialRoom={DEFAULT_ROOM}
        onSubmit={handleCreateRoom}
      />

      <ShareSceneDialog
        open={shareToken !== null}
        onOpenChange={(open) => { if (!open) setShareToken(null) }}
        token={shareToken}
      />
    </div>
  )
}
