// sessions.steps.ts - Steps specific to the sessions feature
import { Given } from '@cucumber/cucumber'
import type { ApiWorld } from '../support/world'

Given('I have saved session {string} with answers and phase {int}:', async function(
  this: ApiWorld,
  _sessionId: string,
  _phase: number,
  _answersJson: string,
) {
  return 'pending'
})

Given('I have saved session {string} 7 days and 1 second ago', async function(
  this: ApiWorld,
  _sessionId: string,
) {
  return 'pending'
})
