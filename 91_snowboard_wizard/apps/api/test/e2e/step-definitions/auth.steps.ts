// auth.steps.ts - Step definitions for auth feature files
import { Given, Then } from '@cucumber/cucumber'
import type { ApiWorld } from '../support/world'

// ── Test user setup ───────────────────────────────────────────────────────────

Given('a valid Google ID token exists for {string}', function(this: ApiWorld, _email: string) {
  return 'pending'
})

Given('I am logged in as {string}', async function(this: ApiWorld, _email: string) {
  return 'pending'
})

Given('I am logged in as {string} with name {string}', async function(this: ApiWorld, _email: string, _name: string) {
  return 'pending'
})

Given('a user with Google ID {string} already exists', async function(this: ApiWorld, _googleId: string) {
  return 'pending'
})

// ── Cookie / token state ──────────────────────────────────────────────────────

Given('my {string} cookie is valid and not expired', function(this: ApiWorld, _cookieName: string) {
  return 'pending'
})

Given('my {string} cookie is not present', function(this: ApiWorld, _cookieName: string) {
  return 'pending'
})

Given('my {string} cookie value has been corrupted', function(this: ApiWorld, _cookieName: string) {
  return 'pending'
})

Given('my {string} was issued 31 days ago', async function(this: ApiWorld, _cookieName: string) {
  return 'pending'
})

Given('I have a valid refresh token in my cookie jar', function(this: ApiWorld) {
  return 'pending'
})

Given('I have no refresh token cookie', function(this: ApiWorld) {
  return 'pending'
})

Given('my access token expired 1 minute ago', function(this: ApiWorld) {
  return 'pending'
})

// ── Assertions ────────────────────────────────────────────────────────────────

Then('only one user record for {string} exists in the database', async function(this: ApiWorld, _email: string) {
  return 'pending'
})

Then("that user's name is {string}", async function(this: ApiWorld, _name: string) {
  return 'pending'
})

Then('a user record for {string} exists in the database', async function(this: ApiWorld, _email: string) {
  return 'pending'
})

Then('the refresh token can no longer be used to refresh the session', async function(this: ApiWorld) {
  return 'pending'
})

// ── Guest session claim ───────────────────────────────────────────────────────

Given('a guest wizard session exists with id {string}', async function(this: ApiWorld, _sessionId: string) {
  return 'pending'
})

Given('that session belongs to no user', async function(this: ApiWorld) {
  return 'pending'
})

Then('the wizard session {string} is now associated with the logged-in user', async function(this: ApiWorld, _sessionId: string) {
  return 'pending'
})

Then('the wizard session {string} is now associated with user id {string}', async function(this: ApiWorld, _sessionId: string, _userId: string) {
  return 'pending'
})

Then('the wizard session {string} still belongs to user id {string}', async function(this: ApiWorld, _sessionId: string, _userId: string) {
  return 'pending'
})

Then('the wizard session {string} still belongs to no user', async function(this: ApiWorld, _sessionId: string) {
  return 'pending'
})
