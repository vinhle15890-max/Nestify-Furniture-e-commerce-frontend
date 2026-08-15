import { useEffect, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { RoomCanvas } from './scene/RoomCanvas'
import { RoomEditPanel } from './RoomEditPanel'
import { RoomSetupDialog } from './RoomSetupDialog'
import { CatalogTray } from './CatalogTray'
import { PlannerToolbar } from './PlannerToolbar'
import { PlannerCompletionArea, PlannerContextControls, PlannerViewMenu } from './PlannerWorkspaceControls'
import { ShareSceneDialog } from './ShareSceneDialog'
import { GuestDraftLinkDialog } from './GuestDraftLinkDialog'
import { ObjectInspector } from './ObjectInspector'
import { RoomSummary } from './RoomSummary'
import { ReviewRoomDialog } from './ReviewRoomDialog'
import { OverlapNotice } from './OverlapNotice'
import { ScaleLegend } from './ScaleLegend'
import { useEditorShortcuts } from './useEditorShortcuts'
import { SmallScreenNotice } from './SmallScreenNotice'
import { PlannerGeometryPlaceholder } from '../../components/LoadingStates'
import { PlannerCanvasErrorBoundary } from './PlannerCanvasErrorBoundary'
import { ConfirmActionDialog } from '../../components/ConfirmActionDialog'
import { useEditorStore } from '../../features/roomPlanner/editorStore'
import { useScene, useSceneReview, useCreateScene, useUpdateScene, useAddSceneToCart, useShareScene, useUploadScenePreview, useRoomDraft, useSaveRoomDraft, useClaimRoomDraft } from '../../features/roomPlanner/hooks'
import { capturePlannerPreview } from '../../features/roomPlanner/canvasCapture'
import { useProductPreload } from '../../features/catalog/hooks'
import { editorStateToPayload } from '../../features/roomPlanner/mappers'
import { useToastStore } from '../../store/toastStore'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { useAuthStore } from '../../store/authStore'
import { buildRoomDraftResumeUrl, clearLocalRoomDraft, clearRoomDraftToken, editorStateToDraftSnapshot, readLocalRoomDraft, readSessionRoomDraftToken, rememberRoomDraftToken, roomDraftTokenFromHash, writeLocalRoomDraft } from '../../features/roomPlanner/guestDraft'

const DEFAULT_ROOM = {
  name: 'Phòng mới',
  width: 4,
  depth: 5,
  height: 2.8,
}
const PLANNER_DESKTOP_QUERY = '(min-width: 64rem)'

export function RoomPlannerPage() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const addToast = useToastStore((state) => state.addToast)
  const isDesktop = useMediaQuery(PLANNER_DESKTOP_QUERY)
  const token = useAuthStore((state) => state.token)
  const [draftToken, setDraftToken] = useState(readSessionRoomDraftToken)
  const continueUrl = draftToken
    ? buildRoomDraftResumeUrl(draftToken)
    : `${window.location.origin}${location.pathname}${location.search}${location.hash}`

  const sceneQuery = useScene(isDesktop ? id : null)
  const createScene = useCreateScene()
  const updateScene = useUpdateScene()
  const addSceneToCart = useAddSceneToCart()
  const shareScene = useShareScene()
  const uploadPreview = useUploadScenePreview()
  const saveDraft = useSaveRoomDraft()
  const claimDraft = useClaimRoomDraft()

  const store = useEditorStore()
  const [setupOpen, setSetupOpen] = useState(false)
  const [shareToken, setShareToken] = useState(null)
  const [guestDraftUrl, setGuestDraftUrl] = useState(null)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [reviewSceneId, setReviewSceneId] = useState(null)
  const [removingPlacementId, setRemovingPlacementId] = useState(null)
  const [reviewRemoveError, setReviewRemoveError] = useState(null)
  const sceneReview = useSceneReview(reviewSceneId, reviewOpen)

  // Keyboard editing (delete / undo / redo / duplicate / gizmo modes / deselect).
  useEditorShortcuts(isDesktop)

  // ── Deep-link preload: /room-planner?product=<slug>&variant=<id> ──────────
  // URL query params are the SINGLE source of truth for the pending preload —
  // never stashed in the (module-singleton) store or a module var, which would
  // outlive the page and bleed into a later param-less visit.
  const [searchParams, setSearchParams] = useSearchParams()
  const draftQuery = useRoomDraft(!token && !id ? draftToken : null)
  const claimStarted = useRef(false)
  const previewSlug = searchParams.get('product')
  const variantId = searchParams.get('variant')
  const hasDeepLink = Boolean(previewSlug && variantId)
  const wantsNewRoom = searchParams.get('new') === '1'
  const opensRoomHub = useRef(Boolean(
    token && !id && !wantsNewRoom && !hasDeepLink && !draftToken && !roomDraftTokenFromHash(location.hash),
  ))
  const numericVariantId = Number(variantId) // STEP 3 coercion (variant.id is a JSON number)
  const applied = useRef(false)
  // Request-scoped 10s timeout; disabled unless a full deep-link is present.
  const productQuery = useProductPreload(hasDeepLink && isDesktop ? previewSlug : null)

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
    setSetupOpen(false)
    return () => store.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    const incomingToken = roomDraftTokenFromHash(location.hash)
    if (!incomingToken) return
    rememberRoomDraftToken(incomingToken)
    setDraftToken(incomingToken)
    // Strip the bearer secret before this page can initiate any navigation or outbound request.
    navigate(`${location.pathname}${location.search}`, { replace: true })
  }, [location.hash, location.pathname, location.search, navigate])

  // A same-device snapshot makes refresh recovery immediate; a server draft
  // token remains the source that can continue on another device.
  useEffect(() => {
    if (id || draftToken || token || store.status !== 'idle') return
    const localDraft = readLocalRoomDraft()
    if (localDraft) {
      store.loadScene(localDraft)
      setSetupOpen(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, draftToken, token, store.status])

  useEffect(() => {
    if (!draftQuery.data?.data || token || id) return
    store.loadScene(draftQuery.data.data)
    setSetupOpen(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftQuery.data, token, id])

  useEffect(() => {
    if (!token || !draftToken || id || claimStarted.current) return
    claimStarted.current = true
    claimDraft.mutate(draftToken, {
      onSuccess: (response) => {
        clearLocalRoomDraft()
        clearRoomDraftToken()
        setDraftToken(null)
        navigate(`/room-planner/${response.data.id}`, { replace: true })
        addToast({ title: 'Phòng đã được lưu vào tài khoản.', variant: 'success' })
      },
      onError: (error) => {
        claimStarted.current = false
        addToast({ title: 'Chưa thể nối phòng với tài khoản.', description: error?.message, variant: 'error' })
      },
    })
  }, [token, draftToken, id, claimDraft, navigate, addToast])

  useEffect(() => {
    if (token || id || store.status !== 'ready' || !store.dirty) return undefined
    const timer = window.setTimeout(() => writeLocalRoomDraft(editorStateToDraftSnapshot(useEditorStore.getState())), 250)
    return () => window.clearTimeout(timer)
  }, [token, id, store.status, store.dirty, store.name, store.description, store.room, store.items])

  // Capability changes only swap the shell. They must never reset in-memory
  // work: a user who narrows then widens the same tab resumes where they left.
  useEffect(() => {
    if (!isDesktop) {
      setSetupOpen(false)
      setShareToken(null)
      return
    }
    if (!id && store.status === 'idle') setSetupOpen(true)
  }, [id, isDesktop, store.status])

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

  const handleCreateRoom = ({ name, ...room }) => {
    store.initNew(room, { name })
    setSetupOpen(false)
  }

  // Persist the scene if there are unsaved changes, returning the scene id.
  // Shared by Save and Add-to-cart — the cart handoff needs a saved scene id to
  // tag items with (the whole point of the imagined callback in the Cart).
  const ensureSaved = async () => {
    const current = useEditorStore.getState()
    if (current.id && !current.dirty) return current.id
    const payload = editorStateToPayload(current)
    if (current.id) {
      const response = await updateScene.mutateAsync({ id: current.id, payload })
      current.markSaved(current.id, response.data.items)
      return current.id
    }
    const response = await createScene.mutateAsync(payload)
    current.markSaved(response.data.id, response.data.items)
    navigate(`/room-planner/${response.data.id}`, { replace: true })
    return response.data.id
  }

  const persistGuestDraft = async () => {
    const payload = editorStateToPayload(store)
    const response = await saveDraft.mutateAsync({ token: draftToken, payload })
    writeLocalRoomDraft(editorStateToDraftSnapshot(useEditorStore.getState()))
    const nextToken = draftToken ?? response.data.token
    rememberRoomDraftToken(nextToken)
    setDraftToken(nextToken)
    return nextToken
  }

  const requireOwnedScene = async () => {
    if (token) return ensureSaved()
    await persistGuestDraft()
    navigate('/login', {
      state: { from: { pathname: '/room-planner' } },
    })
    return null
  }

  const handleSave = async () => {
    // Chụp ảnh TRƯỚC khi lưu: ensureSaved có thể navigate(replace) khi tạo mới →
    // đổi :id → effect [id] gọi store.reset() → status 'idle' → RoomCanvas unmount
    // → canvas bị huỷ đăng ký. Chụp trước đảm bảo canvas còn sống (fix audit R1).
    let previewFile = null
    try {
      previewFile = await capturePlannerPreview()
    } catch { previewFile = null }
    try {
      if (!token) {
        const nextToken = await persistGuestDraft()
        setGuestDraftUrl(buildRoomDraftResumeUrl(nextToken))
        addToast({ title: 'Đã giữ phòng trong 30 ngày.', description: 'Đăng nhập để lưu phòng vào tài khoản.', variant: 'success' })
        return
      }
      const sceneId = await ensureSaved()
      addToast({ title: 'Đã lưu phòng.', variant: 'success' })
      // Best-effort: ảnh phòng cho card "Phòng của tôi". Lỗi không đụng tới Save.
      if (previewFile) uploadPreview.mutate({ id: sceneId, file: previewFile })
    } catch (error) {
      addToast({ title: 'Lưu phòng thất bại.', description: error?.message, variant: 'error' })
    }
  }

  const handleAddToCart = async () => {
    try {
      const sceneId = await requireOwnedScene()
      if (!sceneId) return
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
      setReviewOpen(false)
      navigate('/cart')
    } catch (error) {
      addToast({ title: 'Thêm vào giỏ thất bại.', description: error?.message, variant: 'error' })
    }
  }

  // Share needs a saved scene (the public link resolves a persisted scene id),
  // so persist first, then make it public and surface the copy dialog. `share`
  // is idempotent server-side, so re-sharing returns the same token.
  const handleShare = async () => {
    try {
      const sceneId = await requireOwnedScene()
      if (!sceneId) return
      const response = await shareScene.mutateAsync(sceneId)
      setShareToken(response.data.share_token)
    } catch (error) {
      addToast({ title: 'Tạo link chia sẻ thất bại.', description: error?.message, variant: 'error' })
    }
  }

  const handleOpenReview = async () => {
    try {
      const sceneId = await requireOwnedScene()
      if (!sceneId) return
      setReviewSceneId(sceneId)
      setReviewOpen(true)
    } catch (error) {
      addToast({ title: 'Chưa thể xem lại phòng.', description: error?.message, variant: 'error' })
    }
  }

  const handleRemoveReviewPlacement = async (placementId) => {
    const current = useEditorStore.getState()
    const item = current.items.find((candidate) => candidate.placementId === placementId)
    if (!item) {
      setReviewRemoveError('Không tìm thấy món này trong phòng. Hãy đóng và mở lại phần xem phòng.')
      return
    }

    setReviewRemoveError(null)
    setRemovingPlacementId(placementId)
    current.removeItem(item.localId)
    try {
      await ensureSaved()
      await sceneReview.refetch()
    } catch (error) {
      setReviewRemoveError(error?.message ?? 'Chưa thể lưu thay đổi. Thay đổi vẫn còn trong phòng này; hãy thử lưu lại.')
    } finally {
      setRemovingPlacementId(null)
    }
  }

  const [exitOpen, setExitOpen] = useState(false)
  const handleExit = () => store.dirty ? setExitOpen(true) : navigate('/')

  const selectedItem = store.items.find((item) => item.localId === store.selectedId) ?? null

  // The generic planner entry is the room hub for signed-in customers. Creating
  // a room is an explicit intent; product hand-offs and guest drafts still open
  // the editor directly.
  if (opensRoomHub.current) {
    return <Navigate to="/account/rooms" replace />
  }

  if (!isDesktop) {
    return (
      <>
        <SmallScreenNotice
          continueUrl={continueUrl}
          hasUnsavedChanges={store.dirty}
          onExit={handleExit}
          room={store.status === 'ready' ? store.room : null}
          items={store.items}
        />
        <ConfirmActionDialog
          open={exitOpen}
          onOpenChange={setExitOpen}
          title="Rời phòng khi chưa lưu?"
          description={store.name}
          consequence="Các thay đổi trong phòng này kể từ lần lưu gần nhất sẽ mất. Bạn có thể quay lại để lưu trước khi rời đi."
          confirmLabel="Rời đi và bỏ thay đổi"
          onConfirm={() => navigate('/')}
          destructive
        />
      </>
    )
  }

  if (id && sceneQuery.isLoading) {
    return <PlannerGeometryPlaceholder />
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
      <div className="flex h-dvh flex-col">
        <PlannerToolbar
          name={store.name}
          onNameChange={store.setName}
          onSave={handleSave}
          saving={createScene.isPending || updateScene.isPending || saveDraft.isPending || claimDraft.isPending}
          dirty={store.dirty}
          onUndo={store.undo}
          onRedo={store.redo}
          canUndo={store.past.length > 0}
          canRedo={store.future.length > 0}
          onExit={handleExit}
        />
        <div className="flex min-h-0 flex-1">
          <aside aria-label="Thư viện nội thất" className="flex w-72 shrink-0 flex-col overflow-hidden border-r border-border bg-surface-alt/40 p-4 xl:w-80">
            <CatalogTray onAdd={store.addVariant} />
          </aside>
          <main className="relative min-w-0 flex-1 bg-surface">
            {store.editMode === 'furnish' && (
              <PlannerViewMenu
                viewMode={store.viewMode}
                onViewModeChange={store.setViewMode}
                showScaleRef={store.showScaleRef}
                onToggleScaleRef={store.toggleScaleRef}
                onEnterRoomEdit={() => store.setEditMode('room')}
              />
            )}
            {selectedItem && store.editMode === 'furnish' && <PlannerContextControls gizmoMode={store.gizmoMode} onGizmoModeChange={store.setGizmoMode} />}
            <PlannerCanvasErrorBoundary sceneKey={id ?? 'new'} onLeaveRoomEdit={() => store.setEditMode('furnish')}>
              {store.status === 'ready' && <RoomCanvas />}
              {store.status === 'ready' && store.editMode === 'room' && <RoomEditPanel />}
              {store.status === 'ready' && store.editMode === 'furnish' && <ScaleLegend room={store.room} />}
            </PlannerCanvasErrorBoundary>
          </main>
          <aside aria-label="Thông tin phòng" className="flex w-72 shrink-0 flex-col border-l border-border bg-surface">
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
              <ObjectInspector item={selectedItem} room={store.room} onTransform={store.updateTransform} onDelete={store.deleteSelected} onResetTransform={store.resetSelectedTransform} onDuplicate={store.duplicateSelected} />
              <OverlapNotice items={store.items} />
              <RoomSummary items={store.items} />
            </div>
            <PlannerCompletionArea onShare={handleShare} sharing={shareScene.isPending || createScene.isPending || updateScene.isPending} onReview={handleOpenReview} reviewing={addSceneToCart.isPending || createScene.isPending || updateScene.isPending} saving={createScene.isPending || updateScene.isPending} itemCount={store.items.length} />
          </aside>
        </div>
      </div>

      <RoomSetupDialog
        open={setupOpen}
        required={store.status === 'idle'}
        onOpenChange={setSetupOpen}
        initialRoom={DEFAULT_ROOM}
        onSubmit={handleCreateRoom}
      />

      <ShareSceneDialog
        open={shareToken !== null}
        onOpenChange={(open) => { if (!open) setShareToken(null) }}
        token={shareToken}
      />
      <GuestDraftLinkDialog
        open={guestDraftUrl !== null}
        onOpenChange={(open) => { if (!open) setGuestDraftUrl(null) }}
        url={guestDraftUrl}
      />
      <ReviewRoomDialog
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        items={store.items}
        onContinue={handleAddToCart}
        pending={addSceneToCart.isPending || createScene.isPending || updateScene.isPending}
        review={sceneReview.data?.data}
        loading={sceneReview.isLoading}
        error={sceneReview.isError}
        onRemove={handleRemoveReviewPlacement}
        removingPlacementId={removingPlacementId}
        removeError={reviewRemoveError}
      />
      <ConfirmActionDialog
        open={exitOpen}
        onOpenChange={setExitOpen}
        title="Rời phòng khi chưa lưu?"
        description={store.name}
        consequence="Các thay đổi trong phòng này kể từ lần lưu gần nhất sẽ mất. Bạn có thể quay lại để lưu trước khi rời đi."
        confirmLabel="Rời đi và bỏ thay đổi"
        onConfirm={() => navigate('/')}
        destructive
      />
    </div>
  )
}
