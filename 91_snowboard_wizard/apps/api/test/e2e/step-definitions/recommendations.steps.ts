// recommendations.steps.ts - Steps specific to recommendations features
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
  _shareToken: string,
) {
  return 'pending'
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
