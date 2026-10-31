import { loadQuestions, SCHEMA_ROOT } from '@snowboard/wizard-schema'
import { WizardShell } from '@/components/wizard/WizardShell'

export default function WizardPage() {
  const questions = loadQuestions(SCHEMA_ROOT)
  return <WizardShell questions={questions} />
}
