import type { ApiErrorBody, ApiSuccess, Platform } from './types'

export const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ||
  'http://localhost:3000'

const LS = {
  access: 'ppeum.accessToken',
  refresh: 'ppeum.refreshToken',
  platform: 'ppeum.platform',
  lang: 'ppeum.lang',
} as const

export const tokenStore = {
  get access() {
    return localStorage.getItem(LS.access) || ''
  },
  get refresh() {
    return localStorage.getItem(LS.refresh) || ''
  },
  get platform(): Platform {
    return (localStorage.getItem(LS.platform) as Platform) || 'admin'
  },
  get lang() {
    return localStorage.getItem(LS.lang) || 'ko'
  },
  set(access: string, refresh: string, platform: Platform) {
    localStorage.setItem(LS.access, access)
    localStorage.setItem(LS.refresh, refresh)
    localStorage.setItem(LS.platform, platform)
  },
  setAccess(access: string) {
    localStorage.setItem(LS.access, access)
  },
  setLang(lang: string) {
    localStorage.setItem(LS.lang, lang)
  },
  clear() {
    localStorage.removeItem(LS.access)
    localStorage.removeItem(LS.refresh)
  },
}

export class ApiError extends Error {
  status: number
  code: string
  field?: string
  constructor(status: number, code: string, message: string, field?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.field = field
  }
}

interface RequestOptions {
  query?: Record<string, unknown>
  body?: unknown
  form?: FormData
  sendRefresh?: boolean // x-refresh-token 헤더 첨부
  auth?: boolean // Authorization 헤더 첨부 (기본 true)
  signal?: AbortSignal
}

function buildUrl(path: string, query?: Record<string, unknown>): string {
  const url = new URL(API_BASE_URL + path)
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === '') continue
      if (Array.isArray(v)) v.forEach((item) => url.searchParams.append(k, String(item)))
      else url.searchParams.append(k, String(v))
    }
  }
  return url.toString()
}

let refreshing: Promise<boolean> | null = null

async function tryRefresh(): Promise<boolean> {
  if (!tokenStore.refresh) return false
  if (refreshing) return refreshing
  refreshing = (async () => {
    try {
      const res = await fetch(
        buildUrl(`/api/v1/auth/${tokenStore.platform}/refresh`),
        {
          method: 'POST',
          headers: { 'x-refresh-token': tokenStore.refresh },
        },
      )
      if (!res.ok) return false
      const json = (await res.json()) as ApiSuccess<{ accessToken: string } | string>
      const newAccess =
        typeof json.data === 'string' ? json.data : json.data?.accessToken
      if (!newAccess) return false
      tokenStore.setAccess(newAccess)
      return true
    } catch {
      return false
    } finally {
      refreshing = null
    }
  })()
  return refreshing
}

async function rawRequest<T>(
  method: string,
  path: string,
  opts: RequestOptions,
  isRetry = false,
): Promise<T> {
  const headers: Record<string, string> = {}
  if (tokenStore.lang) headers['lang'] = tokenStore.lang
  if (opts.auth !== false && tokenStore.access)
    headers['Authorization'] = `Bearer ${tokenStore.access}`
  if (opts.sendRefresh && tokenStore.refresh)
    headers['x-refresh-token'] = tokenStore.refresh

  let body: BodyInit | undefined
  if (opts.form) {
    body = opts.form
  } else if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(opts.body)
  }

  const res = await fetch(buildUrl(path, opts.query), {
    method,
    headers,
    body,
    signal: opts.signal,
  })

  // 401 → 1회 토큰 갱신 후 재시도
  if (res.status === 401 && !isRetry && opts.auth !== false && tokenStore.refresh) {
    const ok = await tryRefresh()
    if (ok) return rawRequest<T>(method, path, opts, true)
  }

  const text = await res.text()
  let json: unknown
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = text
  }

  if (!res.ok) {
    const errBody = json as ApiErrorBody | null
    const err = errBody?.error
    throw new ApiError(
      res.status,
      err?.code || 'UNKNOWN',
      err?.message || res.statusText || '요청에 실패했습니다.',
      err?.options?.field,
    )
  }

  const success = json as ApiSuccess<T>
  return success?.data as T
}

export const api = {
  get: <T>(path: string, query?: Record<string, unknown>) =>
    rawRequest<T>('GET', path, { query }),
  post: <T>(path: string, body?: unknown, extra?: Partial<RequestOptions>) =>
    rawRequest<T>('POST', path, { body, ...extra }),
  put: <T>(path: string, body?: unknown) => rawRequest<T>('PUT', path, { body }),
  patch: <T>(path: string, body?: unknown) => rawRequest<T>('PATCH', path, { body }),
  del: <T>(path: string, body?: unknown) => rawRequest<T>('DELETE', path, { body }),
  upload: <T>(method: 'POST' | 'PUT', path: string, form: FormData) =>
    rawRequest<T>(method, path, { form }),
  // 인증 전용 (Authorization 미첨부 또는 refresh 헤더)
  login: <T>(platform: Platform, body: unknown) =>
    rawRequest<T>('POST', `/api/v1/auth/${platform}/login`, { body, auth: false }),
  logout: <T>(platform: Platform) =>
    rawRequest<T>('POST', `/api/v1/auth/${platform}/logout`, { sendRefresh: true }),
}
