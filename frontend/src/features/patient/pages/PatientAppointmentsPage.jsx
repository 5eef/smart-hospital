import { CalendarDays, Plus, XCircle } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ActionNotice } from '../../../components/ui/ActionNotice'
import { Avatar } from '../../../components/ui/Avatar'
import { Button } from '../../../components/ui/Button'
import { ConfirmModal } from '../../../components/ui/ConfirmModal'
import { PageHeader } from '../../../components/ui/PageHeader'
import { Pagination } from '../../../components/ui/Pagination'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { useActionNotice } from '../../../hooks/useActionNotice'
import { useResource } from '../../../hooks/useResource'
import { resourceService } from '../../../services/resourceService'
import { apiError, formatDateTime, userName } from '../../../utils/formatters'

export function PatientAppointmentsPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [pendingCancel, setPendingCancel] = useState(null)
  const [isCancelling, setIsCancelling] = useState(false)
  const { items: appointments, pagination, isLoading, error, refetch } = useResource('appointments', { page, per_page: 10 })
  const { message, notify, clear } = useActionNotice()
  const visibleMessage = message || location.state?.notice || ''
  function clearNotice() { clear(); if (location.state?.notice) navigate(location.pathname, { replace: true, state: null }) }
  async function cancelAppointment() { if (!pendingCancel || isCancelling) return; setIsCancelling(true); try { await resourceService.update('appointments', pendingCancel.id, { status: 'cancelled' }); await refetch(); setPendingCancel(null); notify('Rendez-vous annulé.') } catch (requestError) { notify(apiError(requestError, "Impossible d’annuler le rendez-vous.")) } finally { setIsCancelling(false) } }
  return <div className="mx-auto max-w-5xl page-stack"><ActionNotice message={visibleMessage} onClose={clearNotice} /><PageHeader title="Mes rendez-vous" description="Suivez vos demandes et vos prochaines visites." actions={<Button as={Link} to="/patient/appointments/new"><Plus size={18} />Demander un RDV</Button>} />{error ? <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">Impossible de charger vos rendez-vous.</p> : null}<section className="grid gap-4">{isLoading ? <p className="muted">Chargement...</p> : appointments.length ? appointments.map((item) => <article key={item.id} className="panel flex flex-col gap-4 p-5 sm:flex-row sm:items-center"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"><CalendarDays /></span><div className="min-w-0 flex-1"><h3 className="font-bold">{formatDateTime(item.scheduled_at)}</h3><div className="mt-2 flex items-center gap-2"><Avatar name={userName(item.doctor)} size="sm" /><p className="muted text-sm">{userName(item.doctor)} · {item.department?.name}</p></div><p className="muted mt-2 text-sm">{item.reason || 'Sans motif'}</p></div><div className="flex items-center gap-3"><StatusBadge status={item.status} />{['pending', 'confirmed'].includes(item.status) && new Date(item.scheduled_at) > new Date() ? <Button variant="ghost" onClick={() => setPendingCancel(item)} className="text-red-600"><XCircle size={17} />Annuler</Button> : null}</div></article>) : <p className="panel muted p-6">Aucun rendez-vous.</p>}</section><section className="panel overflow-hidden"><Pagination pagination={pagination} onPageChange={setPage} /></section><ConfirmModal open={Boolean(pendingCancel)} onClose={() => setPendingCancel(null)} onConfirm={cancelAppointment} isLoading={isCancelling} title="Annuler le rendez-vous" description={`Confirmez l’annulation du rendez-vous du ${formatDateTime(pendingCancel?.scheduled_at)}.`} confirmLabel="Annuler le rendez-vous" /></div>
}
