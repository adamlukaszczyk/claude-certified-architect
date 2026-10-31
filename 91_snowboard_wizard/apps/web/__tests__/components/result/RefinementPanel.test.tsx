// RefinementPanel.test.tsx - Tests for answer refinement accordion
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RefinementPanel } from '@/components/result/RefinementPanel'
import { useWizardStore } from '@/store/wizard-store'

const mockQuestions = [
  {
    id: 'height_category',
    phase: 1 as const,
    text: 'What is your height?',
    options: [
      { id: 'h_171_180', text: '171–180 cm', weights: {} },
      { id: 'over_190', text: 'Over 190 cm', weights: {} },
    ],
  },
]

beforeEach(() => {
  useWizardStore.getState().resetWizard()
  useWizardStore.getState().answerQuestion('height_category', 'h_171_180')
})

describe('RefinementPanel', () => {
  it('renders the answered question text', () => {
    render(<RefinementPanel questions={mockQuestions as any} />)
    expect(screen.getByText('What is your height?')).toBeInTheDocument()
  })

  it('shows current answer', () => {
    render(<RefinementPanel questions={mockQuestions as any} />)
    expect(screen.getByText('171–180 cm')).toBeInTheDocument()
  })

  it('clicking an option calls editAnswer on the store', async () => {
    const spy = jest.spyOn(useWizardStore.getState(), 'editAnswer')
    render(<RefinementPanel questions={mockQuestions as any} />)

    // Expand accordion
    await userEvent.click(screen.getByText('What is your height?'))
    await userEvent.click(screen.getByText('Over 190 cm'))

    expect(spy).toHaveBeenCalledWith('height_category', 'over_190', mockQuestions)
  })
})
