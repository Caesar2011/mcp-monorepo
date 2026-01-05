import { URLSearchParams } from 'url'

import * as cheerio from 'cheerio'

import { AuthenticationError, HttpError, ParsingError } from './errors.js'

const BASE_URL = 'https://urbansportsclub.com'

export interface HttpClientOptions {
  username?: string
  password?: string
  /**
   * The two-letter language code for the session (e.g., 'de', 'en', 'fr').
   * Defaults to 'de'. Note: Parsing logic currently only supports German literals.
   */
  language?: 'de'
}

/**
 * Manages all HTTP communication, session handling, and authentication logic.
 * @internal
 */
export class InternalHttpClient {
  private sessionCookie: string | undefined
  private isAuthenticating = false
  private readonly lang: string

  constructor(private readonly options: HttpClientOptions) {
    this.lang = options.language ?? 'de'
  }

  /**
   * Checks if a valid session cookie exists.
   */
  public isAuthenticated(): boolean {
    return this.sessionCookie !== undefined
  }

  /**
   * Performs a GET request. Handles authentication retries on 403 errors.
   */
  public async get(path: string, requiresAuth = false): Promise<Response> {
    return this.request(path, { method: 'GET' }, requiresAuth)
  }

  /**
   * Performs a POST request. Handles authentication retries on 403 errors.
   */
  public async post(path: string, body: URLSearchParams, requiresAuth = false): Promise<Response> {
    return this.request(path, { method: 'POST', body }, requiresAuth)
  }

  private _extractPhpSessionId(setCookieHeader: string | null): string | undefined {
    if (!setCookieHeader) {
      return undefined
    }

    // `set-cookie` can have multiple values, often joined by `, `. We need to find the right part.
    const cookies = setCookieHeader.split(',')
    for (const cookieString of cookies) {
      const trimmedCookie = cookieString.trim()
      if (trimmedCookie.startsWith('PHPSESSID=')) {
        return trimmedCookie.split(';')[0]
      }
    }
    return undefined
  }

  /**
   * Ensures the client is authenticated, logging in if necessary.
   * Throws an error if credentials are not provided.
   */
  public async authenticate(): Promise<void> {
    if (this.isAuthenticated() || this.isAuthenticating) {
      return
    }

    this.isAuthenticating = true
    try {
      const { username, password } = this.options
      if (!username || !password) {
        throw new AuthenticationError('Username and password are required for authentication.')
      }

      const loginUrl = `${BASE_URL}/${this.lang}/login`

      // Step 1: GET login page for session cookie and form tokens
      const getResponse = await fetch(loginUrl, {
        headers: { 'User-Agent': 'UrbanSports-SDK/1.0' },
      })

      const initialCookie = this._extractPhpSessionId(getResponse.headers.get('set-cookie'))
      if (!initialCookie) {
        throw new ParsingError('Could not find PHPSESSID cookie in initial login page response.')
      }
      const html = await getResponse.text()

      // Step 2: Parse hidden form fields
      const params = this._extractHiddenFormFields(html, `/${this.lang}/login`)
      params.append('email', username)
      params.append('password', password)
      params.append('remember-me', '1')

      // Step 3: POST to login
      const loginResponse = await fetch(loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'UrbanSports-SDK/1.0',
          Cookie: initialCookie,
        },
        body: params,
        redirect: 'manual', // Important: we need to inspect the 302 redirect
      })

      // Step 4: Verify login success and get the authoritative cookie
      if (loginResponse.status === 302 && loginResponse.headers.get('location')?.includes('/profile')) {
        const authenticatedCookie = this._extractPhpSessionId(loginResponse.headers.get('set-cookie'))
        this.sessionCookie = authenticatedCookie ?? initialCookie
      } else {
        this.sessionCookie = undefined
        throw new AuthenticationError('Login failed. Please check your credentials.')
      }
    } finally {
      this.isAuthenticating = false
    }
  }

  /**
   * Core request method with retry logic for authentication.
   */
  private async request(path: string, init: RequestInit, requiresAuth: boolean, isRetry = false): Promise<Response> {
    if (requiresAuth && !this.isAuthenticated()) {
      await this.authenticate()
    }

    const headers = new Headers(init.headers)
    headers.set('User-Agent', 'UrbanSports-SDK/1.0')
    // eslint-disable-next-line use-logger-not-console/replace-console-with-logger
    console.log('session cookie', this.sessionCookie)
    if (this.sessionCookie) {
      headers.set('Cookie', this.sessionCookie)
    }
    // API expects these headers for AJAX requests
    const isAjaxPath = /^\/(activities|studios-map|profile\/check-ins|search\/(book|cancel)\/\d+)/.test(path)
    if (isAjaxPath) {
      headers.set('Accept', 'application/json')
      headers.set('X-Requested-With', 'XMLHttpRequest')
    }

    const url = `${BASE_URL}/${this.lang}${path}`
    const response = await fetch(url, { ...init, headers })

    if (!response.ok) {
      // If we get a 403, our session is likely invalid.
      if (response.status === 403 && requiresAuth && !isRetry) {
        this.sessionCookie = undefined // Invalidate session
        await this.authenticate() // Re-authenticate
        return this.request(path, init, requiresAuth, true) // Retry once
      }
      throw new HttpError(`Request failed with status ${response.status}`, response.status, url)
    }

    return response
  }

  private _extractHiddenFormFields(html: string, formAction: string): URLSearchParams {
    const params = new URLSearchParams()
    const $ = cheerio.load(html)
    const form = $(`form[action="${formAction}"]`)
    if (form.length === 0) {
      throw new ParsingError(`Could not find form with action="${formAction}" in HTML content.`)
    }

    form.find('input[type="hidden"]').each((_, element) => {
      const name = $(element).attr('name')
      const value = $(element).attr('value')
      if (name) {
        params.append(name, value ?? '')
      }
    })

    return params
  }
}
