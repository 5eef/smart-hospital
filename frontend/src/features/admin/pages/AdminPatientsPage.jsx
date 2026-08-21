import { CalendarCheck, Download, Eye, FileCheck2, Pencil, Plus, Save, Trash2, UserPlus, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ActionNotice } from '../../../components/ui/ActionNotice'
import { Avatar } from '../../../components/ui/Avatar'
import { Button } from '../../../components/ui/Button'
import { ConfirmModal } from '../../../components/ui/ConfirmModal'
import { Modal } from '../../../components/ui/Modal'
import { PageHeader } from '../../../components/ui/PageHeader'
import { Pagination } from '../../../components/ui/Pagination'
import { SearchField } from '../../../components/ui/SearchField'
import { StatCard } from '../../../components/ui/StatCard'
import { useActionNotice } from '../../../hooks/useActionNotice'
import { useResource } from '../../../hooks/useResource'
import { api } from '../../../services/api'
import { resourceService } from '../../../services/resourceService'
import { downloadCsv } from '../../../utils/exportUtils'
import { apiError, userName } from '../../../utils/formatters'

const emptyForm = { name: '', email: '', phone: '', birth_date: '', gender: 'female', blood_group: '', address: '', emergency_contact: '' }

export function AdminPatientsPage() {
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState(() => searchParams.get('search') ?? '')
  const [editing, setEditing] = useState(null)
  const [viewing, setViewing] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [formErrors, setFormErrors] = useState({})
  const [isSaving, setIsSaving] = useState(false)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [page, setPage] = useState(1)
  const [stats, setStats] = useState(null)
  const { items: patients, pagination, isLoading, error, refetch } = useResource('patients', { search, page, per_page: 10 })
  const { message, notify, clear } = useActionNotice()
  useEffect(() => { api.get('/admin/dashboard').then(({ data }) => setStats(data)).catch(() => setStats(null)) }, [])

  function openCreate() { setEditing(null); setForm(emptyForm); setFormErrors({}); setFormOpen(true) }
  function edit(patient) { setEditing(patient.id); setFormErrors({}); setForm({ name: userName(patient), email: patient.user?.email ?? '', phone: patient.user?.phone ?? '', birth_date: patient.birth_date?.slice(0, 10) ?? '', gender: patient.gender ?? 'female', blood_group: patient.blood_group ?? '', address: patient.address ?? '', emergency_contact: patient.emergency_contact ?? '' }); setFormOpen(true) }
  function validate() { const errors = {}; if (!form.name.trim()) errors.name = 'Le nom est requis.'; if (!form.email.trim()) errors.email = "L’email est requis."; else if (!/^\S+@\S+\.\S+$/.test(form.email)) errors.email = "L’email n’est pas valide."; return errors }
  async function save(event) { event.preventDefault(); if (isSaving) return; const errors = validate(); if (Object.keys(errors).length) { setFormErrors(errors); return } setIsSaving(true); try { if (editing) await resourceService.update('patients', editing, form); else await resourceService.create('patients', form); setFormOpen(false); setEditing(null); setForm(emptyForm); await refetch(); notify('Patient enregistré.') } catch (requestError) { setFormErrors(requestError?.response?.data?.errors ?? {}); notify(apiError(requestError, "Impossible d’enregistrer le patient.")) } finally { setIsSaving(false) } }
  async function remove() { if (!pendingDelete || isDeleting) return; setIsDeleting(true); try { await resourceService.remove('patients', pendingDelete.id); await refetch(); setPendingDelete(null); notify('Patient supprimé.') } catch (requestError) { notify(apiError(requestError, 'Suppression impossible.')) } finally { setIsDeleting(false) } }
  function exportPatients() { downloadCsv('patients-smart-hospital.csv', [['ID', 'Nom', 'Email', 'Téléphone', 'Groupe sanguin'], ...patients.map((p) => [p.id, userName(p), p.user?.email, p.user?.phone, p.blood_group])]); notify('Export CSV téléchargé.') }

  return <div className="page-stack">
    <ActionNotice message={message} onClose={clear} />
    <PageHeader title="Gestion des Patients" description="Consultez et gérez les dossiers de tous les patients enregistrés." actions={<><Button onClick={openCreate}><Plus size={18} />Nouveau patient</Button><Button variant="secondary" onClick={exportPatients}><Download size={18} />Exporter CSV</Button></>} />
    <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4"><StatCard label="Total patients" value={String(stats?.total_patients ?? '—')} icon={Users} /><StatCard label="Nouveaux ce mois" value={String(stats?.new_patients_this_month ?? '—')} icon={UserPlus} tone="emerald" /><StatCard label="RDV aujourd’hui" value={String(stats?.appointments_today ?? '—')} icon={CalendarCheck} tone="amber" /><StatCard label="Dossiers affichés" value={String(pagination?.total ?? patients.length)} icon={FileCheck2} tone="violet" /></section>
    <section className="panel overflow-hidden"><div className="border-b p-5" style={{ borderColor: 'var(--border)' }}><SearchField value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="Rechercher un patient..." className="max-w-xl" /></div>{error ? <p role="alert" className="m-5 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">{apiError(error, 'Impossible de charger les patients.')}</p> : null}<div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left"><thead className="table-head text-xs uppercase tracking-widest"><tr>{['Nom du patient', 'Date de naissance', 'Contact', 'Dossier médical', 'Actions'].map((head) => <th key={head} className="px-6 py-4">{head}</th>)}</tr></thead><tbody>{isLoading ? <tr><td colSpan="5" className="muted px-6 py-8">Chargement...</td></tr> : patients.length ? patients.map((patient) => <tr key={patient.id} className="table-row border-t transition"><td className="px-6 py-4"><div className="flex items-center gap-3"><Avatar name={userName(patient)} /><div><p className="font-semibold">{userName(patient)}</p><p className="muted text-xs">ID: #PT-{patient.id}</p></div></div></td><td className="px-6 py-4">{patient.birth_date?.slice(0, 10) || '—'}</td><td className="px-6 py-4"><p>{patient.user?.email}</p><p className="muted text-sm">{patient.user?.phone || '—'}</p></td><td className="px-6 py-4"><span className="text-sm font-semibold text-blue-600">{patient.medical_records?.length ?? patient.medicalRecords?.length ?? 0} entrée(s)</span></td><td className="px-6 py-4"><div className="flex gap-1"><button type="button" onClick={() => setViewing(patient)} className="icon-button" aria-label={`Voir ${userName(patient)}`} title="Voir"><Eye size={18} /></button><button type="button" onClick={() => edit(patient)} disabled={isDeleting} className="icon-button" aria-label={`Modifier ${userName(patient)}`} title="Modifier"><Pencil size={18} /></button><button type="button" onClick={() => setPendingDelete(patient)} disabled={isDeleting} className="icon-button hover:!text-red-600" aria-label={`Supprimer ${userName(patient)}`} title="Supprimer"><Trash2 size={18} /></button></div></td></tr>) : <tr><td colSpan="5" className="muted px-6 py-10 text-center">Aucun patient.</td></tr>}</tbody></table></div><Pagination pagination={pagination} onPageChange={setPage} /></section>
    <section className="grid gap-5 lg:grid-cols-2"><article className="rounded-2xl border border-blue-200 bg-blue-50 p-6 dark:border-blue-900 dark:bg-blue-950/30"><h3 className="text-xl font-bold text-blue-800 dark:text-blue-300">Export rapide</h3><p className="mt-2 text-blue-700/80 dark:text-blue-300/75">Exportez la page actuelle pour vos traitements administratifs.</p><Button variant="secondary" onClick={exportPatients} className="mt-5"><Download size={18} />Télécharger</Button></article><article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-900 dark:bg-emerald-950/30"><h3 className="text-xl font-bold text-emerald-800 dark:text-emerald-300">Dossiers centralisés</h3><p className="mt-2 text-emerald-700/80 dark:text-emerald-300/75">Les informations affichées proviennent directement des dossiers sécurisés.</p></article></section>
    <Modal open={formOpen} onClose={isSaving ? () => {} : () => setFormOpen(false)} title={editing ? 'Modifier le patient' : 'Nouveau patient'} size="3xl"><form onSubmit={save} className="grid gap-4 sm:grid-cols-2" noValidate>{[['name', 'Nom complet', 'text'], ['email', 'Email', 'email'], ['phone', 'Téléphone', 'tel'], ['birth_date', 'Date de naissance', 'date'], ['blood_group', 'Groupe sanguin', 'text'], ['address', 'Adresse', 'text'], ['emergency_contact', 'Contact d’urgence', 'text']].map(([field, label, type]) => <label key={field} className="field-label">{label}<input type={type} value={form[field]} onChange={(event) => setForm({ ...form, [field]: event.target.value })} className="field" aria-invalid={Boolean(formErrors[field])} />{formErrors[field] ? <span className="text-xs font-normal text-red-600">{Array.isArray(formErrors[field]) ? formErrors[field][0] : formErrors[field]}</span> : null}</label>)}<label className="field-label">Genre<select value={form.gender} onChange={(event) => setForm({ ...form, gender: event.target.value })} className="field"><option value="female">Femme</option><option value="male">Homme</option><option value="other">Autre</option></select></label><div className="flex justify-end gap-3 sm:col-span-2"><Button variant="secondary" onClick={() => setFormOpen(false)} disabled={isSaving}>Annuler</Button><Button type="submit" disabled={isSaving}><Save size={18} />{isSaving ? 'Enregistrement...' : 'Enregistrer'}</Button></div></form></Modal>
    <Modal open={Boolean(viewing)} onClose={() => setViewing(null)} title={viewing ? `Dossier de ${userName(viewing)}` : 'Dossier patient'}><dl className="grid gap-4 sm:grid-cols-2">{viewing ? [['Email', viewing.user?.email], ['Téléphone', viewing.user?.phone], ['Date de naissance', viewing.birth_date?.slice(0, 10)], ['Groupe sanguin', viewing.blood_group], ['Adresse', viewing.address], ['Contact d’urgence', viewing.emergency_contact]].map(([label, value]) => <div key={label} className="panel-muted rounded-xl border p-4"><dt className="eyebrow">{label}</dt><dd className="mt-2 font-semibold">{value || '—'}</dd></div>) : null}</dl></Modal>
    <ConfirmModal open={Boolean(pendingDelete)} onClose={() => setPendingDelete(null)} onConfirm={remove} isLoading={isDeleting} title="Supprimer le patient" description={`Confirmez la suppression de ${userName(pendingDelete)}. Cette action supprimera aussi son compte.`} confirmLabel="Supprimer" />
  </div>
}
