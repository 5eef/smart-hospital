import { CalendarCheck, Download, Stethoscope, Users, UserCheck } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { BarChart, DonutChart, LineChart } from '../../../components/ui/Charts'
import { PageHeader } from '../../../components/ui/PageHeader'
import { SectionCard } from '../../../components/ui/SectionCard'
import { StatCard } from '../../../components/ui/StatCard'
import { api } from '../../../services/api'
import { downloadPdfReport } from '../../../utils/exportUtils'
import { apiError, userName } from '../../../utils/formatters'

export function AdminStatisticsPage() {
  const [stats, setStats] = useState(null)
  const [months, setMonths] = useState(6)
  const [error, setError] = useState('')
  useEffect(() => { let active = true; api.get('/admin/dashboard', { params: { months } }).then(({ data }) => { if (active) { setStats(data); setError('') } }).catch((requestError) => { if (active) setError(apiError(requestError, 'Impossible de charger les statistiques.')) }); return () => { active = false } }, [months])

  const statusData = useMemo(() => ['confirmed', 'pending', 'completed', 'cancelled', 'no_show'].map((status, index) => ({ label: { confirmed: 'Confirmés', pending: 'En attente', completed: 'Terminés', cancelled: 'Annulés', no_show: 'Absents' }[status], value: Number(stats?.appointment_statuses?.[status] ?? 0), color: ['#16a34a', '#d97706', '#1459d9', '#dc2626', '#7c3aed'][index] })), [stats])
  const departmentData = stats?.appointments_by_department ?? []
  const cards = [
    { label: 'Patients', value: stats?.total_patients ?? '—', icon: Users, tone: 'blue', hint: `+${stats?.new_patients_this_month ?? 0} ce mois` },
    { label: 'Médecins', value: stats?.total_doctors ?? '—', icon: Stethoscope, tone: 'emerald', hint: `${stats?.active_doctors ?? 0} actifs` },
    { label: 'Rendez-vous', value: stats?.period_appointments ?? '—', icon: CalendarCheck, tone: 'amber', hint: `${stats?.appointments_today ?? 0} aujourd’hui` },
    { label: 'Utilisateurs actifs', value: stats?.active_users ?? '—', icon: UserCheck, tone: 'violet' },
  ]
  function exportPdf() { downloadPdfReport('rapport-statistiques-smart-hospital.pdf', 'Rapport SmartHôpital', cards.map((stat) => `${stat.label}: ${stat.value}`)) }

  return <div className="page-stack">
    <PageHeader title="Statistiques Générales" description="Analyse de l’activité hospitalière à partir des données disponibles." actions={<><select aria-label="Période" value={months} onChange={(event) => setMonths(Number(event.target.value))} className="field w-auto"><option value={3}>3 derniers mois</option><option value={6}>6 derniers mois</option><option value={12}>12 derniers mois</option></select><Button onClick={exportPdf} disabled={!stats}><Download size={18} />Exporter</Button></>} />
    {error ? <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p> : null}
    <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">{cards.map((stat) => <StatCard key={stat.label} {...stat} value={String(stat.value)} />)}</section>
    <section className="grid gap-6 xl:grid-cols-[1.6fr_1fr]"><SectionCard title="Évolution de l’activité" bodyClassName="p-6"><LineChart data={stats?.activity || []} series={[{ key: 'appointments', label: 'Rendez-vous', color: '#1459d9' }, { key: 'consultations', label: 'Consultations', color: '#16a34a' }]} /></SectionCard><SectionCard title="Rendez-vous par statut" bodyClassName="p-6"><DonutChart data={statusData} centerLabel={stats?.period_appointments ?? 0} /></SectionCard></section>
    <SectionCard title="Répartition par spécialité" description="Nombre de rendez-vous regroupés par département." bodyClassName="p-6"><BarChart data={departmentData} /></SectionCard>
    <SectionCard title="Médecins les plus sollicités"><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left"><thead className="table-head text-xs uppercase tracking-widest"><tr><th className="px-6 py-4">Médecin</th><th className="px-6 py-4">Spécialité</th><th className="px-6 py-4">Rendez-vous</th><th className="px-6 py-4">Statut</th></tr></thead><tbody>{stats?.top_doctors?.map((doctor) => <tr key={doctor.id} className="table-row border-t"><td className="px-6 py-5 font-semibold">{userName(doctor)}</td><td className="muted px-6 py-5">{doctor.specialty}</td><td className="px-6 py-5">{doctor.appointments_count}</td><td className="px-6 py-5">{doctor.status}</td></tr>)}</tbody></table></div></SectionCard>
  </div>
}
