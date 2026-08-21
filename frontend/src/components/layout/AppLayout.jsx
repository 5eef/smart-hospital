import {
  Bell, CalendarDays, ChartNoAxesCombined, ClipboardPlus, LayoutDashboard,
  LogOut, Menu, Moon, Search, Settings, Stethoscope, Sun, Users, X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { cn } from '../../utils/cn'
import { Avatar } from '../ui/Avatar'

const navByRole = {
  admin: [
    { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { label: 'Gérer Médecins', path: '/admin/doctors', icon: ClipboardPlus },
    { label: 'Gérer Patients', path: '/admin/patients', icon: Users },
    { label: 'Spécialités', path: '/admin/specialties', icon: Stethoscope },
    { label: 'Rendez-vous', path: '/admin/appointments', icon: CalendarDays },
    { label: 'Statistiques', path: '/admin/statistics', icon: ChartNoAxesCombined },
  ],
  doctor: [
    { label: 'Dashboard', path: '/doctor', icon: LayoutDashboard },
    { label: 'Consultations', path: '/doctor/consultations', icon: Stethoscope },
    { label: 'Rendez-vous', path: '/doctor/appointments', icon: CalendarDays },
    { label: 'Patients', path: '/doctor/patients', icon: Users },
  ],
  patient: [
    { label: 'Accueil', path: '/patient', icon: LayoutDashboard },
    { label: 'RDV', path: '/patient/appointments', icon: CalendarDays },
    { label: 'Dossier', path: '/patient/medical-record', icon: Stethoscope },
    { label: 'Profil', path: '/patient/profile', icon: Users },
  ],
}

const roleLabels = { admin: 'Administrateur', doctor: 'Médecin', patient: 'Patient' }
const portalLabels = { admin: 'ADMIN PORTAL', doctor: 'CLINICAL PORTAL', patient: 'PATIENT PORTAL' }

function Brand({ role }) {
  return <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-blue-600 text-2xl font-semibold text-white shadow-lg shadow-blue-950/20">+</span><div><h1 className="text-xl font-bold">SmartHôpital</h1><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-200/70">{portalLabels[role]}</p></div></div>
}

function Sidebar({ navItems, role, onNavigate, onLogout }) {
  return <>
    <Brand role={role} />
    <nav className="mt-10 space-y-1.5" aria-label="Navigation principale">
      {navItems.map((item) => <NavLink key={item.path} to={item.path} end={item.path === `/${role}`} onClick={onNavigate} className={({ isActive }) => cn('flex min-h-12 items-center gap-3 rounded-xl px-4 text-sm font-semibold text-slate-300 transition duration-150 hover:bg-white/8 hover:text-white', isActive && 'bg-blue-600 text-white shadow-sm shadow-blue-950/20')}><item.icon size={20} />{item.label}</NavLink>)}
    </nav>
    <button type="button" onClick={onLogout} className="mt-auto flex min-h-12 items-center gap-3 rounded-xl px-4 text-sm font-semibold text-slate-300 transition hover:bg-white/8 hover:text-white"><LogOut size={20} />Se déconnecter</button>
  </>
}

export function AppLayout({ role }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [theme, setTheme] = useState(() => localStorage.getItem('smartHospitalTheme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'))
  const navItems = navByRole[role] ?? []

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('smartHospitalTheme', theme)
  }, [theme])

  useEffect(() => {
    if (!isMobileMenuOpen) return undefined
    const close = (event) => event.key === 'Escape' && setIsMobileMenuOpen(false)
    document.addEventListener('keydown', close)
    return () => document.removeEventListener('keydown', close)
  }, [isMobileMenuOpen])

  async function handleLogout() { await logout(); navigate('/') }

  return <div className="min-h-screen bg-[var(--background)] lg:grid lg:grid-cols-[256px_1fr]">
    <aside className="sticky top-0 hidden h-screen border-r border-white/5 bg-[var(--navy)] px-5 py-7 text-white lg:flex lg:flex-col"><Sidebar navItems={navItems} role={role} onLogout={handleLogout} /></aside>
    {isMobileMenuOpen ? <div className="fixed inset-0 z-40 bg-slate-950/55 lg:hidden" onMouseDown={(event) => event.target === event.currentTarget && setIsMobileMenuOpen(false)}><aside className="relative flex h-full w-80 max-w-[86vw] flex-col bg-[var(--navy)] px-5 py-7 text-white shadow-2xl"><button type="button" onClick={() => setIsMobileMenuOpen(false)} className="absolute right-4 top-4 rounded-lg p-2 text-slate-300 hover:bg-white/10" aria-label="Fermer le menu"><X /></button><Sidebar navItems={navItems} role={role} onNavigate={() => setIsMobileMenuOpen(false)} onLogout={handleLogout} /></aside></div> : null}

    <div className="min-w-0">
      <header className="sticky top-0 z-30 flex h-[76px] items-center gap-3 border-b px-4 backdrop-blur-xl sm:px-5 lg:px-8" style={{ background: 'color-mix(in srgb, var(--surface) 94%, transparent)', borderColor: 'var(--border)' }}>
        <button type="button" onClick={() => setIsMobileMenuOpen(true)} className="icon-button lg:hidden" aria-label="Ouvrir le menu"><Menu /></button>
        <button type="button" onClick={() => navigate(`/${role}`)} className="flex items-center gap-2 font-bold text-blue-700 lg:hidden"><span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-600 text-white">+</span><span className="hidden sm:inline">SmartHôpital</span></button>
        {role !== 'patient' ? <label className="field hidden max-w-lg items-center gap-2 py-2 md:flex"><Search size={18} className="text-slate-400" /><input aria-label="Recherche globale" className="w-full bg-transparent outline-none" placeholder="Rechercher un dossier, médecin..." /></label> : <span className="hidden font-bold text-blue-700 md:inline">SmartHôpital</span>}
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <button type="button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="icon-button" aria-label={theme === 'dark' ? 'Activer le mode clair' : 'Activer le mode sombre'}>{theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}</button>
          <button type="button" className="icon-button" aria-label="Notifications"><Bell size={20} /></button>
          {role === 'admin' ? <button type="button" className="icon-button hidden sm:grid" aria-label="Paramètres"><Settings size={20} /></button> : null}
          <span className="mx-2 hidden h-8 w-px bg-[var(--border)] sm:block" />
          <div className="hidden text-right sm:block"><p className="max-w-40 truncate text-sm font-bold">{user?.name}</p><p className="muted text-[10px] font-semibold uppercase tracking-wider">{roleLabels[user?.role] || user?.role}</p></div>
          <Avatar name={user?.name} />
        </div>
      </header>
      <main className={cn('mx-auto w-full max-w-[1600px] p-4 sm:p-5 lg:p-8', role === 'patient' && 'pb-28 lg:pb-8')}><Outlet /></main>
      {role === 'patient' ? <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto grid grid-cols-4 border-t px-3 py-2 lg:hidden" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }} aria-label="Navigation patient">{navItems.map((item) => <NavLink key={item.path} to={item.path} end={item.path === '/patient'} className={({ isActive }) => cn('muted flex flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-semibold', isActive && 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300')}><item.icon size={20} />{item.label}</NavLink>)}</nav> : null}
    </div>
  </div>
}
