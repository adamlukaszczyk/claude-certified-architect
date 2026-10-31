// health.steps.ts - Steps specific to the health feature
import { Given } from '@cucumber/cucumber'
import type { ApiWorld } from '../support/world'

Given('PostgreSQL is reachable', function(this: ApiWorld) {
  // no-op: assumes live stack is healthy
})

Given('Redis is reachable', function(this: ApiWorld) {
  // no-op: assumes live stack is healthy
})

Given('PostgreSQL is not reachable', function(this: ApiWorld) {
  return 'pending'
})

Given('Redis is not reachable', function(this: ApiWorld) {
  return 'pending'
})

Given('the ANTHROPIC_API_KEY environment variable is empty', function(this: ApiWorld) {
  return 'pending'
})

Given('the GOOGLE_CLIENT_ID environment variable is set to an invalid value', function(this: ApiWorld) {
  return 'pending'
})
