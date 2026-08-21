import { describe, expect, it } from 'vitest'
import { apiError, formatDateTime, rows, userName } from './formatters'

describe('formatters', () => {
  it('normalizes paginated, array, and empty payloads', () => {
    expect(rows({ data: [{ id: 1 }] })).toEqual([{ id: 1 }])
    expect(rows([{ id: 2 }])).toEqual([{ id: 2 }])
    expect(rows()).toEqual([])
  })

  it('formats dates and safely handles missing values', () => {
    expect(formatDateTime()).toBe('-')
    expect(formatDateTime('2026-08-21T10:30:00Z')).toMatch(/21/)
  })

  it('selects the most useful display name', () => {
    expect(userName({ user: { name: 'Marie Laurent' }, name: 'Fallback' })).toBe('Marie Laurent')
    expect(userName({ name: 'Jean Dupont' })).toBe('Jean Dupont')
    expect(userName()).toBe('-')
  })

  it('prioritizes validation errors, then API messages, then fallback text', () => {
    expect(apiError({ response: { data: { errors: { email: ['Email invalide.'] } } } })).toBe('Email invalide.')
    expect(apiError({ response: { data: { message: 'Accès refusé.' } } })).toBe('Accès refusé.')
    expect(apiError({}, 'Erreur personnalisée.')).toBe('Erreur personnalisée.')
  })
})
