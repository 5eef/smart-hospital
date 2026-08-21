import { BriefcaseMedical, KeyRound, MoreHorizontal, Pencil, Plus, Save, Trash2, UserCheck, UserRoundCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ActionNotice } from '../../../components/ui/ActionNotice'
import { Avatar } from '../../../components/ui/Avatar'
import { Button } from '../../../components/ui/Button'
import { Modal } from '../../../components/ui/Modal'
import { PageHeader } from '../../../components/ui/PageHeader'
import { Pagination } from '../../../components/ui/Pagination'
import { SearchField } from '../../../components/ui/SearchField'
import { StatCard } from '../../../components/ui/StatCard'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { useActionNotice } from '../../../hooks/useActionNotice'
import { useResource } from '../../../hooks/useResource'
import { api } from '../../../services/api'
import { resourceService } from '../../../services/resourceService'
import { apiError, userName } from '../../../utils/formatters'

const emptyForm = { name: '', email: '', phone: '', department_id: '', license_number: '', specialty: '', status: 'active', is_active: true }

export function AdminDoctorsPage() {
  const [search, setSearch] = useState('')
  const [department, setDepartment] = useState('')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [isSaving, setIsSaving] = useState(false)
  const [stats, setStats] = useState(null)
  const { items: doctors, pagination, isLoading, error, refetch } = useResource('doctors', { search, department_id: department, page, per_page: 10 })
  const { items: departments } = useResource('departments', { per_page: 100 })
  const { message, notify, clear } = useActionNotice()
  useEffect(() => { api.get('/admin/dashboard').then(({ data }) => setStats(data)) }, [])

  function openCreate() { setEditing(null); setForm(emptyForm); setFormOpen(true) }
  function edit(doctor) { setEditing(doctor.id); setForm({ name: doctor.user?.name ?? '', email: doctor.user?.email ?? '', phone: doctor.user?.phone ?? '', department_id: doctor.department_id ?? '', license_number: doctor.license_number ?? '', specialty: doctor.specialty ?? '', status: doctor.status ?? 'active', is_active: doctor.user?.is_active ?? true }); setFormOpen(true) }
  async function save(event) { event.preventDefault(); setIsSaving(true); try { if (editing) await resourceService.update('doctors', editing, form); else await resourceService.create('doctors', form); setFormOpen(false); setEditing(null); setForm(emptyForm); await refetch(); notify('Médecin enregistré.') } catch (requestError) { notify(apiError(requestError, "Impossible d’enregistrer le médecin.")) } finally { setIsSaving(false) } }
  async function remove(id) { if (!window.confirm('Supprimer ce médecin ?')) return; try { await resourceService.remove('doctors', id); await refetch(); notify('Médecin supprimé.') } catch (requestError) { notify(apiError(requestError, 'Suppression impossible.')) } }
  async function resetPassword(id) { try { await api.post(`/doctors/${id}/reset-password`); notify('Mot de passe réinitialisé avec succès.') } catch (requestError) { notify(apiError(requestError, 'Réinitialisation impossible.')) } }

  return <div className="page-stack">
    <ActionNotice message={message} onClose={clear} />
    <PageHeader title="Gestion des Médecins" description="Gérez le personnel médical, ses spécialités et ses disponibilités." actions={<Button onClick={openCreate}><Plus size={19} />Ajouter un médecin</Button>} />
    <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4"><StatCard label="Total médecins" value={String(stats?.total_doctors ?? '—')} icon={BriefcaseMedical} /><StatCard label="Actifs aujourd’hui" value={String(stats?.active_doctors ?? '—')} icon={UserCheck} tone="emerald" /><StatCard label="En congé" value={String(stats?.doctors_on_leave ?? '—')} icon={MoreHorizontal} tone="amber" /><StatCard label="Nouveaux ce mois" value={String(stats?.new_doctors_this_month ?? '—')} icon={UserRoundCheck} tone="violet" /></section>
    <section className="panel overflow-hidden">
      <div className="flex flex-col gap-3 border-b p-5 lg:flex-row lg:items-center lg:justify-between" style={{ borderColor: 'var(--border)' }}><SearchField value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="Rechercher par nom, spécialité ou email..." className="max-w-xl" /><select value={department} onChange={(event) => { setDepartment(event.target.value); setPage(1) }} className="field lg:w-64"><option value="">Toutes les spécialités</option>{departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
      {error ? <p role="alert" className="m-5 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">{apiError(error, 'Impossible de charger les médecins.')}</p> : null}
      <div className="overflow-x-auto"><table className="w-full min-w-[950px] text-left"><thead className="table-head text-xs uppercase tracking-widest"><tr>{['Nom', 'Spécialité', 'Contact', 'Statut', 'Actions'].map((head) => <th key={head} className="px-6 py-4">{head}</th>)}</tr></thead><tbody>{isLoading ? <tr><td colSpan="5" className="muted px-6 py-8">Chargement...</td></tr> : doctors.length ? doctors.map((doctor) => <tr key={doctor.id} className="table-row border-t transition"><td className="px-6 py-4"><div className="flex items-center gap-3"><Avatar name={userName(doctor)} /><div><p className="font-semibold">{userName(doctor)}</p><p className="muted text-xs">ID: #DOC-{doctor.id}</p></div></div></td><td className="px-6 py-4"><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">{doctor.specialty || doctor.department?.name}</span></td><td className="px-6 py-4"><p>{doctor.user?.email}</p><p className="muted text-sm">{doctor.user?.phone || '—'}</p></td><td className="px-6 py-4"><StatusBadge status={doctor.status} /></td><td className="px-6 py-4"><div className="flex gap-1"><button className="icon-button" onClick={() => edit(doctor)} type="button" aria-label={`Modifier ${userName(doctor)}`}><Pencil size={18} /></button><button className="icon-button" onClick={() => resetPassword(doctor.id)} type="button" aria-label={`Réinitialiser le mot de passe de ${userName(doctor)}`}><KeyRound size={18} /></button><button className="icon-button hover:!text-red-600" onClick={() => remove(doctor.id)} type="button" aria-label={`Supprimer ${userName(doctor)}`}><Trash2 size={18} /></button></div></td></tr>) : <tr><td colSpan="5" className="muted px-6 py-10 text-center">Aucun médecin.</td></tr>}</tbody></table></div>
      <Pagination pagination={pagination} onPageChange={setPage} />
    </section>
    <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? 'Modifier le médecin' : 'Ajouter un médecin'} description="Les informations sont enregistrées dans le compte et le profil médical existants."><form onSubmit={save} className="grid gap-4 sm:grid-cols-2">{[['name', 'Nom complet', 'text'], ['email', 'Adresse email', 'email'], ['phone', 'Téléphone', 'tel'], ['license_number', 'Numéro de licence', 'text'], ['specialty', 'Spécialité affichée', 'text']].map(([field, label, type]) => <label key={field} className="field-label">{label}<input required={['name', 'email', 'license_number', 'specialty'].includes(field)} type={type} value={form[field]} onChange={(event) => setForm({ ...form, [field]: event.target.value })} className="field" /></label>)}<label className="field-label">Département<select required value={form.department_id} onChange={(event) => setForm({ ...form, department_id: event.target.value })} className="field"><option value="">Choisir</option>{departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="field-label">Statut<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} className="field"><option value="active">Actif</option><option value="inactive">Inactif</option><option value="leave">En congé</option></select></label><label className="flex items-center gap-3 pt-7 text-sm font-semibold"><input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} />Compte utilisateur actif</label><div className="flex justify-end gap-3 sm:col-span-2"><Button variant="secondary" onClick={() => setFormOpen(false)}>Annuler</Button><Button type="submit" disabled={isSaving}><Save size={18} />{isSaving ? 'Enregistrement...' : 'Enregistrer'}</Button></div></form></Modal>
  </div>
}
