import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LiveScoreSidebar } from '@/components/wizard/LiveScoreSidebar'
import { useWizardStore } from '@/store/wizard-store'

beforeEach(() => {
  useWizardStore.getState().resetWizard()
})

describe('LiveScoreSidebar', () => {
  it('shows empty state message when no scores are present', () => {
    render(<LiveScoreSidebar />)
    expect(
      screen.getAllByText(/answer questions to see your live profile/i)[0]
    ).toBeInTheDocument()
  })

  it('renders score bars when scores are present', () => {
    act(() => {
      useWizardStore.getState().setScores({ flex: 7.5, length: 12.0 })
    })
    render(<LiveScoreSidebar />)
    // Desktop sidebar shows score labels
    expect(screen.getAllByText('Flex Rating')[0]).toBeInTheDocument()
    expect(screen.getAllByText('Board Length')[0]).toBeInTheDocument()
  })

  it('renders numeric score values', () => {
    act(() => {
      useWizardStore.getState().setScores({ flex: 7.5 })
    })
    render(<LiveScoreSidebar />)
    expect(screen.getAllByText('7.5')[0]).toBeInTheDocument()
  })

  it('renders Live Profile button for mobile drawer trigger', () => {
    render(<LiveScoreSidebar />)
    expect(screen.getByRole('button', { name: /live profile/i })).toBeInTheDocument()
  })

  it('opens the drawer when mobile button is clicked', async () => {
    render(<LiveScoreSidebar />)
    const button = screen.getByRole('button', { name: /live profile/i })
    await userEvent.click(button)
    // Drawer renders duplicate content
    const headings = screen.getAllByText(/live profile/i)
    expect(headings.length).toBeGreaterThan(1)
  })
})
