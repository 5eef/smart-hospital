import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { ThemeToggle } from '../../components/ui/ThemeToggle'
import { useAuth } from '../../hooks/useAuth'

const labels = { patient: 'Patient', doctor: 'Médecin', admin: 'Admin' }

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [role, setRole] = useState('patient')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    if (isSubmitting) return
    setIsSubmitting(true)
    setError('')
    try {
      const user = await login({ email, password, role })
      navigate(user.email_verified === false ? '/verify-email' : `/${user.role}`)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Connexion impossible. Vérifiez vos identifiants.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[var(--background)] p-4 sm:p-6">
    <div className="absolute -left-32 top-20 h-80 w-80 rounded-full bg-blue-200/30 blur-3xl dark:bg-blue-900/20" />
    <div className="absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-emerald-200/25 blur-3xl dark:bg-emerald-900/15" />
    <ThemeToggle className="absolute right-5 top-5" />
    <div className="relative w-full max-w-xl">
      <Link to="/" className="mb-8 flex items-center justify-center gap-3 text-2xl font-bold text-blue-600">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-blue-600 text-white"><ShieldCheck /></span>SmartHôpital
      </Link>
      <section className="panel p-6 sm:p-9">
        <div className="text-center">
          <h1 className="text-3xl font-bold sm:text-4xl">Connexion</h1>
          <p className="muted mt-3">Ravi de vous revoir. Accédez à votre portail sécurisé.</p>
        </div>
        <div className="panel-muted mt-7 grid grid-cols-3 gap-1 rounded-xl border p-1">
          {Object.keys(labels).map((item) => <button type="button" key={item} onClick={() => setRole(item)} className={`min-h-10 rounded-lg px-2 text-sm font-semibold transition ${role === item ? 'bg-blue-600 text-white shadow-sm' : 'muted hover:text-[var(--text)]'}`}>{labels[item]}</button>)}
        </div>
        <form onSubmit={handleSubmit} className="mt-7 space-y-5">
          <label className="field-label">Adresse email
            <span className="field flex items-center gap-3"><Mail className="text-slate-400" size={19} /><input required type="email" className="min-w-0 flex-1 bg-transparent outline-none" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nom@exemple.com" /></span>
          </label>
          <label className="field-label">Mot de passe
            <span className="field flex items-center gap-3"><LockKeyhole className="text-slate-400" size={19} /><input required type={showPassword ? 'text' : 'password'} className="min-w-0 flex-1 bg-transparent outline-none" value={password} onChange={(event) => setPassword(event.target.value)} /><button type="button" onClick={() => setShowPassword(!showPassword)} className="icon-button h-8 w-8" aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></span>
          </label>
          <div className="text-right"><Link to="/forgot-password" className="text-sm font-semibold text-blue-600">Mot de passe oublié ?</Link></div>
          {error ? <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p> : null}
          <Button type="submit" className="w-full py-4 text-base" disabled={isSubmitting}>{isSubmitting ? 'Connexion...' : 'Se connecter'}<ArrowRight size={20} /></Button>
        </form>
        <p className="muted mt-6 text-center text-sm">Nouveau sur SmartHôpital ? <Link to="/register" className="font-bold text-blue-600">Créer un compte patient</Link></p>
      </section>
    </div>
  </main>
}
