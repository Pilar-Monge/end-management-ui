import { ApiHttpError } from './httpClient'

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

const CONTEXT_DEFAULT_MESSAGES: Record<string, string> = {
  login: 'No se pudo iniciar sesion. Verifica tus credenciales e intenta nuevamente.',
  load_dashboard: 'No se pudo cargar la informacion del panel.',
  update_admission: 'No se pudo actualizar la admision.',
  complete_expedition: 'No se pudo completar la expedicion.',
  intercamp_lookup: 'No se pudo consultar el registro inter-campamento.',
  update_intercamp: 'No se pudo actualizar la solicitud inter-campamento.',
  delete_person: 'No se pudo eliminar la persona.',
  update_person: 'No se pudo actualizar la persona.',
}

export function getErrorMessage(error: unknown, context: string, fallback?: string): string {
  if (error instanceof ApiHttpError) {
    if (error.details?.trim()) return error.details.trim()
    return HTTP_STATUS_MESSAGES[error.statusCode] ?? (fallback ?? CONTEXT_DEFAULT_MESSAGES[context] ?? 'Ocurrio un error inesperado.')
  }

  if (error instanceof Error) {
    const normalized = error.message.trim().toLowerCase()
    if (normalized.includes('failed to fetch') || normalized.includes('networkerror')) {
      return 'No se pudo conectar con el servidor. Verifica tu conexion e intenta nuevamente.'
    }

    if (normalized.includes('timeout') || normalized.includes('timed out')) {
      return 'La solicitud tardo demasiado. Intenta nuevamente.'
    }

    if (error.message && error.message.trim() && error.message !== 'Error') {
      return error.message.trim()
    }
  }

  return fallback ?? CONTEXT_DEFAULT_MESSAGES[context] ?? 'Ocurrio un error inesperado.'
}
