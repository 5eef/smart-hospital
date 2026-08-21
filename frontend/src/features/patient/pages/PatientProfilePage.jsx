import { Mail, Phone, Save, ShieldCheck, User } from 'lucide-react'
import { useState } from 'react'
import { ActionNotice } from '../../../components/ui/ActionNotice'
import { Avatar } from '../../../components/ui/Avatar'
import { Button } from '../../../components/ui/Button'
import { PageHeader } from '../../../components/ui/PageHeader'
import { useActionNotice } from '../../../hooks/useActionNotice'
import { useAuth } from '../../../hooks/useAuth'
import { apiError } from '../../../utils/formatters'

export function PatientProfilePage() {
  const { user, updateProfile } = useAuth()
  const [form, setForm] = useState({ name: user?.name ?? '', phone: user?.phone ?? '' })
  const [isSaving, setIsSaving] = useState(false)
  const { message, notify, clear } = useActionNotice()
  async function save(event) { event.preventDefault(); setIsSaving(true); try { await updateProfile(form); notify('Profil mis à jour.') } catch (requestError) { notify(apiError(requestError, 'Impossible de mettre à jour le profil.')) } finally { setIsSaving(false) } }
  return <div className="mx-auto max-w-4xl page-stack"><ActionNotice message={message} onClose={clear} /><PageHeader title="Mon profil" description="Gardez vos informations personnelles à jour." /><section className="panel overflow-hidden"><div className="flex items-center gap-4 bg-gradient-to-r from-blue-700 to-blue-500 p-6 text-white"><Avatar name={user?.name} size="lg" /><div><h3 className="text-xl font-bold">{user?.name}</h3><p className="text-blue-100">Espace patient SmartHôpital</p></div></div><form onSubmit={save} className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6"><label className="field-label"><span className="flex items-center gap-2"><User size={17} />Nom</span><input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="field" /></label><label className="field-label"><span className="flex items-center gap-2"><Phone size={17} />Téléphone</span><input value={form.phone || ''} onChange={(event) => setForm({ ...form, phone: event.target.value })} className="field" /></label><label className="field-label"><span className="flex items-center gap-2"><Mail size={17} />Email</span><input value={user?.email ?? ''} readOnly className="field panel-muted" /></label><label className="field-label"><span className="flex items-center gap-2"><ShieldCheck size={17} />Rôle</span><input value="Patient" readOnly className="field panel-muted" /></label><div className="sm:col-span-2"><Button type="submit" disabled={isSaving}><Save size={18} />{isSaving ? 'Enregistrement...' : 'Enregistrer'}</Button></div></form></section></div>
}
