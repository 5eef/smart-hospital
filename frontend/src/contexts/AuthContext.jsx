import { useCallback, useEffect, useMemo, useState } from 'react'
import { authService } from '../services/authService'
import { AuthContext } from './auth-context'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('smartHospitalUser')
    return storedUser ? JSON.parse(storedUser) : null
  })
  const [isLoading, setIsLoading] = useState(Boolean(localStorage.getItem('smartHospitalToken')))

  useEffect(() => {
    const token = localStorage.getItem('smartHospitalToken')

    if (!token) {
      return
    }

    let isMounted = true
    authService
      .me()
      .then(({ user: freshUser }) => {
        if (!isMounted) return
        setUser(freshUser)
        localStorage.setItem('smartHospitalUser', JSON.stringify(freshUser))
      })
      .catch(() => {
        localStorage.removeItem('smartHospitalToken')
        localStorage.removeItem('smartHospitalUser')
        if (isMounted) setUser(null)
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  const login = useCallback(async (credentials) => {
    setIsLoading(true)
    try {
      const data = await authService.login(credentials)
      localStorage.setItem('smartHospitalToken', data.token)
      localStorage.setItem('smartHospitalUser', JSON.stringify(data.user))
      setUser(data.user)
      return data.user
    } finally {
      setIsLoading(false)
    }
  }, [])

  const register = useCallback(async (payload) => {
    setIsLoading(true)
    try {
      const data = await authService.register(payload)
      localStorage.setItem('smartHospitalToken', data.token)
      localStorage.setItem('smartHospitalUser', JSON.stringify(data.user))
      setUser(data.user)
      return data.user
    } finally {
      setIsLoading(false)
    }
  }, [])

  const updateProfile = useCallback(async (payload) => {
    const data = await authService.updateProfile(payload)
    localStorage.setItem('smartHospitalUser', JSON.stringify(data.user))
    setUser(data.user)
    return data.user
  }, [])

  const logout = useCallback(async () => {
    try {
      await authService.logout()
    } finally {
      localStorage.removeItem('smartHospitalToken')
      localStorage.removeItem('smartHospitalUser')
      setUser(null)
    }
  }, [])

  const value = useMemo(
    () => ({ user, isAuthenticated: Boolean(user), isLoading, login, register, updateProfile, logout }),
    [isLoading, login, logout, register, updateProfile, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
