export function PageHeader({ title, description, actions }) {
  return <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
    <div><h2 className="page-title">{title}</h2>{description ? <p className="page-subtitle">{description}</p> : null}</div>
    {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
  </section>
}
