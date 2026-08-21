import { CalendarDays, Filter } from 'lucide-react'
import { useState } from 'react'
import { ActionNotice } from '../../../components/ui/ActionNotice'
import { Avatar } from '../../../components/ui/Avatar'
import { ConfirmModal } from '../../../components/ui/ConfirmModal'
import { PageHeader } from '../../../components/ui/PageHeader'
import { Pagination } from '../../../components/ui/Pagination'
import { SectionCard } from '../../../components/ui/SectionCard'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { useActionNotice } from '../../../hooks/useActionNotice'
import { useResource } from '../../../hooks/useResource'
import { resourceService } from '../../../services/resourceService'
import { apiError, formatDateTime, userName } from '../../../utils/formatters'

const statuses = ['pending', 'confirmed', 'cancelled', 'completed', 'no_show']
const labels = { pending: 'En attente', confirmed: 'Confirmé', cancelled: 'Annulé', completed: 'Terminé', no_show: 'Absent' }

export function DoctorAppointmentsPage() {
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [workingId, setWorkingId] = useState(null)
  const [pendingStatus, setPendingStatus] = useState(null)
  const { items: appointments, pagination, isLoading, error, refetch } = useResource('appointments', { status, page, per_page: 12 })
  const { message, notify, clear } = useActionNotice()
  async function commitStatus(id, nextStatus) { if (workingId) return; setWorkingId(id); try { await resourceService.update('appointments', id, { status: nextStatus }); await refetch(); setPendingStatus(null); notify('Statut mis à jour.') } catch (requestError) { notify(apiError(requestError, 'Impossible de mettre à jour le rendez-vous.')) } finally { setWorkingId(null) } }
  function changeStatus(appointment, nextStatus) { if (nextStatus === 'cancelled') { setPendingStatus({ id: appointment.id, name: userName(appointment.patient) }); return } commitStatus(appointment.id, nextStatus) }
  return <div className="page-stack"><ActionNotice message={message} onClose={clear} /><PageHeader title="Mon agenda" description="Consultez vos rendez-vous et confirmez les étapes de prise en charge." /><section className="panel flex items-end gap-4 p-5"><label className="field-label w-full max-w-xs">Statut<select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1) }} className="field"><option value="">Tous les statuts</option>{statuses.map((item) => <option key={item} value={item}>{labels[item]}</option>)}</select></label><Filter className="mb-3 text-blue-600" /></section><SectionCard title="Rendez-vous" action={<CalendarDays className="text-blue-600" />}>{error ? <p role="alert" className="m-5 rounded-xl bg-red-50 p-3 text-red-700">{apiError(error)}</p> : null}<div>{isLoading ? <p className="muted p-6">Chargement...</p> : appointments.length ? appointments.map((row) => <article key={row.id} className="table-row grid gap-4 border-t p-5 first:border-t-0 md:grid-cols-[1.2fr_1fr_1fr_auto] md:items-center"><div className="flex items-center gap-3"><Avatar name={userName(row.patient)} /><div><strong>{userName(row.patient)}</strong><p className="muted text-sm">{row.reason || 'Consultation'}</p></div></div><time>{formatDateTime(row.scheduled_at)}</time><span className="muted">{row.department?.name}</span><label className="flex items-center gap-2"><StatusBadge status={row.status} /><select value={row.status} disabled={workingId === row.id} onChange={(event) => changeStatus(row, event.target.value)} className="field w-12 px-1 text-transparent" aria-label={`Changer le statut de ${userName(row.patient)}`}>{statuses.map((item) => <option key={item} value={item}>{labels[item]}</option>)}</select></label></article>) : <p className="muted p-6">Aucun rendez-vous.</p>}</div><Pagination pagination={pagination} onPageChange={setPage} /></SectionCard><ConfirmModal open={Boolean(pendingStatus)} onClose={() => setPendingStatus(null)} onConfirm={() => commitStatus(pendingStatus.id, 'cancelled')} isLoading={Boolean(workingId)} title="Annuler le rendez-vous" description={`Confirmez l’annulation du rendez-vous de ${pendingStatus?.name || 'ce patient'}.`} confirmLabel="Annuler le rendez-vous" /></div>
}
