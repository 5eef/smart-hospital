import { ClipboardList, FileText, FlaskConical, Image, Pill, Stethoscope } from 'lucide-react'
import { Avatar } from '../../../components/ui/Avatar'
import { PageHeader } from '../../../components/ui/PageHeader'
import { SectionCard } from '../../../components/ui/SectionCard'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { useResource } from '../../../hooks/useResource'
import { formatDateTime, userName } from '../../../utils/formatters'

const orderTypeLabels = { laboratory: 'Laboratoire', imaging: 'Imagerie' }

export function PatientMedicalRecordPage() {
  const { items: records, isLoading, error } = useResource('medical-records', { per_page: 50 })
  const { items: clinicalOrders, isLoading: ordersLoading, error: ordersError } = useResource('clinical-orders', { per_page: 50 })

  return <div className="mx-auto max-w-6xl page-stack">
    <PageHeader title="Mon dossier médical" description="Diagnostics, traitements, prescriptions et examens demandés par votre équipe soignante." />
    {error || ordersError ? <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">Impossible de charger tout ou partie de votre dossier.</p> : null}
    <SectionCard title="Demandes de laboratoire et d’imagerie" description="Suivez les examens demandés et consultez les résultats transmis.">
      <div>{ordersLoading ? <p className="muted p-6">Chargement...</p> : clinicalOrders.length ? clinicalOrders.map((order) => <article key={order.id} className="table-row grid gap-4 border-t p-5 first:border-t-0 md:grid-cols-[1fr_1fr_auto] md:items-center">
        <div className="flex items-center gap-3">{order.type === 'laboratory' ? <FlaskConical className="text-blue-600" size={21} /> : <Image className="text-violet-600" size={21} />}<div><strong>{order.exam_name}</strong><p className="muted text-xs">{orderTypeLabels[order.type]} · Dr {userName(order.doctor)}</p></div></div>
        <div><p className="text-sm font-semibold">{order.priority === 'urgent' ? 'Priorité urgente' : 'Priorité normale'}</p><time className="muted text-xs">Demandé le {formatDateTime(order.ordered_at)}</time></div>
        <StatusBadge status={order.status} />
        {order.instructions ? <p className="muted rounded-xl bg-[var(--surface-muted)] p-3 text-sm md:col-span-3"><strong className="text-[var(--text)]">Instructions : </strong>{order.instructions}</p> : null}
        {order.result ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 md:col-span-3 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300"><strong>Résultat : </strong>{order.result}</p> : null}
      </article>) : <p className="muted p-6">Aucune demande de laboratoire ou d’imagerie.</p>}</div>
    </SectionCard>
    {isLoading ? <p className="muted">Chargement...</p> : records.length ? <section className="space-y-5">{records.map((record) => <article key={record.id} className="panel overflow-hidden">
      <header className="flex items-center gap-3 border-b p-5" style={{ borderColor: 'var(--border)' }}><Avatar name={userName(record.doctor)} /><div><h3 className="font-bold">{userName(record.doctor)}</h3><p className="muted text-xs">Entrée de dossier #{record.id}</p></div></header>
      <div className="grid gap-5 p-5 md:grid-cols-2"><div className="panel-muted rounded-xl border p-4"><h4 className="flex items-center gap-2 font-bold"><Stethoscope className="text-blue-600" size={18} />Diagnostic</h4><p className="muted mt-2 whitespace-pre-wrap text-sm">{record.diagnosis || 'Non renseigné'}</p></div><div className="panel-muted rounded-xl border p-4"><h4 className="flex items-center gap-2 font-bold"><ClipboardList className="text-amber-600" size={18} />Allergies</h4><p className="muted mt-2 whitespace-pre-wrap text-sm">{record.allergies || 'Aucune allergie renseignée'}</p></div><div className="panel-muted rounded-xl border p-4"><h4 className="flex items-center gap-2 font-bold"><FileText className="text-emerald-600" size={18} />Traitements</h4><p className="muted mt-2 whitespace-pre-wrap text-sm">{record.treatments || 'Non renseigné'}</p></div><div className="panel-muted rounded-xl border p-4"><h4 className="font-bold">Notes</h4><p className="muted mt-2 whitespace-pre-wrap text-sm">{record.notes || 'Aucune note'}</p></div></div>
      {record.prescriptions?.length ? <div className="border-t p-5" style={{ borderColor: 'var(--border)' }}><h4 className="flex items-center gap-2 font-bold"><Pill className="text-violet-600" size={18} />Prescriptions</h4><div className="mt-3 grid gap-3 sm:grid-cols-2">{record.prescriptions.map((item) => <div key={item.id} className="panel-muted rounded-xl border p-4"><strong>{item.medication}</strong><p className="mt-1 text-sm">{item.dosage}</p><p className="muted mt-1 text-sm">{item.instructions}</p></div>)}</div></div> : null}
    </article>)}</section> : <SectionCard bodyClassName="p-10 text-center"><FileText className="mx-auto text-blue-500" size={36} /><h3 className="mt-4 text-lg font-bold">Aucun dossier médical disponible</h3><p className="muted mt-2">Votre dossier apparaîtra ici après son enregistrement par un médecin.</p></SectionCard>}
  </div>
}
