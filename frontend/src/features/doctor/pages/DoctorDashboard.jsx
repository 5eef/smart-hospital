import { CalendarCheck, ClipboardPlus, Clock3, FileText, Plus, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Avatar } from '../../../components/ui/Avatar'
import { Button } from '../../../components/ui/Button'
import { SectionCard } from '../../../components/ui/SectionCard'
import { StatCard } from '../../../components/ui/StatCard'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { useAuth } from '../../../hooks/useAuth'
import { api } from '../../../services/api'
import { formatDateTime, userName } from '../../../utils/formatters'

export function DoctorDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => { api.get('/doctor/dashboard').then(({ data }) => setStats(data)).catch(() => setError('Impossible de charger votre activité.')) }, [])
  const cards = [
    { label: "Patients suivis", value: stats?.total_patients ?? '—', icon: Users, tone: 'blue' },
    { label: 'Consultations', value: stats?.total_consultations ?? '—', icon: ClipboardPlus, tone: 'emerald' },
    { label: 'Rendez-vous du jour', value: stats?.appointments_today ?? '—', icon: CalendarCheck, tone: 'violet' },
    { label: 'En attente', value: stats?.pending_appointments ?? '—', icon: Clock3, tone: 'amber' },
  ]
  return <div className="page-stack">
    <section className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between"><div><h2 className="page-title">Bonjour, {user?.name}</h2><p className="page-subtitle">Voici l’aperçu de votre activité clinique.</p></div><Button as={Link} to="/doctor/consultations"><Plus size={18} />Nouvelle consultation</Button></section>
    {error ? <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p> : null}
    <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">{cards.map((stat) => <StatCard key={stat.label} {...stat} value={String(stat.value)} />)}</section>
    <section className="grid gap-6 xl:grid-cols-[1.65fr_1fr]"><SectionCard title="Prochains rendez-vous" action={<Link to="/doctor/appointments" className="text-sm font-semibold text-blue-600">Voir tout</Link>}><div>{stats?.upcoming_appointments?.length ? stats.upcoming_appointments.map((item) => <div key={item.id} className="table-row flex flex-col gap-3 border-t p-5 first:border-t-0 sm:flex-row sm:items-center"><div className="flex min-w-0 flex-1 items-center gap-3"><Avatar name={userName(item.patient)} /><div className="min-w-0"><p className="truncate font-semibold">{userName(item.patient)}</p><p className="muted truncate text-sm">{item.reason || 'Consultation'}</p></div></div><time className="text-sm font-semibold text-blue-600">{formatDateTime(item.scheduled_at)}</time><StatusBadge status={item.status} /></div>) : <p className="muted p-6">Aucun rendez-vous à venir.</p>}</div></SectionCard><SectionCard title="Activité récente" bodyClassName="p-5"><div className="space-y-4">{stats?.recent_consultations?.length ? stats.recent_consultations.map((record) => <article key={record.id} className="rounded-xl border p-4" style={{ borderColor: 'var(--border)' }}><div className="flex items-center gap-3"><FileText className="text-blue-600" size={19} /><strong>{userName(record.patient)}</strong></div><p className="muted mt-2 line-clamp-2 text-sm">{record.diagnosis || record.notes || 'Consultation enregistrée'}</p></article>) : <p className="muted text-sm">Aucune consultation récente.</p>}</div></SectionCard></section>
  </div>
}
