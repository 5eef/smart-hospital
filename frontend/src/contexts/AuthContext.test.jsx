import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from './AuthContext'
import { useAuth } from '../hooks/useAuth'
import { authService } from '../services/authService'

vi.mock('../services/authService', () => ({
  authService: {
    me: vi.fn(), login: vi.fn(), register: vi.fn(), updateProfile: vi.fn(), logout: vi.fn(),
  },
}))

function Probe() {
  const auth = useAuth()
  return <div><span>{auth.isLoading ? 'loading' : auth.user?.email || 'anonymous'}</span><button onClick={() => auth.login({ email: 'patient@example.test', password: 'secret' })}>login</button><button onClick={auth.logout}>logout</button></div>
}

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    authService.me.mockRejectedValue({ response: { status: 401 } })
  })

  it('restores the cookie session and never stores an authentication token', async () => {
    authService.login.mockResolvedValue({ user: { email: 'patient@example.test', role: 'patient' } })
    authService.logout.mockResolvedValue({})
    render(<AuthProvider><Probe /></AuthProvider>)

    await screen.findByText('anonymous')
    fireEvent.click(screen.getByText('login'))
    await screen.findByText('patient@example.test')
    expect(localStorage.getItem('smartHospitalToken')).toBeNull()

    fireEvent.click(screen.getByText('logout'))
    await waitFor(() => expect(screen.getByText('anonymous')).toBeInTheDocument())
  })
})
