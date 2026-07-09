import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { PlannerPreview } from './PlannerPreview'

afterEach(cleanup)

const product = { name: 'Ghế sofa da' }

// Echoes the current location so a deep-link navigation is observable.
function LocationProbe() {
  const loc = useLocation()
  return <div data-testid="loc">{loc.pathname + loc.search}</div>
}

function renderPreview(props) {
  return render(
    <MemoryRouter initialEntries={['/p/ghe-sofa-da']}>
      <PlannerPreview {...props} />
      <LocationProbe />
    </MemoryRouter>,
  )
}

describe('PlannerPreview', () => {
  it('renders the product imagery inside the room vignette when open', () => {
    renderPreview({ open: true, onOpenChange: () => {}, product, image: 'https://example.com/sofa.jpg' })

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Xem trong không gian')).toBeInTheDocument()
    const img = screen.getByAltText('Ghế sofa da')
    expect(img).toHaveAttribute('src', 'https://example.com/sofa.jpg')
  })

  it('shows a graceful placeholder when there is no image to composite', () => {
    renderPreview({ open: true, onOpenChange: () => {}, product, image: null })

    expect(screen.queryByAltText('Ghế sofa da')).not.toBeInTheDocument()
    expect(screen.getByText(/Chưa có hình ảnh để dựng phối cảnh/)).toBeInTheDocument()
  })

  it('Continue deep-links to the planner with the selected variant preloaded', () => {
    renderPreview({
      open: true,
      onOpenChange: () => {},
      product,
      image: 'https://example.com/sofa.jpg',
      slug: 'ghe-sofa-da',
      variantId: 1,
    })

    const cont = screen.getByRole('button', { name: /Tiếp tục trong Room Planner/ })
    expect(cont).toBeEnabled()
    fireEvent.click(cont)

    expect(screen.getByTestId('loc')).toHaveTextContent('/room-planner?product=ghe-sofa-da&variant=1')
  })

  it('Continue uses the LATEST variantId prop, not a mount-time snapshot', () => {
    // Simulates the user changing the selected variant while the modal is open:
    // the parent re-renders PlannerPreview with a new variantId prop.
    const { rerender } = render(
      <MemoryRouter initialEntries={['/p/ghe-sofa-da']}>
        <PlannerPreview open onOpenChange={() => {}} product={product} image="x.jpg" slug="ghe-sofa-da" variantId={1} />
        <LocationProbe />
      </MemoryRouter>,
    )
    rerender(
      <MemoryRouter initialEntries={['/p/ghe-sofa-da']}>
        <PlannerPreview open onOpenChange={() => {}} product={product} image="x.jpg" slug="ghe-sofa-da" variantId={2} />
        <LocationProbe />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: /Tiếp tục trong Room Planner/ }))
    expect(screen.getByTestId('loc')).toHaveTextContent('/room-planner?product=ghe-sofa-da&variant=2')
  })

  it('Continue is disabled with a hint (and inert) when no variant is selected', () => {
    renderPreview({
      open: true,
      onOpenChange: () => {},
      product,
      image: 'https://example.com/sofa.jpg',
      slug: 'ghe-sofa-da',
      variantId: undefined,
    })

    const cont = screen.getByRole('button', { name: /Tiếp tục trong Room Planner/ })
    expect(cont).toBeDisabled()
    expect(cont).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByText(/Vui lòng chọn phiên bản để tiếp tục/)).toBeInTheDocument()

    // Clicking the disabled Continue must not navigate.
    fireEvent.click(cont)
    expect(screen.getByTestId('loc')).toHaveTextContent('/p/ghe-sofa-da')
  })

  it('shows the honest variant disclaimer only when showVariantNote is set', () => {
    const { rerender } = renderPreview({
      open: true,
      onOpenChange: () => {},
      product,
      image: 'x.jpg',
      showVariantNote: false,
    })
    expect(screen.queryByText(/có thể khác với màu\/chất liệu/i)).not.toBeInTheDocument()

    rerender(
      <MemoryRouter initialEntries={['/p/ghe-sofa-da']}>
        <PlannerPreview open onOpenChange={() => {}} product={product} image="x.jpg" showVariantNote />
      </MemoryRouter>,
    )
    expect(screen.getByText(/có thể khác với màu\/chất liệu/i)).toBeInTheDocument()
  })

  it('renders nothing when closed', () => {
    renderPreview({ open: false, onOpenChange: () => {}, product, image: null })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
