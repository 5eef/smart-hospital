import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return <main className="grid min-h-screen place-items-center bg-[var(--background)] p-6 text-center"><div><p className="text-sm font-bold text-blue-600">404</p><h1 className="mt-2 text-4xl font-bold">Page introuvable</h1><p className="muted mt-3">La page demandée n’existe pas ou a été déplacée.</p><Link to="/" className="mt-6 inline-flex font-bold text-blue-600">Retour à l’accueil</Link></div></main>
}
