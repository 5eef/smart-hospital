import { render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { ErrorBoundary } from './ErrorBoundary'

function Broken() {
  throw new Error('sensitive internal detail')
}

it('shows a safe fallback without exposing exception details', () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  render(<ErrorBoundary><Broken /></ErrorBoundary>)
  expect(screen.getByText('Une erreur est survenue')).toBeInTheDocument()
  expect(screen.queryByText('sensitive internal detail')).not.toBeInTheDocument()
})
