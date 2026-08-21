import { cn } from '../../utils/cn'

const tones = { blue: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300', violet: 'bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300', amber: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300', emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300', rose: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300' }

export function StatCard({ label, value, change, icon: Icon, tone = 'blue', hint }) {
  return <article className="panel p-5 sm:p-6">
    <div className="flex items-start justify-between gap-3"><span className={cn('grid h-12 w-12 place-items-center rounded-xl', tones[tone])}><Icon size={22} /></span>{change ? <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">{change}</span> : null}</div>
    <p className="eyebrow mt-6">{label}</p><strong className="mt-1 block text-3xl font-bold">{value}</strong>{hint ? <p className="muted mt-2 text-sm">{hint}</p> : null}
  </article>
}
