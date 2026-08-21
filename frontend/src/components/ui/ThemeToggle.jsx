import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'

export function ThemeToggle({ className = '' }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('smartHospitalTheme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'))
  useEffect(() => { document.documentElement.classList.toggle('dark', theme === 'dark'); localStorage.setItem('smartHospitalTheme', theme) }, [theme])
  return <button type="button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className={`icon-button ${className}`} aria-label={theme === 'dark' ? 'Activer le mode clair' : 'Activer le mode sombre'}>{theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}</button>
}
