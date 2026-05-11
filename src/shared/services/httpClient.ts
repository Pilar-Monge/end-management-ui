const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'

export interface ApiEnvelope<T> {
  success: boolean
  data: T
  message?: string
  pagination?: unknown
}

export interface ApiErrorBody {
  message?: string
  statusCode?: number
  error?: string
}

export class ApiHttpError extends Error {
  statusCode: number
  details?: string

  constructor(statusCode: number, message: string, details?: string) {
    super(message)
    this.name = 'ApiHttpError'
    this.statusCode = statusCode
    this.details = details
  }
}

interface RequestOptions extends Omit<RequestInit, 'headers'> {
  withAuth?: boolean
  headers?: Record<string, string>
}

function getToken(): string | null {
  return localStorage.getItem('token')
}

function normalizePath(path: string): string {
  return path.startsWith('/') ? path : `/${path}`
}

async function parseErrorBody(response: Response): Promise<ApiErrorBody | null> {
  try {
    return (await response.json()) as ApiErrorBody
  } catch {
    return null
  }
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { withAuth = true, headers: customHeaders, ...requestOptions } = options

  const headers: Record<string, string> = {
    ...customHeaders,
  }

  if (withAuth) {
    const token = getToken()
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
  }

  if (!(requestOptions.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] ?? 'application/json'
  }

  const response = await fetch(`${API_BASE_URL}${normalizePath(path)}`, {
    ...requestOptions,
    headers,
  })

  if (!response.ok) {
    const errorBody = await parseErrorBody(response)
    const message = errorBody?.message ?? `Request failed with status ${response.status}`
    throw new ApiHttpError(response.status, message, errorBody?.error)
  }

  if (response.status === 204) {
    return undefined as T
  }

  const payload = (await response.json()) as ApiEnvelope<T> | T
  if (payload && typeof payload === 'object' && 'success' in payload && 'data' in payload) {
    return (payload as ApiEnvelope<T>).data
  }

  return payload as T
}
