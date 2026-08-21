import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ThemeToggle } from './ThemeToggle'

describe('ThemeToggle', () => {
  it('switches theme, accessible label, DOM class, and persisted preference', () => {
    render(<ThemeToggle />)

    fireEvent.click(screen.getByRole('button', { name: 'Activer le mode sombre' }))

    expect(screen.getByRole('button', { name: 'Activer le mode clair' })).toBeInTheDocument()
    expect(document.documentElement).toHaveClass('dark')
    expect(localStorage.getItem('smartHospitalTheme')).toBe('dark')
  })
})
