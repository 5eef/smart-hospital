import { beforeEach, describe, expect, it, vi } from 'vitest'
import { downloadCsv, downloadPdfReport } from './exportUtils'

function readBlob(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsText(blob)
  })
}

describe('export utilities', () => {
  let downloadedBlob

  beforeEach(() => {
    downloadedBlob = null
    URL.createObjectURL = vi.fn((blob) => {
      downloadedBlob = blob
      return 'blob:smart-hospital-test'
    })
    URL.revokeObjectURL = vi.fn()
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  })

  it('generates escaped CSV data and revokes the temporary URL', async () => {
    downloadCsv('patients.csv', [['Nom', 'Note'], ['Dupont', 'Dit "urgent"']])

    expect(downloadedBlob.type).toBe('text/csv;charset=utf-8')
    expect(await readBlob(downloadedBlob)).toBe('"Nom","Note"\n"Dupont","Dit ""urgent"""')
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:smart-hospital-test')
  })

  it('generates a structurally complete PDF with safely escaped text', async () => {
    downloadPdfReport('rapport.pdf', 'Résumé (clinique)', ['Activité: élevée'])
    const content = await readBlob(downloadedBlob)

    expect(downloadedBlob.type).toBe('application/pdf')
    expect(content).toContain('%PDF-1.4')
    expect(content).toContain('Resume \\(clinique\\)')
    expect(content).toContain('%%EOF')
  })
})
