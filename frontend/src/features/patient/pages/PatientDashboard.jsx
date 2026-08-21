import { CalendarDays, ChevronRight, FileText, Plus, ShieldCheck, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Avatar } from '../../../components/ui/Avatar'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { useAuth } from '../../../hooks/useAuth'
import { api } from '../../../services/api'
import { formatDateTime, userName } from '../../../utils/formatters'

const actions = [
  { title: 'Prendre rendez-vous', description: 'Choisir une spécialité et un praticien', path: '/patient/appointments/new', icon: Plus, tone: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300' },
  { title: 'Mes rendez-vous', description: 'Gérer mes consultations passées et futures', path: '/patient/appointments', icon: CalendarDays, tone: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' },
  { title: 'Mon dossier médical', description: 'Diagnostics, traitements et prescriptions', path: '/patient/medical-record', icon: FileText, tone: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300' },
]

export function PatientDashboard() {
  const { user } = useAuth()
  const [dashboard, setDashboard] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => { api.get('/patient/dashboard').then(({ data }) => setDashboard(data)).catch(() => setError('Impossible de charger votre espace patient.')) }, [])
  const next = dashboard?.next_appointment

  return <div className="mx-auto max-w-5xl space-y-7">
    <section className="flex items-center justify-between gap-4"><div><h2 className="page-title">Bonjour, {user?.name}</h2><p className="page-subtitle">Comment vous sentez-vous aujourd’hui ?</p></div><Avatar name={user?.name} size="lg" className="hidden sm:grid" /></section>
    {error ? <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p> : null}
    <section className="panel p-6"><div className="flex items-start justify-between gap-5"><div><p className="eyebrow">Prochain rendez-vous</p>{next ? <><h3 className="mt-3 text-2xl font-bold text-blue-600">{formatDateTime(next.scheduled_at)}</h3><p className="mt-1 font-medium">{userName(next.doctor)} · {next.department?.name}</p><p className="muted mt-1 text-sm">{next.reason || 'Consultation'}</p></> : <><h3 className="mt-3 text-xl font-bold">Aucun rendez-vous à venir</h3><Link to="/patient/appointments/new" className="mt-3 inline-flex font-semibold text-blue-600">Faire une demande</Link></>} </div><span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"><CalendarDays size={26} /></span></div>{next ? <div className="mt-4"><StatusBadge status={next.status} /></div> : null}</section>
    <section className="grid gap-5 md:grid-cols-3">{actions.map((action) => <Link key={action.title} to={action.path} className="panel group flex items-center gap-5 p-6 transition duration-150 hover:-translate-y-0.5 hover:border-blue-300"><span className={`grid h-14 w-14 shrink-0 place-items-center rounded-xl ${action.tone}`}><action.icon size={25} /></span><span className="min-w-0 flex-1"><strong className="block text-lg">{action.title}</strong><span className="muted mt-1 block text-sm">{action.description}</span></span><ChevronRight className="muted transition group-hover:translate-x-1" /></Link>)}</section>
    <section className="grid gap-5 lg:grid-cols-[1.4fr_1fr]"><article className="rounded-2xl bg-gradient-to-r from-cyan-700 to-blue-700 p-6 text-white shadow-lg"><ShieldCheck size={28} /><h3 className="mt-5 text-xl font-bold">Votre suivi au même endroit</h3><p className="mt-2 max-w-xl text-blue-50">Retrouvez uniquement les informations enregistrées par votre équipe soignante.</p></article><article className="panel p-6"><p className="eyebrow">Notifications récentes</p><div className="mt-4 space-y-3">{dashboard?.notifications?.length ? dashboard.notifications.slice(0, 3).map((item) => <div key={item.id} className="border-l-2 border-blue-500 pl-3"><p className="font-semibold">{item.title}</p><p className="muted line-clamp-2 text-sm">{item.message}</p></div>) : <p className="muted text-sm">Aucune notification.</p>}</div></article></section>
    <Link to="/patient/profile" className="muted flex items-center justify-center gap-2 py-2 text-sm font-semibold"><User size={17} />Mettre à jour mon profil</Link>
  </div>
}
