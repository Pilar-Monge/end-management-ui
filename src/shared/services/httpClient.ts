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

const HTTP_STATUS_MESSAGES: Record<number, string> = {
  400: 'Solicitud invalida. Revisa los datos e intenta nuevamente.',
  401: 'Sesion inactiva o expirada. Inicia sesion para continuar.',
  403: 'No tienes permisos para realizar esta accion.',
  404: 'No se encontro la informacion solicitada.',
  409: 'Conflicto de datos. Actualiza la vista e intenta de nuevo.',
  422: 'Los datos enviados no son validos.',
  429: 'Demasiadas solicitudes. Espera un momento e intenta nuevamente.',
  500: 'Error interno del servidor. Intenta nuevamente en unos minutos.',
  502: 'El servicio no esta disponible temporalmente.',
  503: 'Servicio en mantenimiento. Intenta nuevamente mas tarde.',
  504: 'Tiempo de espera agotado con el servidor.',
}

function getToken(): string | null {
  return localStorage.getItem('token') ?? localStorage.getItem('accessToken')
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
    const message = HTTP_STATUS_MESSAGES[response.status] ?? `Error de servicio (${response.status}). Intenta nuevamente.`
    const details = errorBody?.message ?? errorBody?.error
    throw new ApiHttpError(response.status, message, details)
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
