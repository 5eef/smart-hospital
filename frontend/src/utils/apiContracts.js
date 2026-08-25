export function unreadCountFrom(...payloads) {
  for (const payload of payloads) {
    const value = Number(payload?.unread_count)
    if (Number.isInteger(value) && value >= 0) return value
  }
  return 0
}

export function versionedUpdatePayload(record, payload) {
  const version = Number(record?.version)
  if (!Number.isInteger(version) || version < 1) {
    throw new Error('A valid resource version is required for updates.')
  }

  return { ...payload, version }
}
