import { render, screen } from '@testing-library/react'
import { ProgressTrail } from '@/components/wizard/ProgressTrail'

describe('ProgressTrail', () => {
  it('renders percentage text at 0%', () => {
    render(<ProgressTrail progress={0} />)
    expect(screen.getByText('0%')).toBeInTheDocument()
  })

  it('renders percentage text at 50%', () => {
    render(<ProgressTrail progress={0.5} />)
    expect(screen.getByText('50%')).toBeInTheDocument()
  })

  it('renders percentage text at 100%', () => {
    render(<ProgressTrail progress={1} />)
    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  it('renders an SVG element', () => {
    const { container } = render(<ProgressTrail progress={0.3} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('rounds progress to nearest integer', () => {
    render(<ProgressTrail progress={0.456} />)
    expect(screen.getByText('46%')).toBeInTheDocument()
  })
})
