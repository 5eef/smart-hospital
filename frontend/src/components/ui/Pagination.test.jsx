import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Pagination } from './Pagination'

describe('Pagination', () => {
  it('hides a single page and navigates within a multi-page result', () => {
    const onPageChange = vi.fn()
    const { rerender } = render(<Pagination pagination={{ currentPage: 1, lastPage: 1, total: 1 }} onPageChange={onPageChange} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()

    rerender(<Pagination pagination={{ currentPage: 2, lastPage: 3, total: 25 }} onPageChange={onPageChange} />)
    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[0])
    fireEvent.click(buttons[1])

    expect(onPageChange).toHaveBeenNthCalledWith(1, 1)
    expect(onPageChange).toHaveBeenNthCalledWith(2, 3)
  })
})
