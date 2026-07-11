import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { RoomPlannerPage } from './RoomPlannerPage'
import * as roomPlannerApi from '../../features/roomPlanner/api'
import * as catalogApi from '../../features/catalog/api'
import { useEditorStore } from '../../features/roomPlanner/editorStore'
import { ApiError } from '../../lib/errors'

// The 3D canvas can't run in jsdom — replace it with a marker.
vi.mock('./scene/RoomCanvas', () => ({ RoomCanvas: () => <div data-testid="room-canvas" /> }))
vi.mock('../../features/roomPlanner/api')
vi.mock('../../features/catalog/api')

function installMatchMedia(initialMatches) {
  const listeners = new Set()
  const mediaQuery = {
    matches: initialMatches,
    media: '(min-width: 64rem)',
    addEventListener: vi.fn((type, listener) => {
      if (type === 'change') listeners.add(listener)
    }),
    removeEventListener: vi.fn((type, listener) => {
      if (type === 'change') listeners.delete(listener)
    }),
    emit(matches) {
      this.matches = matches
      listeners.forEach((listener) => listener({ matches, media: this.media }))
    },
  }

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn(() => mediaQuery),
  })

  return mediaQuery
}

function renderPage(path = '/room-planner') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/room-planner" element={<RoomPlannerPage />} />
          <Route path="/room-planner/:id" element={<RoomPlannerPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

// Echoes the current URL so redirects and param-clearing are observable.
function LocationProbe() {
  const loc = useLocation()
  return <div data-testid="loc">{loc.pathname + loc.search}</div>
}

// Deep-link variant of renderPage: adds product-page / home landing routes so
// the fail-branch redirects are observable, plus a location probe.
function renderDeepLink(path) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/room-planner" element={<RoomPlannerPage />} />
          <Route path="/room-planner/:id" element={<RoomPlannerPage />} />
          <Route path="/p/:slug" element={<div data-testid="product-page">product</div>} />
          <Route path="/" element={<div data-testid="home">home</div>} />
        </Routes>
        <LocationProbe />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const PRODUCT = { data: { slug: 'ghe-sofa', name: 'Ghế sofa', variants: [{ id: 11, name: 'Đỏ' }] } }

describe('RoomPlannerPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    installMatchMedia(true)
    useEditorStore.getState().reset()
    catalogApi.getProducts.mockResolvedValue({
      data: [{ id: 1, name: 'Sofa', thumbnail: null, variants: [{ id: 11, sku: 'A', name: 'Đỏ', model_3d_url: 'a.glb', price: 100 }] }],
      meta: { pagination: { has_more: false, next_cursor: null } },
    })
  })

  it('shows the setup dialog for a new room, then the canvas', async () => {
    renderPage('/room-planner')
    await userEvent.click(await screen.findByRole('button', { name: /tạo phòng/i }))
    expect(await screen.findByTestId('room-canvas')).toBeInTheDocument()
  })

  it('adds a tray item then saves via create and shows the saved state', async () => {
    roomPlannerApi.createScene.mockResolvedValue({ data: { id: 55, name: 'Phòng của tôi' } })
    renderPage('/room-planner')
    await userEvent.click(await screen.findByRole('button', { name: /tạo phòng/i }))
    await userEvent.click(await screen.findByRole('button', { name: /Sofa.*Đỏ/s }))
    await userEvent.click(screen.getByRole('button', { name: /lưu/i }))
    await waitFor(() => expect(roomPlannerApi.createScene).toHaveBeenCalled())
    const payload = roomPlannerApi.createScene.mock.calls[0][0]
    expect(payload.items).toHaveLength(1)
    expect(payload.items[0].variant_id).toBe(11)
  })

  it('saves the room then adds the whole scene to cart and navigates to /cart', async () => {
    roomPlannerApi.createScene.mockResolvedValue({ data: { id: 55, name: 'Phòng của tôi' } })
    roomPlannerApi.addSceneToCart.mockResolvedValue({ data: { id: 1, items: [] }, meta: { skipped: [] } })

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/room-planner']}>
          <Routes>
            <Route path="/room-planner" element={<RoomPlannerPage />} />
            <Route path="/room-planner/:id" element={<RoomPlannerPage />} />
            <Route path="/cart" element={<div data-testid="cart-page">cart</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    await userEvent.click(await screen.findByRole('button', { name: /tạo phòng/i }))
    await userEvent.click(await screen.findByRole('button', { name: /Sofa.*Đỏ/s }))
    await userEvent.click(screen.getByRole('button', { name: /thêm vào giỏ/i }))

    // Unsaved room is persisted first, then its saved id drives the cart handoff.
    await waitFor(() => expect(roomPlannerApi.createScene).toHaveBeenCalled())
    await waitFor(() => expect(roomPlannerApi.addSceneToCart).toHaveBeenCalledWith(55))
    expect(await screen.findByTestId('cart-page')).toBeInTheDocument()
  })

  it('orders the whole room: saves, adds the scene to cart, and navigates to /checkout', async () => {
    roomPlannerApi.createScene.mockResolvedValue({ data: { id: 55, name: 'Phòng của tôi' } })
    roomPlannerApi.addSceneToCart.mockResolvedValue({ data: { id: 1, items: [] }, meta: { skipped: [] } })

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/room-planner']}>
          <Routes>
            <Route path="/room-planner" element={<RoomPlannerPage />} />
            <Route path="/room-planner/:id" element={<RoomPlannerPage />} />
            <Route path="/checkout" element={<div data-testid="checkout-page">checkout</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    await userEvent.click(await screen.findByRole('button', { name: /tạo phòng/i }))
    await userEvent.click(await screen.findByRole('button', { name: /Sofa.*Đỏ/s }))
    await userEvent.click(screen.getByRole('button', { name: /đặt cả phòng/i }))

    // Unsaved room is persisted first, then its saved id drives the cart handoff, then checkout.
    await waitFor(() => expect(roomPlannerApi.createScene).toHaveBeenCalled())
    await waitFor(() => expect(roomPlannerApi.addSceneToCart).toHaveBeenCalledWith(55))
    expect(await screen.findByTestId('checkout-page')).toBeInTheDocument()
  })

  it('loads an existing scene by id without the setup dialog', async () => {
    roomPlannerApi.getScene.mockResolvedValue({
      data: { id: 9, name: 'Phòng cũ', width: '4', depth: '5', height: '2.8', items: [] },
    })
    renderPage('/room-planner/9')
    expect(await screen.findByTestId('room-canvas')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /tạo phòng/i })).not.toBeInTheDocument()
  })

  describe('small-screen capability boundary', () => {
    it('shows only the continuation notice for a new room', async () => {
      installMatchMedia(false)
      renderPage('/room-planner')

      expect(await screen.findByRole('heading', { name: 'Tiếp tục thiết kế trên máy tính' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /tạo phòng/i })).not.toBeInTheDocument()
      expect(screen.queryByTestId('room-canvas')).not.toBeInTheDocument()
      expect(roomPlannerApi.createScene).not.toHaveBeenCalled()
    })

    it('does not fetch or mount an existing scene below the breakpoint', async () => {
      installMatchMedia(false)
      const writeText = vi.fn().mockResolvedValue(undefined)
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText },
      })
      renderPage('/room-planner/9')

      expect(await screen.findByRole('heading', { name: 'Tiếp tục thiết kế trên máy tính' })).toBeInTheDocument()
      expect(roomPlannerApi.getScene).not.toHaveBeenCalled()
      expect(screen.queryByTestId('room-canvas')).not.toBeInTheDocument()
      await userEvent.click(screen.getByRole('button', { name: 'Sao chép liên kết' }))
      expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/room-planner/9`)
    })

    it('preserves the exact product deep-link in the copied desktop URL', async () => {
      installMatchMedia(false)
      const writeText = vi.fn().mockResolvedValue(undefined)
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText },
      })
      renderDeepLink('/room-planner?product=ghe-sofa&variant=11&utm=spring#continue')

      await userEvent.click(await screen.findByRole('button', { name: 'Sao chép liên kết' }))

      expect(catalogApi.getProduct).not.toHaveBeenCalled()
      expect(writeText).toHaveBeenCalledWith(
        `${window.location.origin}/room-planner?product=ghe-sofa&variant=11&utm=spring#continue`,
      )
      expect(screen.getByTestId('loc')).toHaveTextContent(
        '/room-planner?product=ghe-sofa&variant=11&utm=spring',
      )
    })

    it('keeps in-memory work when resizing across the boundary', async () => {
      const mediaQuery = installMatchMedia(true)
      renderPage('/room-planner')
      await userEvent.click(await screen.findByRole('button', { name: /tạo phòng/i }))

      act(() => {
        useEditorStore.getState().addVariant({ id: 77, name: 'Ghế đang thử' })
        mediaQuery.emit(false)
      })

      expect(await screen.findByRole('heading', { name: 'Tiếp tục thiết kế trên máy tính' })).toBeInTheDocument()
      expect(useEditorStore.getState().items).toHaveLength(1)

      act(() => mediaQuery.emit(true))

      expect(await screen.findByTestId('room-canvas')).toBeInTheDocument()
      expect(useEditorStore.getState().items).toHaveLength(1)
      expect(useEditorStore.getState().items[0].variant.id).toBe(77)
    })

    it('reuses dirty-exit protection from the mobile notice', async () => {
      const mediaQuery = installMatchMedia(true)
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
      renderPage('/room-planner')
      await userEvent.click(await screen.findByRole('button', { name: /tạo phòng/i }))
      act(() => {
        useEditorStore.getState().addVariant({ id: 77, name: 'Ghế đang thử' })
        mediaQuery.emit(false)
      })

      await userEvent.click(await screen.findByRole('button', { name: 'Về cửa hàng' }))

      expect(confirmSpy).toHaveBeenCalledOnce()
      expect(useEditorStore.getState().items).toHaveLength(1)
      confirmSpy.mockRestore()
    })

    it('fails closed when matchMedia is unavailable', async () => {
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        writable: true,
        value: undefined,
      })
      renderPage('/room-planner')

      expect(await screen.findByRole('heading', { name: 'Tiếp tục thiết kế trên máy tính' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /tạo phòng/i })).not.toBeInTheDocument()
      expect(screen.queryByTestId('room-canvas')).not.toBeInTheDocument()
    })
  })

  // ── Deep-link preload ──────────────────────────────────────────────────
  describe('deep-link preload (?product&variant)', () => {
    it('merges the variant when room-setup completes AFTER the fetch resolves', async () => {
      // fetch-before-submit ordering.
      catalogApi.getProduct.mockResolvedValue(PRODUCT)
      renderDeepLink('/room-planner?product=ghe-sofa&variant=11')

      await screen.findByRole('button', { name: /tạo phòng/i })
      await waitFor(() => expect(catalogApi.getProduct).toHaveBeenCalled())
      // Variant fetched but room not ready yet → NOT applied.
      expect(useEditorStore.getState().items).toHaveLength(0)

      await userEvent.click(screen.getByRole('button', { name: /tạo phòng/i }))
      await waitFor(() => expect(useEditorStore.getState().items).toHaveLength(1))
      expect(useEditorStore.getState().items[0].variant.id).toBe(11)
    })

    it('merges the variant when the fetch resolves AFTER room-setup completes', async () => {
      // submit-before-fetch ordering (deferred fetch).
      let resolveProduct
      catalogApi.getProduct.mockImplementation(() => new Promise((res) => { resolveProduct = res }))
      renderDeepLink('/room-planner?product=ghe-sofa&variant=11')

      await userEvent.click(await screen.findByRole('button', { name: /tạo phòng/i }))
      // Room ready but fetch still pending → NOT applied.
      expect(useEditorStore.getState().items).toHaveLength(0)

      await act(async () => { resolveProduct(PRODUCT) })
      await waitFor(() => expect(useEditorStore.getState().items).toHaveLength(1))
      expect(useEditorStore.getState().items[0].variant.id).toBe(11)
    })

    it('treats a malformed (non-numeric) variant id as variant-absent — no crash, redirects to /p/{slug}', async () => {
      catalogApi.getProduct.mockResolvedValue(PRODUCT) // Number('abc') === NaN, matches nothing
      renderDeepLink('/room-planner?product=ghe-sofa&variant=abc')

      expect(await screen.findByTestId('product-page')).toBeInTheDocument()
      expect(useEditorStore.getState().items).toHaveLength(0)
    })

    it('clears only product/variant on apply, preserving unrelated params (utm)', async () => {
      catalogApi.getProduct.mockResolvedValue(PRODUCT)
      renderDeepLink('/room-planner?product=ghe-sofa&variant=11&utm=spring')

      await userEvent.click(await screen.findByRole('button', { name: /tạo phòng/i }))
      await waitFor(() => expect(useEditorStore.getState().items).toHaveLength(1))

      const loc = screen.getByTestId('loc').textContent
      expect(loc).toContain('utm=spring')
      expect(loc).not.toContain('product=')
      expect(loc).not.toContain('variant=')
    })

    it('404 fetch → redirects home', async () => {
      catalogApi.getProduct.mockRejectedValue(new ApiError('NOT_FOUND', 'Sản phẩm không tồn tại.', null, 404))
      renderDeepLink('/room-planner?product=missing&variant=11')

      expect(await screen.findByTestId('home')).toBeInTheDocument()
    })

    it('network-fail on a DIRTY scene does not navigate away and leaves items untouched', async () => {
      let rejectProduct
      catalogApi.getProduct.mockImplementation(() => new Promise((_, rej) => { rejectProduct = rej }))
      renderDeepLink('/room-planner?product=ghe-sofa&variant=11')

      // Simulate a pre-existing, user-built dirty scene (mount reset already ran).
      act(() => {
        const s = useEditorStore.getState()
        s.initNew({ width: 4, depth: 5, height: 2.8 })
        s.addVariant({ id: 99, name: 'Ghế khác' })
      })
      expect(useEditorStore.getState().dirty).toBe(true)

      await act(async () => { rejectProduct(new ApiError('NETWORK_ERROR', 'net', null, undefined)) })

      // No redirect; the real scene is untouched; the failed intent is cleared.
      await waitFor(() => expect(screen.getByTestId('loc').textContent).not.toContain('product='))
      expect(screen.queryByTestId('product-page')).not.toBeInTheDocument()
      expect(screen.queryByTestId('home')).not.toBeInTheDocument()
      expect(useEditorStore.getState().items).toHaveLength(1)
      expect(useEditorStore.getState().items[0].variant.id).toBe(99)
    })

    it('network-fail on a fresh (non-dirty) visit redirects to /p/{slug}', async () => {
      let rejectProduct
      catalogApi.getProduct.mockImplementation(() => new Promise((_, rej) => { rejectProduct = rej }))
      renderDeepLink('/room-planner?product=ghe-sofa&variant=11')

      await screen.findByRole('button', { name: /tạo phòng/i }) // fresh, not dirty
      await act(async () => { rejectProduct(new ApiError('NETWORK_ERROR', 'net', null, undefined)) })

      expect(await screen.findByTestId('product-page')).toBeInTheDocument()
    })
  })
})
