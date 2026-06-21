// recommendations.steps.ts - Steps specific to recommendations features
import request from 'supertest'
import assert from 'node:assert'
import { Given, Then } from '@cucumber/cucumber'
import type { ApiWorld } from '../support/world'

// ── Database setup steps ──────────────────────────────────────────────────────

Given('a recommendation exists in the database with id {string} belonging to {string}', async function(
  this: ApiWorld,
  _id: string,
  _ownerEmail: string,
) {
  return 'pending'
})

Given('a recommendation exists in the database with shareToken {string}', async function(
  this: ApiWorld,
  tokenAlias: string,
) {
  const res = await request(this.baseUrl)
    .post('/api/recommendations')
    .set('Origin', this.csrfOrigin()!)
    .set('Content-Type', 'application/json')
    .send({ answers: { experience: 'intermediate', style: 'all-mountain', weightCategory: 'w_71_85' } })
  assert.strictEqual(res.status, 201, `setup: failed to create recommendation: ${JSON.stringify(res.body)}`)
  this.capturedValues[tokenAlias] = res.body.shareToken
})

// ── Assertion steps ───────────────────────────────────────────────────────────

Then('the wizard session for this recommendation is associated with {string}', async function(
  this: ApiWorld,
  _ownerEmail: string,
) {
  return 'pending'
})

Then('the session name is {string}', async function(this: ApiWorld, _name: string) {
  return 'pending'
})
