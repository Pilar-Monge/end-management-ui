import type { Camp, LoginApiResponse, LoginForm } from '../types'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'

export async function fetchCamps(): Promise<Camp[]> {
  const res = await fetch(`${BASE_URL}/camps?status=ACTIVE`)
  if (!res.ok) throw new Error('No se pudo cargar la lista de campamentos')

  const data = await res.json()
  return Array.isArray(data) ? data : (data.data ?? [])
}

export async function loginRequest(form: LoginForm): Promise<LoginApiResponse> {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: form.username,
      password: form.password,
      campId: form.campId,
    }),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Error al iniciar sesión')

  const payload = data.data as LoginApiResponse
  const token = payload.token ?? payload.accessToken
  if (!token) {
    throw new Error('Respuesta de login sin token de acceso')
  }

  return {
    ...payload,
    token,
    accessToken: token,
  }
}
