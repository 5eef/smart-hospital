import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StatusBadge } from './StatusBadge'

describe('StatusBadge', () => {
  it('translates known statuses and preserves unknown ones', () => {
    const { rerender } = render(<StatusBadge status="confirmed" />)
    expect(screen.getByText('Confirmé')).toBeInTheDocument()

    rerender(<StatusBadge status="custom-status" />)
    expect(screen.getByText('custom-status')).toBeInTheDocument()
  })
})
