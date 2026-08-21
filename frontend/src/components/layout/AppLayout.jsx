import {
  CalendarDays, ChartNoAxesCombined, CircleUserRound, ClipboardPlus, LayoutDashboard,
  LogOut, Menu, Moon, Settings, Stethoscope, Sun, Users, X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { cn } from '../../utils/cn'
import { Avatar } from '../ui/Avatar'
import { AdminApprovalsModal } from './AdminApprovalsModal'
import { GlobalSearch } from './GlobalSearch'
import { NotificationMenu } from './NotificationMenu'

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

function Sidebar({ navItems, role, onNavigate, onLogout, isLoggingOut }) {
  return <>
    <Brand role={role} />
    <nav className="mt-10 space-y-1.5" aria-label="Navigation principale">
      {navItems.map((item) => <NavLink key={item.path} to={item.path} end={item.path === `/${role}`} onClick={onNavigate} className={({ isActive }) => cn('flex min-h-12 items-center gap-3 rounded-xl px-4 text-sm font-semibold text-slate-300 transition duration-150 hover:bg-white/8 hover:text-white', isActive && 'bg-blue-600 text-white shadow-sm shadow-blue-950/20')}><item.icon size={20} />{item.label}</NavLink>)}
    </nav>
    <button type="button" onClick={onLogout} disabled={isLoggingOut} className="mt-auto flex min-h-12 items-center gap-3 rounded-xl px-4 text-sm font-semibold text-slate-300 transition hover:bg-white/8 hover:text-white disabled:opacity-60"><LogOut size={20} />{isLoggingOut ? 'Déconnexion...' : 'Se déconnecter'}</button>
  </>
}

function UserMenu({ user, role, onLogout, isLoggingOut }) {
  const rootRef = useRef(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function close(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    function closeWithEscape(event) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', closeWithEscape)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', closeWithEscape)
    }
  }, [])

  return <div ref={rootRef} className="relative">
    <button type="button" onClick={() => setOpen((current) => !current)} className="rounded-full" aria-label="Ouvrir le menu utilisateur" aria-expanded={open}><Avatar name={user?.name} /></button>
    {open ? <div className="panel absolute right-0 top-[calc(100%+.65rem)] z-50 w-60 p-2 shadow-xl">
      <div className="border-b px-3 py-2" style={{ borderColor: 'var(--border)' }}><p className="truncate text-sm font-bold">{user?.name}</p><p className="muted truncate text-xs">{user?.email}</p></div>
      <Link to={`/${role}/profile`} onClick={() => setOpen(false)} className="table-row mt-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold"><CircleUserRound size={18} />Mon profil</Link>
      <button type="button" onClick={() => { setOpen(false); onLogout() }} disabled={isLoggingOut} className="table-row flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-red-600 disabled:opacity-60"><LogOut size={18} />{isLoggingOut ? 'Déconnexion...' : 'Se déconnecter'}</button>
    </div> : null}
  </div>
}

export function AppLayout({ role }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [adminSettingsOpen, setAdminSettingsOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
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

  async function handleLogout() {
    if (isLoggingOut) return
    setIsLoggingOut(true)
    try {
      await logout()
    } catch {
      // La session locale est supprimée par le contexte même si le serveur est indisponible.
    } finally {
      navigate('/')
    }
  }

  return <div className="min-h-screen bg-[var(--background)] lg:grid lg:grid-cols-[256px_1fr]">
    <aside className="sticky top-0 hidden h-screen border-r border-white/5 bg-[var(--navy)] px-5 py-7 text-white lg:flex lg:flex-col"><Sidebar navItems={navItems} role={role} onLogout={handleLogout} isLoggingOut={isLoggingOut} /></aside>
    {isMobileMenuOpen ? <div className="fixed inset-0 z-40 bg-slate-950/55 lg:hidden" onMouseDown={(event) => event.target === event.currentTarget && setIsMobileMenuOpen(false)}><aside className="relative flex h-full w-80 max-w-[86vw] flex-col bg-[var(--navy)] px-5 py-7 text-white shadow-2xl"><button type="button" onClick={() => setIsMobileMenuOpen(false)} className="absolute right-4 top-4 rounded-lg p-2 text-slate-300 hover:bg-white/10" aria-label="Fermer le menu"><X /></button><Sidebar navItems={navItems} role={role} onNavigate={() => setIsMobileMenuOpen(false)} onLogout={handleLogout} isLoggingOut={isLoggingOut} /></aside></div> : null}

    <div className="min-w-0">
      <header className="sticky top-0 z-30 flex h-[76px] items-center gap-3 border-b px-4 backdrop-blur-xl sm:px-5 lg:px-8" style={{ background: 'color-mix(in srgb, var(--surface) 94%, transparent)', borderColor: 'var(--border)' }}>
        <button type="button" onClick={() => setIsMobileMenuOpen(true)} className="icon-button lg:hidden" aria-label="Ouvrir le menu"><Menu /></button>
        <button type="button" onClick={() => navigate(`/${role}`)} className="flex items-center gap-2 font-bold text-blue-700 lg:hidden"><span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-600 text-white">+</span><span className="hidden sm:inline">SmartHôpital</span></button>
        {role !== 'patient' ? <GlobalSearch role={role} /> : <span className="hidden font-bold text-blue-700 md:inline">SmartHôpital</span>}
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <button type="button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="icon-button" aria-label={theme === 'dark' ? 'Activer le mode clair' : 'Activer le mode sombre'}>{theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}</button>
          <NotificationMenu role={role} onOpenAdminSettings={() => setAdminSettingsOpen(true)} />
          {role === 'admin' ? <button type="button" onClick={() => setAdminSettingsOpen(true)} className="icon-button hidden sm:grid" aria-label="Paramètres et demandes d’approbation"><Settings size={20} /></button> : null}
          <span className="mx-2 hidden h-8 w-px bg-[var(--border)] sm:block" />
          <div className="hidden text-right sm:block"><p className="max-w-40 truncate text-sm font-bold">{user?.name}</p><p className="muted text-[10px] font-semibold uppercase tracking-wider">{roleLabels[user?.role] || user?.role}</p></div>
          <UserMenu user={user} role={role} onLogout={handleLogout} isLoggingOut={isLoggingOut} />
        </div>
      </header>
      <main className={cn('mx-auto w-full max-w-[1600px] p-4 sm:p-5 lg:p-8', role === 'patient' && 'pb-28 lg:pb-8')}><Outlet /></main>
      {role === 'patient' ? <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto grid grid-cols-4 border-t px-3 py-2 lg:hidden" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }} aria-label="Navigation patient">{navItems.map((item) => <NavLink key={item.path} to={item.path} end={item.path === '/patient'} className={({ isActive }) => cn('muted flex flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-semibold', isActive && 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300')}><item.icon size={20} />{item.label}</NavLink>)}</nav> : null}
    </div>
    {role === 'admin' && adminSettingsOpen ? <AdminApprovalsModal onClose={() => setAdminSettingsOpen(false)} /> : null}
  </div>
}
