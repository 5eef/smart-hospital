import { ChevronLeft, ChevronRight } from 'lucide-react'

export function Pagination({ pagination, onPageChange }) {
  if (!pagination || pagination.lastPage <= 1) return null
  return <div className="muted flex flex-wrap items-center justify-between gap-3 border-t px-5 py-4 text-sm sm:px-6" style={{ borderColor: 'var(--border)' }}>
    <span>{pagination.total} résultat{pagination.total > 1 ? 's' : ''}</span>
    <div className="flex items-center gap-2"><button type="button" aria-label="Page précédente" disabled={pagination.currentPage === 1} onClick={() => onPageChange(pagination.currentPage - 1)} className="icon-button border disabled:opacity-40" style={{ borderColor: 'var(--border)' }}><ChevronLeft size={18} /></button><span className="font-semibold text-[var(--text)]">Page {pagination.currentPage} / {pagination.lastPage}</span><button type="button" aria-label="Page suivante" disabled={pagination.currentPage === pagination.lastPage} onClick={() => onPageChange(pagination.currentPage + 1)} className="icon-button border disabled:opacity-40" style={{ borderColor: 'var(--border)' }}><ChevronRight size={18} /></button></div>
  </div>
}
