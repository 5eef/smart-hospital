import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8001/api',
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  withXSRFToken: true,
})

const apiOrigin = api.defaults.baseURL.replace(/\/api\/?$/, '')

export async function initializeCsrf() {
  await axios.get(`${apiOrigin}/sanctum/csrf-cookie`, {
    headers: { Accept: 'application/json' },
    withCredentials: true,
    withXSRFToken: true,
  })
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.dispatchEvent(new CustomEvent('smart-hospital:unauthorized'))
    }
    return Promise.reject(error)
  },
)
