export type SessionUser = { id: string; name: string; email: string; role: 'CITIZEN' | 'AUTHORITY' | 'ADMIN' }
export type Session = { token: string; user: SessionUser }

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim()
if (!configuredApiUrl) throw new Error('VITE_API_URL is required to start the admin dashboard.')
const apiBaseUrl = configuredApiUrl.replace(/\/+$/, '')
const sessionKey = 'civicfix-admin-session'

export class ApiClientError extends Error {
  readonly status: number
  readonly code?: string
  constructor(message: string, status: number, code?: string) { super(message); this.status = status; this.code = code }
}

export function getApiBaseUrl() { return apiBaseUrl }
export function getSession(): Session | undefined {
  try {
    const value = sessionStorage.getItem(sessionKey)
    if (!value) return undefined
    const session = JSON.parse(value) as Session
    return session.token && session.user ? session : undefined
  } catch {
    sessionStorage.removeItem(sessionKey)
    return undefined
  }
}
export function setSession(session: Session) { sessionStorage.setItem(sessionKey, JSON.stringify(session)) }
export function clearSession() { sessionStorage.removeItem(sessionKey); window.dispatchEvent(new Event('civicfix:session-cleared')) }

export async function apiRequest<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)
  let response: Response
  try { response = await fetch(`${apiBaseUrl}${path}`, { ...init, headers }) }
  catch { throw new ApiClientError('The CivicFix API could not be reached.', 0, 'NETWORK_ERROR') }
  const payload = await response.json().catch(() => ({})) as { message?: string; error?: string; data?: T }
  if (!response.ok) {
    if (response.status === 401 && token) clearSession()
    throw new ApiClientError(payload.message ?? 'The CivicFix API rejected the request.', response.status, payload.error)
  }
  return payload.data as T
}

export async function downloadApiFile(path: string, token: string) {
  const response = await fetch(`${apiBaseUrl}${path}`, { headers: { Accept: 'text/csv', Authorization: `Bearer ${token}` } })
  if (!response.ok) throw new ApiClientError('The report could not be downloaded.', response.status)
  return response.blob()
}

export async function login(email: string, password: string) {
  const data = await apiRequest<{ token: string; user: SessionUser }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
  if (data.user.role !== 'ADMIN') throw new ApiClientError('This account does not have administrator access.', 403, 'FORBIDDEN')
  const session = { token: data.token, user: data.user }
  setSession(session)
  return session
}
