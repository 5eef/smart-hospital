import { Component } from 'react'

export class ErrorBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error) {
    if (import.meta.env.DEV) console.error(error)
  }

  render() {
    if (this.state.failed) {
      return <main className="grid min-h-screen place-items-center bg-[var(--background)] p-6 text-center"><div><h1 className="text-3xl font-bold">Une erreur est survenue</h1><p className="muted mt-3">Rechargez la page. Si le problème persiste, contactez l’administration.</p><button type="button" className="button-primary mt-6" onClick={() => window.location.assign('/')}>Retour à l’accueil</button></div></main>
    }
    return this.props.children
  }
}
