import { render, screen } from '@testing-library/react'
import { SpecSheet } from '@/components/result/SpecSheet'
import type { SpecSheet as SpecSheetType } from '@snowboard/types'

const mockSpec: SpecSheetType = {
  lengthCm: 155,
  waistWidthMm: 252,
  flexRating: 7,
  flexLabel: 'Stiff',
  shape: 'Directional Twin',
  camberProfile: 'Traditional Camber',
  taperMm: 8,
  sidecutRadius: 'Medium',
  setback: 'Slight',
  baseType: 'Sintered',
  floatPriority: 'Medium',
}

describe('SpecSheet', () => {
  it('renders board length', () => {
    render(<SpecSheet spec={mockSpec} />)
    expect(screen.getByText('155 cm')).toBeInTheDocument()
  })

  it('renders flex label', () => {
    render(<SpecSheet spec={mockSpec} />)
    expect(screen.getByText('Stiff')).toBeInTheDocument()
  })

  it('renders shape', () => {
    render(<SpecSheet spec={mockSpec} />)
    expect(screen.getByText('Directional Twin')).toBeInTheDocument()
  })

  it('renders camber profile', () => {
    render(<SpecSheet spec={mockSpec} />)
    expect(screen.getByText('Traditional Camber')).toBeInTheDocument()
  })
})
