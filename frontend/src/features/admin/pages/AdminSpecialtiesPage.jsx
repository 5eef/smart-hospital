import { Activity, Bone, Brain, HeartPulse, Pencil, Plus, Save, Sparkles, Stethoscope, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import cardiology from '../../../assets/specialties/cardiology.webp'
import pediatrics from '../../../assets/specialties/pediatrics.webp'
import neurology from '../../../assets/specialties/neurology.webp'
import oncology from '../../../assets/specialties/oncology.webp'
import orthopedics from '../../../assets/specialties/orthopedics.webp'
import fallback from '../../../assets/specialties/medical-default.webp'
import { ActionNotice } from '../../../components/ui/ActionNotice'
import { Avatar } from '../../../components/ui/Avatar'
import { Button } from '../../../components/ui/Button'
import { ConfirmModal } from '../../../components/ui/ConfirmModal'
import { Modal } from '../../../components/ui/Modal'
import { PageHeader } from '../../../components/ui/PageHeader'
import { useActionNotice } from '../../../hooks/useActionNotice'
import { useResource } from '../../../hooks/useResource'
import { api } from '../../../services/api'
import { resourceService } from '../../../services/resourceService'
import { apiError, userName } from '../../../utils/formatters'

const emptyForm = { name: '', description: '', is_active: true }
const visuals = [
  { keys: ['cardio'], image: cardiology, icon: HeartPulse, tone: 'bg-rose-100 text-rose-700' },
  { keys: ['pédia', 'pedia', 'enfant'], image: pediatrics, icon: Sparkles, tone: 'bg-emerald-100 text-emerald-700' },
  { keys: ['neuro'], image: neurology, icon: Brain, tone: 'bg-violet-100 text-violet-700' },
  { keys: ['onco'], image: oncology, icon: Activity, tone: 'bg-amber-100 text-amber-700' },
  { keys: ['ortho'], image: orthopedics, icon: Bone, tone: 'bg-emerald-100 text-emerald-700' },
]
function visualFor(name = '') { const normalized = name.toLowerCase(); return visuals.find((item) => item.keys.some((key) => normalized.includes(key))) || { image: fallback, icon: Stethoscope, tone: 'bg-blue-100 text-blue-700' } }

export function AdminSpecialtiesPage() {
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [formOpen, setFormOpen] = useState(false)
  const [viewingDepartment, setViewingDepartment] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [stats, setStats] = useState(null)
  const { items: departments, isLoading, error, refetch } = useResource('departments', { per_page: 100 })
  const { items: doctors } = useResource('doctors', { per_page: 100 })
  const { message, notify, clear } = useActionNotice()
  useEffect(() => { api.get('/admin/dashboard').then(({ data }) => setStats(data)).catch(() => setStats(null)) }, [])
  const doctorsByDepartment = useMemo(() => doctors.reduce((acc, doctor) => { (acc[doctor.department_id] ||= []).push(doctor); return acc }, {}), [doctors])

  function openCreate() { setEditing(null); setForm(emptyForm); setFormOpen(true) }
  function edit(department) { setEditing(department.id); setForm({ name: department.name, description: department.description ?? '', is_active: department.is_active }); setFormOpen(true) }
  async function save(event) { event.preventDefault(); if (isSaving) return; setIsSaving(true); try { if (editing) await resourceService.update('departments', editing, form); else await resourceService.create('departments', form); setFormOpen(false); setEditing(null); setForm(emptyForm); await refetch(); notify('Spécialité enregistrée.') } catch (requestError) { notify(apiError(requestError, "Impossible d’enregistrer la spécialité.")) } finally { setIsSaving(false) } }
  async function remove() { if (!pendingDelete || isDeleting) return; setIsDeleting(true); try { await resourceService.remove('departments', pendingDelete.id); await refetch(); setPendingDelete(null); notify('Spécialité supprimée.') } catch (requestError) { notify(apiError(requestError, 'Suppression impossible si des médecins ou rendez-vous y sont liés.')) } finally { setIsDeleting(false) } }

  return <div className="page-stack">
    <ActionNotice message={message} onClose={clear} />
    <PageHeader title="Spécialités Médicales" description="Gérez les départements, domaines cliniques et équipes médicales." actions={<Button onClick={openCreate}><Plus size={19} />Ajouter une spécialité</Button>} />
    <section className="grid gap-5 lg:grid-cols-[1fr_1fr_2fr]"><article className="panel p-5"><p className="eyebrow">Total spécialités</p><strong className="mt-3 block text-4xl text-blue-600">{departments.length}</strong><p className="muted mt-2 text-sm">Départements enregistrés</p></article><article className="panel p-5"><p className="eyebrow">Médecins actifs</p><strong className="mt-3 block text-4xl">{stats?.active_doctors ?? '—'}</strong><p className="muted mt-2 text-sm">Sur {stats?.total_doctors ?? '—'} médecins</p></article><article className="rounded-2xl bg-gradient-to-r from-blue-700 to-blue-600 p-5 text-white shadow-lg shadow-blue-900/15"><p className="text-xs font-semibold uppercase tracking-widest text-blue-100">Couverture des unités</p><strong className="mt-3 block text-3xl">{departments.filter((item) => item.is_active).length} spécialités actives</strong><p className="mt-2 text-blue-100">Aucune métrique clinique fictive n’est utilisée.</p></article></section>
    {error ? <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{apiError(error, 'Impossible de charger les spécialités.')}</p> : null}
    <section className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">{isLoading ? <p className="muted">Chargement...</p> : departments.map((department) => { const visual = visualFor(department.name); const Icon = visual.icon; const members = doctorsByDepartment[department.id] || []; return <article key={department.id} className="panel overflow-hidden"><div className="relative h-40 bg-cover bg-center p-5" style={{ backgroundImage: `linear-gradient(to bottom, rgb(255 255 255 / .08), var(--surface)), url(${visual.image})` }}><div className="absolute inset-x-0 bottom-4 flex items-center gap-3 px-5"><span className={`grid h-12 w-12 place-items-center rounded-xl ${visual.tone}`}><Icon size={23} /></span><h3 className="text-2xl font-bold">{department.name}</h3></div></div><div className="px-5 pb-5"><p className="muted min-h-12 text-sm leading-6">{department.description || 'Aucune description renseignée.'}</p><div className="mt-5 flex items-center justify-between border-t pt-4" style={{ borderColor: 'var(--border)' }}><div className="flex -space-x-2">{members.slice(0, 3).map((doctor) => <Avatar key={doctor.id} name={userName(doctor)} size="sm" />)}{members.length > 3 ? <span className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">+{members.length - 3}</span> : null}</div><button type="button" onClick={() => setViewingDepartment(department)} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300" aria-label={`Voir les médecins de ${department.name}`}>{members.length} médecin{members.length > 1 ? 's' : ''}</button></div><div className="mt-4 grid grid-cols-2 gap-3"><Button variant="secondary" onClick={() => edit(department)} disabled={isDeleting}><Pencil size={17} />Modifier</Button><Button variant="ghost" onClick={() => setPendingDelete(department)} disabled={isDeleting} className="text-red-600"><Trash2 size={17} />Supprimer</Button></div></div></article> })}
      <button type="button" onClick={openCreate} className="panel grid min-h-80 place-items-center border-2 border-dashed bg-transparent text-center transition hover:border-blue-400 hover:bg-blue-50/40 dark:hover:bg-blue-950/20"><span><Plus className="mx-auto text-blue-600" size={34} /><strong className="mt-4 block text-lg">Créer une nouvelle spécialité</strong><span className="muted mt-1 block text-sm">Ajouter un département médical</span></span></button>
    </section>
    <section className="panel overflow-hidden"><div className="border-b px-6 py-5" style={{ borderColor: 'var(--border)' }}><h3 className="text-xl font-bold">Vue d’ensemble des unités</h3></div><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left"><thead className="table-head text-xs uppercase tracking-widest"><tr><th className="px-6 py-4">Spécialité</th><th className="px-6 py-4">Équipe</th><th className="px-6 py-4">Statut</th><th className="px-6 py-4">Action</th></tr></thead><tbody>{departments.map((department) => <tr key={department.id} className="table-row border-t"><td className="px-6 py-4 font-semibold">{department.name}</td><td className="px-6 py-4">{(doctorsByDepartment[department.id] || []).length} médecin(s)</td><td className="px-6 py-4"><span className={department.is_active ? 'text-emerald-600' : 'muted'}>{department.is_active ? 'Opérationnelle' : 'Inactive'}</span></td><td className="px-6 py-4"><button type="button" onClick={() => setViewingDepartment(department)} className="font-semibold text-blue-600">Voir détails</button></td></tr>)}</tbody></table></div></section>
    <Modal open={formOpen} onClose={isSaving ? () => {} : () => setFormOpen(false)} title={editing ? 'Modifier la spécialité' : 'Ajouter une spécialité'}><form onSubmit={save} className="space-y-4"><label className="field-label">Nom<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="field" /></label><label className="field-label">Description<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="field min-h-28 resize-y" /></label><label className="flex items-center gap-3 text-sm font-semibold"><input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} />Spécialité active</label><div className="flex justify-end gap-3"><Button variant="secondary" onClick={() => setFormOpen(false)} disabled={isSaving}>Annuler</Button><Button type="submit" disabled={isSaving}><Save size={18} />{isSaving ? 'Enregistrement...' : 'Enregistrer'}</Button></div></form></Modal>
    <Modal open={Boolean(viewingDepartment)} onClose={() => setViewingDepartment(null)} title={viewingDepartment?.name || 'Détails de la spécialité'} description={viewingDepartment?.description || 'Aucune description renseignée.'}><div className="space-y-3">{viewingDepartment && (doctorsByDepartment[viewingDepartment.id] || []).length ? (doctorsByDepartment[viewingDepartment.id] || []).map((doctor) => <div key={doctor.id} className="panel-muted flex items-center gap-3 rounded-xl border p-4"><Avatar name={userName(doctor)} /><div><strong>{userName(doctor)}</strong><p className="muted text-sm">{doctor.specialty} · {doctor.user?.email}</p></div></div>) : <p className="muted py-6 text-center">Aucun médecin rattaché.</p>}</div></Modal>
    <ConfirmModal open={Boolean(pendingDelete)} onClose={() => setPendingDelete(null)} onConfirm={remove} isLoading={isDeleting} title="Supprimer la spécialité" description={`Confirmez la suppression de ${pendingDelete?.name || 'cette spécialité'}.`} confirmLabel="Supprimer" />
  </div>
}
