import { cn } from '../../utils/cn'

export function Button({ as: Component = 'button', children, className, variant = 'primary', ...props }) {
  const variants = {
    primary: 'bg-[#1459d9] text-white shadow-sm shadow-blue-700/25 hover:bg-[#0948af]',
    secondary: 'border text-[var(--text)] hover:bg-[var(--surface-muted)]',
    ghost: 'text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)]',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  }
  return <Component {...(Component === 'button' ? { type: 'button' } : {})} className={cn('inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border-transparent px-4 py-2.5 text-sm font-semibold transition duration-150 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60', variants[variant], className)} style={variant === 'secondary' ? { background: 'var(--surface)', borderColor: 'var(--border)' } : undefined} {...props}>{children}</Component>
}
