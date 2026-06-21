// sessions.steps.ts - Steps specific to the sessions feature
import request from 'supertest'
import assert from 'node:assert'
import { Given } from '@cucumber/cucumber'
import type { ApiWorld } from '../support/world'

Given('I have saved session {string} with answers and phase {int}:', async function(
  this: ApiWorld,
  sessionId: string,
  phase: number,
  answersJson: string,
) {
  const res = await request(this.baseUrl)
    .put(`/api/sessions/${sessionId}`)
    .set('Origin', this.csrfOrigin()!)
    .set('Content-Type', 'application/json')
    .send({ answers: JSON.parse(answersJson), phase })
  assert.strictEqual(res.status, 200, `setup: failed to save session "${sessionId}": ${JSON.stringify(res.body)}`)
})

Given('I have saved session {string} 7 days and 1 second ago', async function(
  this: ApiWorld,
  _sessionId: string,
) {
  return 'pending'
})
