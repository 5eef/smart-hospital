import { cn } from '../../utils/cn'

export function SectionCard({ title, description, action, children, className, bodyClassName }) {
  return <section className={cn('panel overflow-hidden', className)}>
    {(title || action) ? <header className="flex flex-wrap items-start justify-between gap-3 border-b px-5 py-5 sm:px-6" style={{ borderColor: 'var(--border)' }}><div>{title ? <h3 className="text-xl font-bold">{title}</h3> : null}{description ? <p className="muted mt-1 text-sm">{description}</p> : null}</div>{action}</header> : null}
    <div className={bodyClassName}>{children}</div>
  </section>
}
