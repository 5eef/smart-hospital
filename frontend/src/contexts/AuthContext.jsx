import { useCallback, useEffect, useMemo, useState } from 'react'
import { authService } from '../services/authService'
import { AuthContext } from './auth-context'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    authService
      .me()
      .then(({ user: freshUser }) => {
        if (!isMounted) return
        setUser(freshUser)
      })
      .catch(() => {
        if (isMounted) setUser(null)
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    const clearExpiredSession = () => {
      setUser(null)
      setIsLoading(false)
    }
    window.addEventListener('smart-hospital:unauthorized', clearExpiredSession)
    return () => window.removeEventListener('smart-hospital:unauthorized', clearExpiredSession)
  }, [])

  const login = useCallback(async (credentials) => {
    setIsLoading(true)
    try {
      const data = await authService.login(credentials)
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
      setUser(data.user)
      return data.user
    } finally {
      setIsLoading(false)
    }
  }, [])

  const updateProfile = useCallback(async (payload) => {
    const data = await authService.updateProfile(payload)
    if (data.user) {
      setUser(data.user)
    }
    return data
  }, [])

  const logout = useCallback(async () => {
    try {
      await authService.logout()
    } finally {
      setUser(null)
    }
  }, [])

  const value = useMemo(
    () => ({ user, isAuthenticated: Boolean(user), isLoading, login, register, updateProfile, logout }),
    [isLoading, login, logout, register, updateProfile, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
