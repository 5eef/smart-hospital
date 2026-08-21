import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8001/api',
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('smartHospitalToken')

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && localStorage.getItem('smartHospitalToken')) {
      localStorage.removeItem('smartHospitalToken')
      localStorage.removeItem('smartHospitalUser')
      window.dispatchEvent(new CustomEvent('smart-hospital:unauthorized'))
    }
    return Promise.reject(error)
  },
)
