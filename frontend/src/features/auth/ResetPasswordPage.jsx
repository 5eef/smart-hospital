import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { authService } from '../../services/authService'

export function ResetPasswordPage() {
  const [params] = useSearchParams()
  const [form, setForm] = useState({ email: params.get('email') || '', token: params.get('token') || '', password: '', password_confirmation: '' })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  async function submit(event) {
    event.preventDefault()
    setError('')
    try {
      const data = await authService.resetPassword(form)
      setMessage(data.message)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Lien invalide ou expiré.')
    }
  }

  return <main className="grid min-h-screen place-items-center bg-[var(--background)] p-4"><section className="panel w-full max-w-lg p-7 sm:p-9"><h1 className="text-3xl font-bold">Nouveau mot de passe</h1><form onSubmit={submit} className="mt-7 space-y-5"><label className="field-label">Adresse email<input required type="email" className="field" value={form.email} onChange={(event) => update('email', event.target.value)} /></label><label className="field-label">Mot de passe<input required minLength="12" type="password" className="field" value={form.password} onChange={(event) => update('password', event.target.value)} /></label><label className="field-label">Confirmation<input required type="password" className="field" value={form.password_confirmation} onChange={(event) => update('password_confirmation', event.target.value)} /></label>{message ? <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p> : null}{error ? <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}<Button type="submit" className="w-full">Enregistrer</Button></form><Link to="/login" className="mt-5 block text-center font-semibold text-blue-600">Retour à la connexion</Link></section></main>
}
