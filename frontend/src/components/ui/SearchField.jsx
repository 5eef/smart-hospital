import { Search } from 'lucide-react'
import { cn } from '../../utils/cn'

export function SearchField({ className, ...props }) {
  return <label className={cn('field flex items-center gap-3', className)}><Search size={19} className="shrink-0 text-slate-400" /><input {...props} className="min-w-0 flex-1 bg-transparent outline-none" /></label>
}
