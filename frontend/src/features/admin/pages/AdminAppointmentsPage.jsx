import { CalendarCheck, CalendarClock, Download, Eraser, ListFilter, Users, XCircle } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { ActionNotice } from '../../../components/ui/ActionNotice'
import { Avatar } from '../../../components/ui/Avatar'
import { Button } from '../../../components/ui/Button'
import { Pagination } from '../../../components/ui/Pagination'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { useActionNotice } from '../../../hooks/useActionNotice'
import { useResource } from '../../../hooks/useResource'
import { api } from '../../../services/api'
import { resourceService } from '../../../services/resourceService'
import { downloadCsv } from '../../../utils/exportUtils'
import { apiError, formatDateTime, userName } from '../../../utils/formatters'

const statuses = ['pending', 'confirmed', 'cancelled', 'completed', 'no_show']
const statusLabels = { pending: 'En attente', confirmed: 'Confirmé', cancelled: 'Annulé', completed: 'Terminé', no_show: 'Absent' }

export function AdminAppointmentsPage() {
  const [status, setStatus] = useState('')
  const [department, setDepartment] = useState('')
  const [date, setDate] = useState('')
  const [page, setPage] = useState(1)
  const [stats, setStats] = useState(null)
  const { items: appointments, pagination, isLoading, error, refetch } = useResource('appointments', { status, department_id: department, date, page, per_page: 10 })
  const { items: departments } = useResource('departments', { per_page: 100 })
  const { message, notify, clear } = useActionNotice()
  useEffect(() => { api.get('/admin/dashboard').then(({ data }) => setStats(data)) }, [])
  const cancelled = useMemo(() => appointments.filter((item) => item.status === 'cancelled').length, [appointments])

  async function changeStatus(id, nextStatus) { try { await resourceService.update('appointments', id, { status: nextStatus }); await refetch(); notify('Statut mis à jour.') } catch (requestError) { notify(apiError(requestError, 'Impossible de mettre à jour le rendez-vous.')) } }
  function resetFilters() { setStatus(''); setDepartment(''); setDate(''); setPage(1) }
  function exportCsv() { downloadCsv('rendez-vous-smart-hospital.csv', [['Patient', 'Médecin', 'Date', 'Département', 'Statut'], ...appointments.map((item) => [userName(item.patient), userName(item.doctor), formatDateTime(item.scheduled_at), item.department?.name, statusLabels[item.status] || item.status])]); notify('Export CSV téléchargé.') }

  return <div className="page-stack">
    <ActionNotice message={message} onClose={clear} />
    <section className="grid gap-5 xl:grid-cols-[2fr_1fr]"><article className="rounded-2xl bg-gradient-to-r from-blue-700 to-blue-500 p-7 text-white shadow-lg shadow-blue-900/15 sm:p-8"><h2 className="text-3xl font-bold sm:text-4xl">Gestion des Rendez-vous</h2><p className="mt-3 max-w-2xl text-lg text-blue-50">Planifiez, filtrez et suivez les visites patient dans tous les départements.</p><div className="mt-8 flex flex-wrap gap-3"><Button variant="secondary" onClick={() => document.getElementById('appointments-table')?.scrollIntoView()}><CalendarCheck size={18} />Voir le planning</Button><Button onClick={exportCsv} className="bg-blue-900/50 hover:bg-blue-900/70"><Download size={18} />Exporter</Button></div></article><div className="grid grid-cols-2 gap-4"><article className="panel p-5"><Users className="text-blue-600" /><p className="muted mt-5 text-sm">Total patients</p><strong className="text-2xl">{stats?.total_patients ?? '—'}</strong></article><article className="panel p-5"><CalendarCheck className="text-emerald-600" /><p className="muted mt-5 text-sm">Aujourd’hui</p><strong className="text-2xl">{stats?.appointments_today ?? '—'}</strong></article><article className="panel p-5"><CalendarClock className="text-amber-600" /><p className="muted mt-5 text-sm">En attente</p><strong className="text-2xl">{stats?.pending_appointments ?? '—'}</strong></article><article className="panel p-5"><XCircle className="text-red-600" /><p className="muted mt-5 text-sm">Annulés affichés</p><strong className="text-2xl">{cancelled}</strong></article></div></section>
    <section className="panel flex flex-col gap-4 p-5 lg:flex-row lg:items-end"><label className="field-label lg:w-56">Date<input type="date" value={date} onChange={(event) => { setDate(event.target.value); setPage(1) }} className="field" /></label><label className="field-label lg:w-64">Département<select value={department} onChange={(event) => { setDepartment(event.target.value); setPage(1) }} className="field"><option value="">Tous les départements</option>{departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="field-label lg:w-56">Statut<select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1) }} className="field"><option value="">Tous les statuts</option>{statuses.map((item) => <option key={item} value={item}>{statusLabels[item]}</option>)}</select></label><Button variant="ghost" onClick={resetFilters} className="lg:ml-auto"><Eraser size={18} />Effacer les filtres</Button></section>
    <section id="appointments-table" className="panel overflow-hidden"><div className="flex items-center justify-between border-b px-6 py-5" style={{ borderColor: 'var(--border)' }}><h3 className="text-xl font-bold">Rendez-vous planifiés</h3><ListFilter className="muted" size={20} /></div>{error ? <p role="alert" className="m-5 rounded-xl bg-red-50 p-3 text-red-700">{apiError(error, 'Impossible de charger les rendez-vous.')}</p> : null}<div className="overflow-x-auto"><table className="w-full min-w-[1000px] text-left"><thead className="table-head text-xs uppercase tracking-widest"><tr>{['Patient', 'Médecin', 'Date & heure', 'Département', 'Motif', 'Statut'].map((head) => <th key={head} className="px-6 py-4">{head}</th>)}</tr></thead><tbody>{isLoading ? <tr><td colSpan="6" className="muted px-6 py-8">Chargement...</td></tr> : appointments.length ? appointments.map((row) => <tr key={row.id} className="table-row border-t"><td className="px-6 py-4"><div className="flex items-center gap-3"><Avatar name={userName(row.patient)} /><strong>{userName(row.patient)}</strong></div></td><td className="px-6 py-4">{userName(row.doctor)}</td><td className="px-6 py-4">{formatDateTime(row.scheduled_at)}</td><td className="px-6 py-4">{row.department?.name}</td><td className="muted max-w-52 truncate px-6 py-4">{row.reason || '—'}</td><td className="px-6 py-4"><label className="inline-flex items-center gap-2"><StatusBadge status={row.status} /><select value={row.status} onChange={(event) => changeStatus(row.id, event.target.value)} className="field min-h-9 w-10 px-1 text-transparent" aria-label={`Modifier le statut du rendez-vous de ${userName(row.patient)}`}>{statuses.map((item) => <option key={item} value={item}>{statusLabels[item]}</option>)}</select></label></td></tr>) : <tr><td colSpan="6" className="muted px-6 py-10 text-center">Aucun rendez-vous.</td></tr>}</tbody></table></div><Pagination pagination={pagination} onPageChange={setPage} /></section>
    <section className="grid gap-5 md:grid-cols-3">{[{ icon: CalendarCheck, title: 'Suivi centralisé', text: 'Tous les rendez-vous utilisent les données API existantes.' }, { icon: CalendarClock, title: 'Statuts en temps réel', text: 'Confirmez, terminez ou signalez une absence.' }, { icon: Download, title: 'Export rapide', text: 'Téléchargez la sélection affichée au format CSV.' }].map((item) => <article key={item.title} className="panel flex gap-4 p-5"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"><item.icon size={21} /></span><div><h3 className="font-bold">{item.title}</h3><p className="muted mt-1 text-sm">{item.text}</p></div></article>)}</section>
  </div>
}
