import { Check, LoaderCircle, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api } from '../../services/api'
import { apiError, formatDateTime } from '../../utils/formatters'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'

const fieldLabels = { name: 'Nom', phone: 'Téléphone', address: 'Adresse', locale: 'Langue' }

export function AdminApprovalsModal({ onClose }) {
  const [requests, setRequests] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [workingId, setWorkingId] = useState(null)
  const [rejectingId, setRejectingId] = useState(null)
  const [reason, setReason] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    api.get('/admin/profile-change-requests', { params: { status: 'pending', per_page: 50 } }).then(({ data }) => {
      if (!active) return
      setRequests(data.data ?? [])
      setError('')
    }).catch((requestError) => {
      if (active) setError(apiError(requestError, 'Impossible de charger les demandes.'))
    }).finally(() => {
      if (active) setIsLoading(false)
    })
    return () => { active = false }
  }, [])

  async function approve(id) {
    setWorkingId(id)
    setError('')
    try {
      await api.patch(`/admin/profile-change-requests/${id}/approve`)
      setRequests((current) => current.filter((item) => item.id !== id))
      setMessage('Demande approuvée.')
    } catch (requestError) {
      setError(apiError(requestError, 'Approbation impossible.'))
    } finally {
      setWorkingId(null)
    }
  }

  async function reject(id) {
    if (!reason.trim()) {
      setError('Le motif de refus est obligatoire.')
      return
    }
    setWorkingId(id)
    setError('')
    try {
      await api.patch(`/admin/profile-change-requests/${id}/reject`, { rejection_reason: reason.trim() })
      setRequests((current) => current.filter((item) => item.id !== id))
      setRejectingId(null)
      setReason('')
      setMessage('Demande refusée.')
    } catch (requestError) {
      setError(apiError(requestError, 'Refus impossible.'))
    } finally {
      setWorkingId(null)
    }
  }

  return <Modal open onClose={onClose} title="Paramètres administratifs" description="Examinez les demandes de modification de profil en attente." size="3xl">
    {message ? <p role="status" className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-700">{message}</p> : null}
    {error ? <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p> : null}
    {isLoading ? <p className="muted flex items-center gap-2 py-6"><LoaderCircle className="animate-spin" size={18} />Chargement...</p> : requests.length ? <div className="space-y-4">{requests.map((request) => <article key={request.id} className="panel-muted rounded-xl border p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><h3 className="font-bold">{request.user?.name}</h3><p className="muted text-xs">{request.user?.email} · {formatDateTime(request.created_at)}</p></div><span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">En attente</span></div>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">{Object.entries(request.requested_changes ?? {}).map(([field, value]) => <div key={field} className="rounded-lg bg-[var(--surface)] p-3"><dt className="eyebrow">{fieldLabels[field] || field}</dt><dd className="mt-1 text-sm font-semibold">{String(value || '—')}</dd></div>)}</dl>
      {rejectingId === request.id ? <label className="field-label mt-4">Motif du refus<textarea value={reason} onChange={(event) => setReason(event.target.value)} className="field min-h-24 resize-y" /></label> : null}
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        {rejectingId === request.id ? <><Button variant="secondary" onClick={() => { setRejectingId(null); setReason('') }} disabled={workingId === request.id}>Annuler</Button><Button variant="danger" onClick={() => reject(request.id)} disabled={workingId === request.id}>{workingId === request.id ? <LoaderCircle size={17} className="animate-spin" /> : <X size={17} />}Confirmer le refus</Button></> : <><Button variant="secondary" onClick={() => { setRejectingId(request.id); setMessage('') }} disabled={Boolean(workingId)}><X size={17} />Refuser</Button><Button onClick={() => approve(request.id)} disabled={Boolean(workingId)}>{workingId === request.id ? <LoaderCircle size={17} className="animate-spin" /> : <Check size={17} />}Approuver</Button></>}
      </div>
    </article>)}</div> : <p className="muted py-8 text-center">Aucune demande en attente.</p>}
  </Modal>
}
