import { api, initializeCsrf } from './api'

export const authService = {
  async login(credentials) {
    await initializeCsrf()
    const { data } = await api.post('/auth/login', credentials)
    return data
  },

  async register(payload) {
    await initializeCsrf()
    const { data } = await api.post('/auth/register', payload)
    return data
  },

  async me() {
    const { data } = await api.get('/auth/me')
    return data
  },

  async updateProfile(payload) {
    const { data } = await api.post('/profile/change-requests', payload)
    return data
  },

  async logout() {
    const { data } = await api.post('/auth/logout')
    return data
  },

  async forgotPassword(email) {
    await initializeCsrf()
    const { data } = await api.post('/auth/forgot-password', { email })
    return data
  },

  async resetPassword(payload) {
    await initializeCsrf()
    const { data } = await api.post('/auth/reset-password', payload)
    return data
  },

  async resendVerification() {
    const { data } = await api.post('/auth/email/verification-notification')
    return data
  },
}
