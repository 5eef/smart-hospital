import { ArrowLeft, ArrowRight, ShieldCheck, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { ThemeToggle } from '../../components/ui/ThemeToggle'
import { useAuth } from '../../hooks/useAuth'

export function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', role: 'patient', password: '', password_confirmation: '' })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }))

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    if (!form.name || !form.email || !form.password) return setError('Veuillez remplir le nom, l’email et le mot de passe.')
    if (form.password.length < 12) return setError('Le mot de passe doit contenir au moins 12 caractères.')
    if (form.password !== form.password_confirmation) return setError('Les mots de passe ne correspondent pas.')
    setIsSubmitting(true)
    try {
      const user = await register(form)
      navigate(user.email_verified === false ? '/verify-email' : `/${user.role}`)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Création du compte impossible.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return <main className="relative grid min-h-screen place-items-center bg-[var(--background)] p-4 sm:p-6">
    <ThemeToggle className="absolute right-5 top-5" />
    <section className="panel w-full max-w-2xl p-6 sm:p-9">
      <div className="flex items-center justify-between">
        <Link to="/login" className="icon-button" aria-label="Retour à la connexion"><ArrowLeft /></Link>
        <Link to="/" className="flex items-center gap-2 text-xl font-bold text-blue-600"><ShieldCheck />SmartHôpital</Link>
        <span className="w-10" />
      </div>
      <div className="mt-7 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"><UserPlus /></span>
        <h1 className="mt-4 text-3xl font-bold sm:text-4xl">Créer votre espace patient</h1>
        <p className="muted mt-3">Demandez un rendez-vous et suivez votre dossier en toute simplicité.</p>
      </div>
      <form onSubmit={handleSubmit} className="mt-8 grid gap-5 sm:grid-cols-2">
        <label className="field-label sm:col-span-2">Nom complet<input required value={form.name} onChange={(event) => updateField('name', event.target.value)} className="field" /></label>
        <label className="field-label">Email<input required type="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} className="field" /></label>
        <label className="field-label">Type de compte<input value="Patient" readOnly className="field panel-muted" /></label>
        <label className="field-label">Mot de passe<input required minLength="12" type="password" value={form.password} onChange={(event) => updateField('password', event.target.value)} className="field" placeholder="12 caractères minimum" /></label>
        <label className="field-label">Confirmation<input required type="password" value={form.password_confirmation} onChange={(event) => updateField('password_confirmation', event.target.value)} className="field" /></label>
        {error ? <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700 sm:col-span-2">{error}</p> : null}
        <Button type="submit" className="py-4 text-base sm:col-span-2" disabled={isSubmitting}>{isSubmitting ? 'Création...' : 'Créer le compte'}<ArrowRight size={20} /></Button>
      </form>
      <p className="muted mt-6 text-center text-sm">Déjà inscrit ? <Link to="/login" className="font-bold text-blue-600">Se connecter</Link></p>
    </section>
  </main>
}
