// common.steps.ts - Shared step definitions: HTTP calls, assertions, cookie helpers
import { Given, When, Then, DataTable } from '@cucumber/cucumber'
import type { ApiWorld } from '../support/world'

// ── Setup / Context ──────────────────────────────────────────────────────────

Given('the API is running', async function(this: ApiWorld) {
  return 'pending'
})

Given('I have no auth credentials', function(this: ApiWorld) {
  return 'pending'
})

Given('the next request will have no Origin or Referer header', function(this: ApiWorld) {
  return 'pending'
})

// ── GET requests ─────────────────────────────────────────────────────────────

When('I send GET {string}', async function(this: ApiWorld, _path: string) {
  return 'pending'
})

When('I send GET {string} without auth credentials', async function(this: ApiWorld, _path: string) {
  return 'pending'
})

When('I send GET {string} with my access token', async function(this: ApiWorld, _path: string) {
  return 'pending'
})

When('I send GET {string} with a tampered JWT in the Authorization header', async function(this: ApiWorld, _path: string) {
  return 'pending'
})

// Intercept bare path steps used in feature files (e.g. "I send GET /api/health")
When(/^I send GET \/api\/health$/, async function(this: ApiWorld) {
  return 'pending'
})

When(/^I send GET \/api\/auth\/me with my access token$/, async function(this: ApiWorld) {
  return 'pending'
})

When(/^I send GET \/api\/auth\/me without auth credentials$/, async function(this: ApiWorld) {
  return 'pending'
})

When(/^I send GET \/api\/auth\/me with a tampered JWT in the Authorization header$/, async function(this: ApiWorld) {
  return 'pending'
})

When(/^I send GET \/api\/sessions\/(.+)$/, async function(this: ApiWorld, _id: string) {
  return 'pending'
})

When(/^I send GET \/api\/recommendations\/([^/]+)\/pdf$/, async function(this: ApiWorld, _id: string) {
  return 'pending'
})

When(/^I send GET \/api\/recommendations\/share\/(.+) without auth credentials$/, async function(this: ApiWorld, _token: string) {
  return 'pending'
})

When(/^I send GET \/api\/recommendations\/([^/]+) without auth credentials$/, async function(this: ApiWorld, _id: string) {
  return 'pending'
})

When(/^I send GET \/api\/recommendations\/([^/]+) with my access token$/, async function(this: ApiWorld, _id: string) {
  return 'pending'
})

// ── POST requests ─────────────────────────────────────────────────────────────

When(/^I send POST \/api\/auth\/google with body:$/, async function(this: ApiWorld, _table: DataTable) {
  return 'pending'
})

When(/^I send POST \/api\/auth\/google with an empty body$/, async function(this: ApiWorld) {
  return 'pending'
})

When(/^I send POST \/api\/auth\/refresh$/, async function(this: ApiWorld) {
  return 'pending'
})

When(/^I send POST \/api\/auth\/refresh with no Origin or Referer header$/, async function(this: ApiWorld) {
  return 'pending'
})

When(/^I send POST \/api\/auth\/logout$/, async function(this: ApiWorld) {
  return 'pending'
})

When(/^I send POST \/api\/score with JSON body:$/, async function(this: ApiWorld, _body: string) {
  return 'pending'
})

When(/^I send POST \/api\/score with an empty body$/, async function(this: ApiWorld) {
  return 'pending'
})

When(/^I send POST \/api\/recommendations with JSON body:$/, async function(this: ApiWorld, _body: string) {
  return 'pending'
})

When(/^I send POST \/api\/recommendations with my access token and JSON body:$/, async function(this: ApiWorld, _body: string) {
  return 'pending'
})

// ── PUT requests ──────────────────────────────────────────────────────────────

When(/^I send PUT \/api\/sessions\/(.+) with JSON body:$/, async function(this: ApiWorld, _id: string, _body: string) {
  return 'pending'
})

// ── Response assertions ───────────────────────────────────────────────────────

Then('the response status is {int}', function(this: ApiWorld, _expectedStatus: number) {
  return 'pending'
})

Then('the response body field {string} is {string}', function(this: ApiWorld, _field: string, _value: string) {
  return 'pending'
})

Then('the response body field {string} is the number {int}', function(this: ApiWorld, _field: string, _value: number) {
  return 'pending'
})

Then('the response body field {string} is greater than {int}', function(this: ApiWorld, _field: string, _threshold: number) {
  return 'pending'
})

Then('the response body field {string} is less than {int}', function(this: ApiWorld, _field: string, _threshold: number) {
  return 'pending'
})

Then('the response body field {string} is a non-empty string', function(this: ApiWorld, _field: string) {
  return 'pending'
})

Then('the response body field {string} is a non-empty UUID', function(this: ApiWorld, _field: string) {
  return 'pending'
})

Then('the response body field {string} is a number', function(this: ApiWorld, _field: string) {
  return 'pending'
})

Then('the response body field {string} is a number between {int} and {int}', function(this: ApiWorld, _field: string, _min: number, _max: number) {
  return 'pending'
})

Then('the response body field {string} is an object', function(this: ApiWorld, _field: string) {
  return 'pending'
})

Then('the response body field {string} matches the pattern {string}', function(this: ApiWorld, _field: string, _pattern: string) {
  return 'pending'
})

Then('the response body field {string} is one of {string}', function(this: ApiWorld, _field: string, _csv: string) {
  // csv is comma-separated: "twin,directional-twin,directional"
  return 'pending'
})

Then('the response body does not contain the field {string}', function(this: ApiWorld, _field: string) {
  return 'pending'
})

Then('the response body is null', function(this: ApiWorld) {
  return 'pending'
})

// ── Cookie assertions ─────────────────────────────────────────────────────────

Then('the response sets an httpOnly cookie named {string}', function(this: ApiWorld, _name: string) {
  return 'pending'
})

Then('the response sets a new httpOnly {string} cookie', function(this: ApiWorld, _name: string) {
  return 'pending'
})

Then('the {string} cookie is cleared', function(this: ApiWorld, _name: string) {
  return 'pending'
})

Then('no auth cookies are set', function(this: ApiWorld) {
  return 'pending'
})

// ── Value capture ─────────────────────────────────────────────────────────────

// "And I capture..." inherits the previous keyword (Given/When/Then), so one registration covers all forms.
Then('I capture the {string} from the response as {string}', function(this: ApiWorld, _field: string, _alias: string) {
  return 'pending'
})

Then('the captured values {string} and {string} are different', function(this: ApiWorld, _a: string, _b: string) {
  return 'pending'
})

Then('the captured value {string} matches the pattern {string}', function(this: ApiWorld, _alias: string, _pattern: string) {
  return 'pending'
})
