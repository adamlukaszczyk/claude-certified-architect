// world.ts - Shared test state passed between Cucumber steps
import { World, IWorldOptions, setWorldConstructor } from '@cucumber/cucumber'

export interface StoredResponse {
  status: number
  body: unknown
  headers: Record<string, string | string[]>
}

export class ApiWorld extends World {
  readonly baseUrl: string
  readonly apiOrigin: string
  response: StoredResponse | null = null
  capturedValues: Record<string, string> = {}
  // Raw cookie header string built up across responses
  cookies: string = ''
  // Set to true in CSRF test steps before the next HTTP call
  skipCsrfOrigin: boolean = false

  constructor(options: IWorldOptions) {
    super(options)
    this.baseUrl = process.env.API_URL ?? 'http://localhost:3002'
    this.apiOrigin = process.env.API_ORIGIN ?? 'http://localhost:3000'
  }

  /**
   * Read a nested field using dot-notation from any object.
   * Returns undefined if any segment is missing.
   */
  getField(obj: unknown, path: string): unknown {
    return path.split('.').reduce((acc: unknown, key: string) => {
      if (acc == null || typeof acc !== 'object') return undefined
      return (acc as Record<string, unknown>)[key]
    }, obj)
  }

  /**
   * Replace <var-name> placeholders with values stored in capturedValues.
   * Used in journey scenarios where a step captures a value and later steps reference it.
   */
  resolve(text: string): string {
    return text.replace(/<([^>]+)>/g, (_match: string, name: string) => {
      return this.capturedValues[name] ?? `<${name}>`
    })
  }

  /** Store a Set-Cookie header's name=value pairs into the cookie jar. */
  storeSetCookie(setCookieHeader: string | string[] | undefined): void {
    if (!setCookieHeader) return
    const headers = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader]
    const pairs = headers.map(h => h.split(';')[0].trim())
    // Merge: replace existing cookies with same name, add new ones
    const jar: Record<string, string> = {}
    if (this.cookies) {
      this.cookies.split('; ').forEach(pair => {
        const [name] = pair.split('=')
        jar[name] = pair
      })
    }
    pairs.forEach(pair => {
      const [name] = pair.split('=')
      jar[name] = pair
    })
    this.cookies = Object.values(jar).join('; ')
  }

  /** Remove a named cookie from the jar (simulates a cleared cookie). */
  clearCookie(name: string): void {
    const parts = this.cookies
      .split('; ')
      .filter(pair => !pair.startsWith(`${name}=`))
    this.cookies = parts.join('; ')
  }

  /** Build the default CSRF origin header for state-changing requests. */
  csrfOrigin(): string | undefined {
    return this.skipCsrfOrigin ? undefined : this.apiOrigin
  }
}

setWorldConstructor(ApiWorld)
