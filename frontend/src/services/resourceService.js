import { api } from './api'

export const resourceService = {
  async list(resource, params = {}) {
    const { data } = await api.get(`/${resource}`, { params })
    return data
  },

  async show(resource, id) {
    const { data } = await api.get(`/${resource}/${id}`)
    return data
  },

  async create(resource, payload) {
    const { data } = await api.post(`/${resource}`, payload)
    return data
  },

  async update(resource, id, payload) {
    const { data } = await api.put(`/${resource}/${id}`, payload)
    return data
  },

  async remove(resource, id) {
    const { data } = await api.delete(`/${resource}/${id}`)
    return data
  },
}
