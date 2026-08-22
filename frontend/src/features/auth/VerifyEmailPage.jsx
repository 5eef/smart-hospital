import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { authService } from '../../services/authService'

export function VerifyEmailPage() {
  const [params] = useSearchParams()
  const [message, setMessage] = useState(params.get('verified') ? 'Adresse vérifiée. Redirection…' : '')
  const [error, setError] = useState('')

  useEffect(() => {
    if (params.get('verified')) window.location.assign('/')
  }, [params])

  async function resend() {
    setError('')
    try {
      const data = await authService.resendVerification()
      setMessage(data.message)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Envoi impossible pour le moment.')
    }
  }

  return <main className="grid min-h-screen place-items-center bg-[var(--background)] p-4"><section className="panel w-full max-w-lg p-7 text-center sm:p-9"><h1 className="text-3xl font-bold">Vérifiez votre email</h1><p className="muted mt-3">Ouvrez le lien envoyé à votre adresse avant d’accéder aux données hospitalières.</p>{message ? <p role="status" className="mt-5 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p> : null}{error ? <p role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}<Button type="button" className="mt-6 w-full" onClick={resend}>Renvoyer le lien</Button><Link to="/login" className="mt-5 block font-semibold text-blue-600">Retour à la connexion</Link></section></main>
}
