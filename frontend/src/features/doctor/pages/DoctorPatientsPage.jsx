import { FilePlus2, FileText } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Avatar } from '../../../components/ui/Avatar'
import { Button } from '../../../components/ui/Button'
import { PageHeader } from '../../../components/ui/PageHeader'
import { Pagination } from '../../../components/ui/Pagination'
import { SearchField } from '../../../components/ui/SearchField'
import { useResource } from '../../../hooks/useResource'
import { userName } from '../../../utils/formatters'

export function DoctorPatientsPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const { items: patients, pagination, isLoading, error } = useResource('patients', { search, page, per_page: 12 })
  return <div className="page-stack"><PageHeader title="Mes patients" description="Retrouvez les patients que vous accompagnez et accédez rapidement à leur suivi." /><section className="panel p-5"><SearchField value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="Rechercher par nom ou email..." className="max-w-xl" /></section>{error ? <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">Impossible de charger vos patients.</p> : null}<section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{isLoading ? <p className="muted">Chargement...</p> : patients.length ? patients.map((patient) => <article key={patient.id} className="panel p-5"><div className="flex items-center gap-4"><Avatar name={userName(patient)} size="lg" /><div className="min-w-0"><h3 className="truncate text-lg font-bold">{userName(patient)}</h3><p className="muted truncate text-sm">{patient.user?.email}</p></div></div><div className="panel-muted mt-5 grid grid-cols-2 gap-3 rounded-xl border p-4 text-sm"><div><p className="eyebrow">Groupe</p><strong className="mt-1 block">{patient.blood_group || '—'}</strong></div><div><p className="eyebrow">Naissance</p><strong className="mt-1 block">{patient.birth_date || '—'}</strong></div></div><div className="mt-5 grid gap-2 sm:grid-cols-2"><Button as={Link} to={`/doctor/consultations?patient=${patient.id}`} variant="secondary"><FilePlus2 size={16} />Consulter</Button><Button as={Link} to={`/doctor/consultations?patient=${patient.id}&view=records`} variant="ghost"><FileText size={16} />Dossier</Button></div></article>) : <p className="muted panel p-6">Aucun patient lié.</p>}</section><section className="panel overflow-hidden"><Pagination pagination={pagination} onPageChange={setPage} /></section></div>
}
