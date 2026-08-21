export function rows(payload) {
  return payload?.data ?? payload ?? []
}

export function formatDateTime(value) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function userName(entity) {
  return entity?.user?.name ?? entity?.name ?? '-'
}

export function apiError(error, fallback = 'Une erreur est survenue.') {
  const errors = error?.response?.data?.errors
  const firstFieldError = errors ? Object.values(errors).flat()[0] : null
  return firstFieldError ?? error?.response?.data?.message ?? fallback
}
