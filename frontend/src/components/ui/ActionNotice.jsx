import { CircleCheck, X } from 'lucide-react'

export function ActionNotice({ message, onClose }) {
  if (!message) return null
  return <div className="panel fixed bottom-5 left-1/2 z-[60] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 p-4" role="status"><div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-600 text-white"><CircleCheck size={19} /></span><p className="flex-1 text-sm font-medium">{message}</p><button type="button" onClick={onClose} className="icon-button -m-1 h-8 w-8" aria-label="Fermer"><X size={17} /></button></div></div>
}
