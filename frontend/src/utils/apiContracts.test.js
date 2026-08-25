import { describe, expect, it } from 'vitest'
import { unreadCountFrom, versionedUpdatePayload } from './apiContracts'

describe('API contracts', () => {
  it('reads the notification unread_count object contract with a safe fallback', () => {
    expect(unreadCountFrom({ unread_count: 4 })).toBe(4)
    expect(unreadCountFrom({}, { unread_count: 2 })).toBe(2)
    expect(unreadCountFrom([])).toBe(0)
  })

  it('adds the current optimistic-lock version without mutating form data', () => {
    const form = { status: 'in_progress', result: '' }
    expect(versionedUpdatePayload({ id: 9, version: 3 }, form)).toEqual({
      status: 'in_progress',
      result: '',
      version: 3,
    })
    expect(form).toEqual({ status: 'in_progress', result: '' })
  })

  it('rejects updates when the API resource has no valid version', () => {
    expect(() => versionedUpdatePayload({ id: 9 }, { status: 'cancelled' })).toThrow(/version/i)
  })
})
