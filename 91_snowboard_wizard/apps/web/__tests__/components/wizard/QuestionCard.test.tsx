import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QuestionCard } from '@/components/wizard/QuestionCard'

const mockOptionQuestion = {
  id: 'height_category',
  phase: 1 as const,
  text: 'What is your height?',
  options: [
    { id: 'h_171_180', text: '171–180 cm', weights: {} },
    { id: 'over_190', text: 'Over 190 cm', weights: {} },
  ],
}

describe('QuestionCard', () => {
  it('renders the question text', () => {
    render(<QuestionCard question={mockOptionQuestion} onAnswer={jest.fn()} onBack={jest.fn()} />)
    expect(screen.getByText('What is your height?')).toBeInTheDocument()
  })

  it('renders all options', () => {
    render(<QuestionCard question={mockOptionQuestion} onAnswer={jest.fn()} onBack={jest.fn()} />)
    expect(screen.getByText('171–180 cm')).toBeInTheDocument()
    expect(screen.getByText('Over 190 cm')).toBeInTheDocument()
  })

  it('calls onAnswer with the selected option id', async () => {
    const onAnswer = jest.fn()
    render(<QuestionCard question={mockOptionQuestion} onAnswer={onAnswer} onBack={jest.fn()} />)
    await userEvent.click(screen.getByText('171–180 cm'))
    expect(onAnswer).toHaveBeenCalledWith('height_category', 'h_171_180')
  })

  it('calls onBack when back button clicked', async () => {
    const onBack = jest.fn()
    render(<QuestionCard question={mockOptionQuestion} onAnswer={jest.fn()} onBack={onBack} />)
    await userEvent.click(screen.getByRole('button', { name: /back/i }))
    expect(onBack).toHaveBeenCalled()
  })
})
