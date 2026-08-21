import { CalendarCheck, ClipboardPlus, Plus, Users, UserCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Avatar } from '../../../components/ui/Avatar'
import { Button } from '../../../components/ui/Button'
import { LineChart } from '../../../components/ui/Charts'
import { PageHeader } from '../../../components/ui/PageHeader'
import { SectionCard } from '../../../components/ui/SectionCard'
import { StatCard } from '../../../components/ui/StatCard'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { api } from '../../../services/api'
import { formatDateTime, userName } from '../../../utils/formatters'

export function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => { let alive = true; api.get('/admin/dashboard').then(({ data }) => alive && setStats(data)).catch(() => alive && setError("Impossible de charger la vue d'ensemble.")); return () => { alive = false } }, [])

  const cards = [
    { label: 'Total patients', value: stats?.total_patients ?? '—', change: stats ? `+${stats.new_patients_this_month} ce mois` : null, icon: Users, tone: 'blue' },
    { label: 'Total médecins', value: stats?.total_doctors ?? '—', change: stats ? `${stats.active_doctors} actifs` : null, icon: ClipboardPlus, tone: 'violet' },
    { label: "Rendez-vous aujourd'hui", value: stats?.appointments_today ?? '—', hint: stats ? `${stats.pending_appointments} en attente` : null, icon: CalendarCheck, tone: 'amber' },
    { label: 'Utilisateurs actifs', value: stats?.active_users ?? '—', hint: 'Comptes actuellement activés', icon: UserCheck, tone: 'emerald' },
  ]

  return <div className="page-stack">
    <PageHeader title="Dashboard" description="Bienvenue, voici l’état actuel de SmartHôpital aujourd’hui." actions={<Button as={Link} to="/admin/appointments"><Plus size={18} />Gérer les rendez-vous</Button>} />
    {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 font-medium text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{error}</p> : null}
    <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">{cards.map((stat) => <StatCard key={stat.label} {...stat} value={String(stat.value)} />)}</section>
    <SectionCard title="Tendances d’activité" description="Comparaison des rendez-vous et consultations sur les six derniers mois." bodyClassName="p-5 sm:p-6"><LineChart data={stats?.activity || []} series={[{ key: 'appointments', label: 'Rendez-vous', color: '#1459d9' }, { key: 'consultations', label: 'Consultations', color: '#16a34a' }]} /></SectionCard>
    <section className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
      <SectionCard title="Derniers rendez-vous" action={<Link to="/admin/appointments" className="text-sm font-semibold text-blue-600">Voir tout</Link>}>
        <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="table-head text-xs uppercase tracking-wider"><tr>{['Patient', 'Médecin', 'Date', 'Statut'].map((head) => <th key={head} className="px-6 py-3.5">{head}</th>)}</tr></thead><tbody>{stats?.recent_appointments?.length ? stats.recent_appointments.map((item) => <tr key={item.id} className="table-row border-t transition"><td className="px-6 py-4"><div className="flex items-center gap-3"><Avatar name={userName(item.patient)} /><strong>{userName(item.patient)}</strong></div></td><td className="px-6 py-4">{userName(item.doctor)}</td><td className="muted px-6 py-4">{formatDateTime(item.scheduled_at)}</td><td className="px-6 py-4"><StatusBadge status={item.status} /></td></tr>) : <tr><td colSpan="4" className="muted px-6 py-10 text-center">Aucun rendez-vous récent.</td></tr>}</tbody></table></div>
      </SectionCard>
      <SectionCard title="Médecins les plus sollicités" action={<Link to="/admin/doctors" className="text-sm font-semibold text-blue-600">Gérer</Link>} bodyClassName="p-5 sm:p-6"><div className="space-y-4">{stats?.top_doctors?.length ? stats.top_doctors.map((doctor) => <div key={doctor.id} className="flex items-center gap-3"><Avatar name={userName(doctor)} /><div className="min-w-0 flex-1"><p className="truncate font-semibold">{userName(doctor)}</p><p className="muted truncate text-sm">{doctor.specialty} · {doctor.appointments_count} RDV</p></div><StatusBadge status={doctor.status} /></div>) : <p className="muted text-sm">Aucun médecin disponible.</p>}</div></SectionCard>
    </section>
  </div>
}
