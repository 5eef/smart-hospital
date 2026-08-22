import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import { ProtectedRoute } from './ProtectedRoute'
import { useAuth } from '../hooks/useAuth'

vi.mock('../hooks/useAuth', () => ({ useAuth: vi.fn() }))

function renderRoute() {
  render(<MemoryRouter initialEntries={['/admin']}><Routes><Route path="/login" element={<p>login</p>} /><Route path="/verify-email" element={<p>verify</p>} /><Route element={<ProtectedRoute allowedRoles={['admin']} />}><Route path="/admin" element={<p>admin area</p>} /></Route></Routes></MemoryRouter>)
}

beforeEach(() => vi.clearAllMocks())

it('redirects an expired session to login', () => {
  useAuth.mockReturnValue({ isAuthenticated: false, isLoading: false, user: null })
  renderRoute()
  expect(screen.getByText('login')).toBeInTheDocument()
})

it('blocks an authenticated but unverified account', () => {
  useAuth.mockReturnValue({ isAuthenticated: true, isLoading: false, user: { role: 'admin', email_verified: false } })
  renderRoute()
  expect(screen.getByText('verify')).toBeInTheDocument()
})
