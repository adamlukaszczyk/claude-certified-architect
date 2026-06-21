// scoring.steps.ts - Steps specific to the scoring feature
// Most scoring steps use common When/Then patterns.
// This file holds only scoring-specific Given steps and
// the Scenario Outline parameter variants.
import { Then } from '@cucumber/cucumber'
import type { ApiWorld } from '../support/world'

// The Scenario Outline uses "less than" / "greater than" as plain text
// in the step — those are handled by common.steps.ts's numeric comparison
// steps. No additional steps needed for scoring.feature beyond what
// common.steps.ts provides.

// Placeholder export to prevent "empty module" TypeScript errors.
export {}
