import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { expect, it } from 'vitest'
import { NotFoundPage } from './NotFoundPage'

it('renders a safe 404 page', () => {
  render(<MemoryRouter><NotFoundPage /></MemoryRouter>)
  expect(screen.getByText('Page introuvable')).toBeInTheDocument()
})
