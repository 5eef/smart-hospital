import { CalendarDays, CheckCircle, Clock3, Stethoscope } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ActionNotice } from '../../../components/ui/ActionNotice'
import { Avatar } from '../../../components/ui/Avatar'
import { Button } from '../../../components/ui/Button'
import { useActionNotice } from '../../../hooks/useActionNotice'
import { useAuth } from '../../../hooks/useAuth'
import { useResource } from '../../../hooks/useResource'
import { resourceService } from '../../../services/resourceService'
import { apiError, userName } from '../../../utils/formatters'

const times = ['09:00', '09:30', '10:00', '10:30', '11:00', '14:00', '14:30', '15:00']

export function PatientAppointmentPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { items: departments } = useResource('departments', { per_page: 100 })
  const { items: doctors } = useResource('doctors', { per_page: 100 })
  const [form, setForm] = useState({ department_id: '', doctor_id: '', date: '', time: '', reason: '' })
  const [isSaving, setIsSaving] = useState(false)
  const { message, notify, clear } = useActionNotice()
  const filteredDoctors = useMemo(() => doctors.filter((doctor) => doctor.status === 'active' && (!form.department_id || String(doctor.department_id) === String(form.department_id))), [doctors, form.department_id])
  const selectedDoctor = filteredDoctors.find((doctor) => String(doctor.id) === String(form.doctor_id))

  async function submit(event) { event.preventDefault(); setIsSaving(true); try { const departmentId = form.department_id || selectedDoctor?.department_id; await resourceService.create('appointments', { department_id: departmentId, doctor_id: form.doctor_id, patient_id: user.patient_id, scheduled_at: `${form.date}T${form.time}`, reason: form.reason, status: 'pending' }); notify('Demande de rendez-vous envoyée.'); setTimeout(() => navigate('/patient/appointments'), 600) } catch (requestError) { notify(apiError(requestError, 'Impossible de demander le rendez-vous.')) } finally { setIsSaving(false) } }

  return <div className="mx-auto max-w-3xl space-y-7"><ActionNotice message={message} onClose={clear} /><section><h2 className="page-title">Nouveau Rendez-vous</h2><p className="page-subtitle">Sélectionnez une spécialité, un médecin et l’horaire souhaité.</p></section><form onSubmit={submit} className="space-y-6"><section className="panel grid gap-5 p-5 sm:grid-cols-2 sm:p-6"><label className="field-label">Spécialité<select required value={form.department_id} onChange={(event) => setForm({ ...form, department_id: event.target.value, doctor_id: '' })} className="field"><option value="">Choisir une spécialité</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></label><label className="field-label">Médecin<select required value={form.doctor_id} onChange={(event) => setForm({ ...form, doctor_id: event.target.value })} className="field"><option value="">Choisir un praticien</option>{filteredDoctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{userName(doctor)} — {doctor.specialty}</option>)}</select></label>{selectedDoctor ? <div className="panel-muted flex items-center gap-3 rounded-xl border p-4 sm:col-span-2"><Avatar name={userName(selectedDoctor)} /><div><strong>{userName(selectedDoctor)}</strong><p className="muted text-sm">{selectedDoctor.specialty} · {selectedDoctor.department?.name}</p></div></div> : null}</section><section className="panel p-5 sm:p-6"><h3 className="flex items-center gap-2 text-xl font-bold"><CalendarDays className="text-blue-600" />Date</h3><input required type="date" min={new Date().toISOString().slice(0, 10)} value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} className="field mt-5" /></section><section className="panel p-5 sm:p-6"><h3 className="flex items-center gap-2 text-xl font-bold"><Clock3 className="text-blue-600" />Heure souhaitée</h3><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">{times.map((time) => <button type="button" key={time} onClick={() => setForm({ ...form, time })} className={`min-h-12 rounded-xl border font-semibold transition ${form.time === time ? 'border-blue-600 bg-blue-600 text-white' : 'border-[var(--border)] bg-[var(--surface)] hover:border-blue-400'}`}>{time}</button>)}</div><p className="muted mt-3 text-xs">Le créneau reste soumis aux contrôles de disponibilité du système.</p></section><section className="panel p-5 sm:p-6"><label className="field-label"><span className="flex items-center gap-2"><Stethoscope size={18} className="text-blue-600" />Motif du rendez-vous</span><textarea value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} className="field min-h-24 resize-y" placeholder="Décrivez brièvement votre besoin..." /></label></section><Button type="submit" disabled={isSaving || !form.time} className="w-full py-4 text-base"><CheckCircle size={20} />{isSaving ? 'Confirmation...' : 'Confirmer le rendez-vous'}</Button></form></div>
}
