// hooks.ts - Cucumber Before/After lifecycle hooks
import { Before, After, setDefaultTimeout } from '@cucumber/cucumber'
import type { ApiWorld } from './world'

setDefaultTimeout(60_000)

// Reset all per-scenario state before each scenario
Before(function(this: ApiWorld) {
  this.response = null
  this.capturedValues = {}
  this.cookies = ''
  this.skipCsrfOrigin = false
})

// Nothing to tear down yet — HTTP calls against a real server clean up themselves.
// When step implementations land, add DB/Redis cleanup here.
After(function(this: ApiWorld) {
  // placeholder — implementations will add cleanup per scenario tag
})
