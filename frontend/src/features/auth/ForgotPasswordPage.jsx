import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { authService } from '../../services/authService'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    setError('')
    try {
      const data = await authService.forgotPassword(email)
      setMessage(data.message)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Demande impossible pour le moment.')
    }
  }

  return <main className="grid min-h-screen place-items-center bg-[var(--background)] p-4"><section className="panel w-full max-w-lg p-7 sm:p-9"><h1 className="text-3xl font-bold">Mot de passe oublié</h1><p className="muted mt-3">Saisissez votre adresse email pour recevoir un lien sécurisé.</p><form onSubmit={submit} className="mt-7 space-y-5"><label className="field-label">Adresse email<input required type="email" className="field" value={email} onChange={(event) => setEmail(event.target.value)} /></label>{message ? <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p> : null}{error ? <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}<Button type="submit" className="w-full">Envoyer le lien</Button></form><Link to="/login" className="mt-5 block text-center font-semibold text-blue-600">Retour à la connexion</Link></section></main>
}
