import { LoaderCircle, Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../services/api'
import { apiError, userName } from '../../utils/formatters'

export function GlobalSearch({ role }) {
  const navigate = useNavigate()
  const rootRef = useRef(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    function close(event) {
      if (!rootRef.current?.contains(event.target)) setIsOpen(false)
    }
    function closeWithEscape(event) {
      if (event.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', closeWithEscape)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', closeWithEscape)
    }
  }, [])

  async function search(event) {
    event.preventDefault()
    const term = query.trim()
    if (!term) {
      setResults([])
      setIsOpen(false)
      return
    }

    setIsLoading(true)
    setError('')
    try {
      const requests = role === 'admin'
        ? [api.get('/patients', { params: { search: term, per_page: 5 } }), api.get('/doctors', { params: { search: term, per_page: 5 } })]
        : [api.get('/patients', { params: { search: term, per_page: 8 } })]
      const responses = await Promise.all(requests)
      const patients = (responses[0].data?.data ?? []).map((item) => ({ ...item, resultType: 'patient' }))
      const doctors = role === 'admin' ? (responses[1].data?.data ?? []).map((item) => ({ ...item, resultType: 'doctor' })) : []
      setResults([...patients, ...doctors])
      setIsOpen(true)
    } catch (requestError) {
      setResults([])
      setError(apiError(requestError, 'Recherche indisponible.'))
      setIsOpen(true)
    } finally {
      setIsLoading(false)
    }
  }

  function openResult(result) {
    setIsOpen(false)
    if (role === 'doctor') {
      navigate(`/doctor/consultations?patient=${result.id}`)
      return
    }
    const target = result.resultType === 'doctor' ? 'doctors' : 'patients'
    navigate(`/admin/${target}?search=${encodeURIComponent(userName(result))}`)
  }

  return <div ref={rootRef} className="relative hidden w-full max-w-lg md:block">
    <form onSubmit={search} className="field flex items-center gap-2 py-2">
      <button type="submit" className="text-slate-400" aria-label="Lancer la recherche">
        {isLoading ? <LoaderCircle size={18} className="animate-spin" /> : <Search size={18} />}
      </button>
      <input value={query} onChange={(event) => { setQuery(event.target.value); if (!event.target.value) setIsOpen(false) }} aria-label="Recherche globale" className="w-full bg-transparent outline-none" placeholder="Rechercher un dossier, médecin..." />
    </form>
    {isOpen ? <div className="panel absolute inset-x-0 top-[calc(100%+.5rem)] z-50 max-h-96 overflow-y-auto p-2 shadow-xl" role="dialog" aria-label="Résultats de recherche">
      {error ? <p role="alert" className="p-3 text-sm font-medium text-red-600">{error}</p> : results.length ? results.map((result) => <button type="button" key={`${result.resultType}-${result.id}`} onClick={() => openResult(result)} className="table-row flex w-full items-center justify-between rounded-xl p-3 text-left">
        <span><strong className="block">{userName(result)}</strong><span className="muted text-xs">{result.resultType === 'doctor' ? result.specialty || 'Médecin' : result.user?.email || 'Patient'}</span></span>
        <span className="muted text-xs">{result.resultType === 'doctor' ? 'Médecin' : 'Patient'}</span>
      </button>) : <p className="muted p-3 text-sm">Aucun résultat.</p>}
    </div> : null}
  </div>
}
