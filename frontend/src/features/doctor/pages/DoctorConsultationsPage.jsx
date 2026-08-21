import { FlaskConical, Image, Plus, Save, Stethoscope } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ActionNotice } from '../../../components/ui/ActionNotice'
import { Avatar } from '../../../components/ui/Avatar'
import { Button } from '../../../components/ui/Button'
import { PageHeader } from '../../../components/ui/PageHeader'
import { SectionCard } from '../../../components/ui/SectionCard'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { useActionNotice } from '../../../hooks/useActionNotice'
import { useResource } from '../../../hooks/useResource'
import { resourceService } from '../../../services/resourceService'
import { apiError, formatDateTime, userName } from '../../../utils/formatters'

const emptyForm = { patient_id: '', diagnosis: '', allergies: '', treatments: '', notes: '' }

export function DoctorConsultationsPage() {
  const { items: consultations, refetch } = useResource('medical-records', { per_page: 50 })
  const { items: patients } = useResource('patients', { per_page: 100 })
  const { items: appointments } = useResource('appointments', { per_page: 20 })
  const [form, setForm] = useState(emptyForm)
  const [isSaving, setIsSaving] = useState(false)
  const { message, notify, clear } = useActionNotice()
  const selectedPatient = useMemo(() => patients.find((patient) => String(patient.id) === String(form.patient_id)), [form.patient_id, patients])

  function selectPatient(patientId) { setForm((current) => ({ ...current, patient_id: String(patientId) })) }
  async function save(event) { event.preventDefault(); setIsSaving(true); try { await resourceService.create('medical-records', form); setForm(emptyForm); await refetch(); notify('Consultation enregistrée.') } catch (requestError) { notify(apiError(requestError, 'Impossible de créer la consultation.')) } finally { setIsSaving(false) } }

  return <div className="page-stack">
    <ActionNotice message={message} onClose={clear} />
    <PageHeader title="Consultations du jour" description="Suivez l’activité clinique et documentez le dossier de chaque patient." actions={<Button onClick={() => document.getElementById('diagnostic')?.focus()}><Plus size={18} />Nouvelle consultation</Button>} />
    <section className="grid gap-6 xl:grid-cols-[1.35fr_.9fr]">
      <SectionCard title="File d’attente" action={<span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">{appointments.length} patient(s)</span>}><div>{appointments.length ? appointments.slice(0, 6).map((item) => <button type="button" onClick={() => selectPatient(item.patient_id)} key={item.id} className="table-row grid w-full grid-cols-[1fr_auto] items-center gap-3 border-t p-5 text-left first:border-t-0 sm:grid-cols-[1fr_110px_120px_auto]"><div className="flex items-center gap-3"><Avatar name={userName(item.patient)} /><div><p className="font-semibold">{userName(item.patient)}</p><p className="muted text-xs">ID: #{item.patient_id}</p></div></div><time className="hidden text-sm sm:block">{formatDateTime(item.scheduled_at)}</time><span className="hidden sm:block"><StatusBadge status={item.status} /></span><span className="font-semibold text-blue-600">Ouvrir</span></button>) : <p className="muted p-6">Aucun rendez-vous dans la file.</p>}</div></SectionCard>
      <SectionCard title="Dossier sélectionné" bodyClassName="p-6">{selectedPatient ? <div><div className="flex items-center gap-4"><Avatar name={userName(selectedPatient)} size="lg" /><div><h3 className="text-xl font-bold">{userName(selectedPatient)}</h3><p className="muted">{selectedPatient.birth_date || 'Date de naissance non renseignée'} · Groupe {selectedPatient.blood_group || '—'}</p></div></div><div className="mt-6 grid grid-cols-2 gap-3"><div className="panel-muted rounded-xl border p-4"><p className="eyebrow">Téléphone</p><p className="mt-2 font-semibold">{selectedPatient.user?.phone || '—'}</p></div><div className="panel-muted rounded-xl border p-4"><p className="eyebrow">Dossiers</p><p className="mt-2 font-semibold">{selectedPatient.medical_records?.length ?? selectedPatient.medicalRecords?.length ?? 0}</p></div></div></div> : <div className="py-10 text-center"><Stethoscope className="mx-auto text-blue-500" size={34} /><p className="muted mt-3">Sélectionnez un patient dans la file ou le formulaire.</p></div>}</SectionCard>
    </section>
    <form onSubmit={save} className="panel grid gap-6 p-5 lg:grid-cols-[1fr_320px] sm:p-6"><div><label className="field-label">Patient<select required value={form.patient_id} onChange={(event) => selectPatient(event.target.value)} className="field"><option value="">Choisir un patient</option>{patients.map((patient) => <option key={patient.id} value={patient.id}>{userName(patient)}</option>)}</select></label><label className="field-label mt-5">Zone diagnostic<textarea id="diagnostic" value={form.diagnosis} onChange={(event) => setForm({ ...form, diagnosis: event.target.value })} className="field min-h-44 resize-y" placeholder="Observations cliniques, symptômes et hypothèses diagnostiques..." /></label><div className="mt-4 grid gap-4 sm:grid-cols-3"><label className="field-label">Allergies<textarea value={form.allergies} onChange={(event) => setForm({ ...form, allergies: event.target.value })} className="field min-h-24" /></label><label className="field-label">Traitements<textarea value={form.treatments} onChange={(event) => setForm({ ...form, treatments: event.target.value })} className="field min-h-24" /></label><label className="field-label">Notes<textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className="field min-h-24" /></label></div></div><aside className="panel-muted rounded-2xl border p-5"><h3 className="font-bold text-blue-600">Actions rapides</h3><button disabled type="button" className="field mt-4 flex items-center gap-3 text-left opacity-60"><FlaskConical size={20} className="text-blue-600" />Laboratoire <span className="muted ml-auto text-xs">Indisponible</span></button><button disabled type="button" className="field mt-3 flex items-center gap-3 text-left opacity-60"><Image size={20} className="text-blue-600" />Imagerie <span className="muted ml-auto text-xs">Indisponible</span></button><Button type="submit" disabled={isSaving || !form.patient_id} className="mt-6 w-full"><Save size={18} />{isSaving ? 'Enregistrement...' : 'Enregistrer le dossier'}</Button></aside></form>
    <SectionCard title="Consultations récentes"><div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">{consultations.length ? consultations.slice(0, 6).map((record) => <article key={record.id} className="panel-muted rounded-xl border p-4"><div className="flex items-center gap-3"><Avatar name={userName(record.patient)} /><strong>{userName(record.patient)}</strong></div><p className="muted mt-3 line-clamp-2 text-sm">{record.diagnosis || 'Diagnostic non renseigné'}</p></article>) : <p className="muted">Aucune consultation.</p>}</div></SectionCard>
  </div>
}
