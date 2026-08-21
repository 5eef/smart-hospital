import { cn } from '../../utils/cn'

const palette = ['bg-blue-100 text-blue-700', 'bg-emerald-100 text-emerald-700', 'bg-violet-100 text-violet-700', 'bg-amber-100 text-amber-800', 'bg-rose-100 text-rose-700']

function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '?'
}

export function Avatar({ name, size = 'md', className }) {
  const index = [...(name || '')].reduce((sum, char) => sum + char.charCodeAt(0), 0) % palette.length
  const sizes = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-14 w-14 text-base' }
  return <span aria-hidden="true" className={cn('inline-grid shrink-0 place-items-center rounded-full font-bold ring-2 ring-white/80 dark:ring-slate-900/60', palette[index], sizes[size], className)}>{initials(name)}</span>
}
