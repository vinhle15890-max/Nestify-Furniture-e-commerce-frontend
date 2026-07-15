import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { DiagnosticRouteErrorBoundary } from './DiagnosticRouteErrorBoundary'

function Crash({ fail }) {
  if (fail) throw new Error('failed at https://models.example.test/private.glb?token=secret')
  return <p>stable</p>
}

it('shows a compact scrubbed error, logs component context, and retries', () => {
  const log = vi.spyOn(console, 'error').mockImplementation(() => {})
  const { rerender } = render(<DiagnosticRouteErrorBoundary><Crash fail /></DiagnosticRouteErrorBoundary>)
  expect(screen.getByRole('alert')).toHaveTextContent('failed at [URL_REDACTED]')
  expect(screen.queryByText(/secret/)).not.toBeInTheDocument()
  expect(log).toHaveBeenCalledWith('R2 diagnostic route crashed', expect.objectContaining({
    message: 'failed at [URL_REDACTED]',
    componentStack: expect.stringContaining('Crash'),
  }))

  rerender(<DiagnosticRouteErrorBoundary><Crash fail={false} /></DiagnosticRouteErrorBoundary>)
  fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
  expect(screen.getByText('stable')).toBeInTheDocument()
})
