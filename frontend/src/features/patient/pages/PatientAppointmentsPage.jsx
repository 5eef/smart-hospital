import { CalendarDays, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Avatar } from '../../../components/ui/Avatar'
import { Button } from '../../../components/ui/Button'
import { PageHeader } from '../../../components/ui/PageHeader'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { useResource } from '../../../hooks/useResource'
import { formatDateTime, userName } from '../../../utils/formatters'

export function PatientAppointmentsPage() {
  const { items: appointments, isLoading, error } = useResource('appointments', { per_page: 50 })
  return <div className="mx-auto max-w-5xl page-stack"><PageHeader title="Mes rendez-vous" description="Suivez vos demandes et vos prochaines visites." actions={<Button as={Link} to="/patient/appointments/new"><Plus size={18} />Demander un RDV</Button>} />{error ? <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">Impossible de charger vos rendez-vous.</p> : null}<section className="grid gap-4">{isLoading ? <p className="muted">Chargement...</p> : appointments.length ? appointments.map((item) => <article key={item.id} className="panel flex flex-col gap-4 p-5 sm:flex-row sm:items-center"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"><CalendarDays /></span><div className="min-w-0 flex-1"><h3 className="font-bold">{formatDateTime(item.scheduled_at)}</h3><div className="mt-2 flex items-center gap-2"><Avatar name={userName(item.doctor)} size="sm" /><p className="muted text-sm">{userName(item.doctor)} · {item.department?.name}</p></div><p className="muted mt-2 text-sm">{item.reason || 'Sans motif'}</p></div><StatusBadge status={item.status} /></article>) : <p className="panel muted p-6">Aucun rendez-vous.</p>}</section></div>
}
