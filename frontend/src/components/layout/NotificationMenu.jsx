import { Bell, CheckCheck, Circle, LoaderCircle } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../services/api'
import { unreadCountFrom } from '../../utils/apiContracts'
import { apiError, formatDateTime } from '../../utils/formatters'

const typeLabels = {
  appointment_created: 'Rendez-vous',
  appointment_updated: 'Rendez-vous',
  laboratory_order_created: 'Laboratoire',
  imaging_order_created: 'Imagerie',
  profile_change_requested: 'Profil',
  profile_change_approved: 'Profil',
  profile_change_rejected: 'Profil',
  info: 'Information',
}

export function NotificationMenu({ role, onOpenAdminSettings }) {
  const navigate = useNavigate()
  const rootRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [workingId, setWorkingId] = useState(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const [list, unread] = await Promise.all([
        api.get('/notifications', { params: { per_page: 10 } }),
        api.get('/notifications/unread'),
      ])
      setNotifications(list.data?.data ?? [])
      setUnreadCount(unreadCountFrom(unread.data, list.data))
      setError('')
    } catch (requestError) {
      setError(apiError(requestError, 'Impossible de charger les notifications.'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    Promise.all([
      api.get('/notifications', { params: { per_page: 10 } }),
      api.get('/notifications/unread'),
    ]).then(([list, unread]) => {
      if (!active) return
      setNotifications(list.data?.data ?? [])
      setUnreadCount(unreadCountFrom(unread.data, list.data))
      setError('')
    }).catch((requestError) => {
      if (active) setError(apiError(requestError, 'Impossible de charger les notifications.'))
    }).finally(() => {
      if (active) setIsLoading(false)
    })
    return () => { active = false }
  }, [])

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

  async function markRead(notification) {
    if (notification.read_at) return
    setWorkingId(notification.id)
    try {
      const { data } = await api.patch(`/notifications/${notification.id}/read`)
      setNotifications((current) => current.map((item) => item.id === notification.id ? data.notification : item))
      setUnreadCount((current) => Math.max(0, current - 1))
    } catch (requestError) {
      setError(apiError(requestError, 'Impossible de marquer la notification comme lue.'))
      throw requestError
    } finally {
      setWorkingId(null)
    }
  }

  async function openNotification(notification) {
    try {
      await markRead(notification)
    } catch {
      return
    }
    setOpen(false)
    if (notification.type === 'profile_change_requested' && role === 'admin') {
      onOpenAdminSettings()
      return
    }
    if (notification.type?.startsWith('appointment_')) {
      navigate(`/${role}/appointments`)
      return
    }
    if (notification.type === 'laboratory_order_created' || notification.type === 'imaging_order_created') {
      navigate(role === 'patient' ? '/patient/medical-record' : '/doctor/consultations')
      return
    }
    if (notification.type?.startsWith('profile_')) navigate(`/${role}/profile`)
  }

  async function markAllRead() {
    setWorkingId('all')
    setError('')
    try {
      await api.patch('/notifications/read-all')
      setNotifications((current) => current.map((item) => ({ ...item, read_at: item.read_at || new Date().toISOString() })))
      setUnreadCount(0)
    } catch (requestError) {
      setError(apiError(requestError, 'Impossible de marquer toutes les notifications comme lues.'))
    } finally {
      setWorkingId(null)
    }
  }

  return <div ref={rootRef} className="relative">
    <button type="button" onClick={() => { setOpen((current) => !current); if (!open) load() }} className="icon-button relative" aria-label={`Notifications${unreadCount ? `, ${unreadCount} non lue${unreadCount > 1 ? 's' : ''}` : ''}`} aria-expanded={open}>
      <Bell size={20} />
      {unreadCount ? <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">{unreadCount > 99 ? '99+' : unreadCount}</span> : null}
    </button>
    {open ? <section className="panel absolute right-0 top-[calc(100%+.65rem)] z-50 w-[min(92vw,420px)] overflow-hidden shadow-2xl" aria-label="Notifications récentes">
      <header className="flex items-center justify-between gap-3 border-b p-4" style={{ borderColor: 'var(--border)' }}><div><h2 className="font-bold">Notifications</h2><p className="muted text-xs">{unreadCount} non lue{unreadCount > 1 ? 's' : ''}</p></div><button type="button" onClick={markAllRead} disabled={!unreadCount || workingId === 'all'} className="inline-flex items-center gap-2 text-xs font-semibold text-blue-600 disabled:opacity-50">{workingId === 'all' ? <LoaderCircle size={15} className="animate-spin" /> : <CheckCheck size={15} />}Tout marquer comme lu</button></header>
      {error ? <p role="alert" className="m-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      <div className="max-h-[420px] overflow-y-auto">{isLoading ? <p className="muted p-5">Chargement...</p> : notifications.length ? notifications.map((notification) => <button type="button" key={notification.id} onClick={() => openNotification(notification)} disabled={workingId === notification.id} className="table-row flex w-full gap-3 border-t p-4 text-left first:border-t-0 disabled:opacity-60">
        <span className="mt-1">{workingId === notification.id ? <LoaderCircle size={16} className="animate-spin text-blue-600" /> : <Circle size={12} className={notification.read_at ? 'text-slate-300' : 'fill-blue-600 text-blue-600'} />}</span>
        <span className="min-w-0 flex-1"><span className="flex items-start justify-between gap-3"><strong className="text-sm">{notification.title}</strong><span className="muted shrink-0 text-[10px]">{typeLabels[notification.type] || notification.type}</span></span><span className="muted mt-1 block text-sm">{notification.message}</span><time className="muted mt-2 block text-[11px]">{formatDateTime(notification.created_at)}</time></span>
      </button>) : <p className="muted p-6 text-center text-sm">Aucune notification.</p>}</div>
    </section> : null}
  </div>
}
