import { X } from 'lucide-react'
import { useEffect } from 'react'

export function Modal({ open, title, description, onClose, children, size = '2xl' }) {
  useEffect(() => {
    if (!open) return undefined
    const close = (event) => event.key === 'Escape' && onClose()
    document.addEventListener('keydown', close)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', close); document.body.style.overflow = '' }
  }, [onClose, open])

  if (!open) return null
  const widths = { xl: 'max-w-xl', '2xl': 'max-w-2xl', '3xl': 'max-w-3xl' }
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-3 backdrop-blur-[2px]" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section role="dialog" aria-modal="true" aria-labelledby="modal-title" className={`panel max-h-[94vh] w-full ${widths[size]} overflow-hidden`}>
      <header className="flex items-start justify-between gap-4 border-b p-5 sm:p-6" style={{ borderColor: 'var(--border)' }}>
        <div><h2 id="modal-title" className="text-xl font-bold">{title}</h2>{description ? <p className="muted mt-1 text-sm">{description}</p> : null}</div>
        <button type="button" onClick={onClose} className="icon-button" aria-label="Fermer"><X size={20} /></button>
      </header>
      <div className="max-h-[calc(94vh-88px)] overflow-y-auto p-5 sm:p-6">{children}</div>
    </section>
  </div>
}
