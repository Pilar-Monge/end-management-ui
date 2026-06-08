import { useState, useCallback } from 'react'
import { loginRequest } from '../../login/services/authApi'
import { normalizeUserRole, getPostLoginRoute } from '../../../shared/services/postLoginRouting'
import { getErrorMessage } from '../../../shared/services/errorMessages'
import { SESSION_TOKEN_CHANGED_EVENT } from '../../../shared/services/sessionService'
import type { LoginErrors, LoginForm } from '../../login/types'

interface UseMainAuthFlowReturn {
  authForm: LoginForm
  setAuthForm: (form: LoginForm) => void
  authErrors: LoginErrors
  setAuthErrors: (errors: LoginErrors) => void
  isAuthenticating: boolean
  setIsAuthenticating: (authenticating: boolean) => void
  selectedCharacter: number | null
  setSelectedCharacter: (index: number | null) => void
  showCharError: boolean
  setShowCharError: (show: boolean) => void
  validateLoginForm: () => boolean
  handleAuthFieldChange: (field: 'username' | 'password', value: string) => void
  handleAuthSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<{ redirectPath: string } | void>
}

export function useMainAuthFlow(): UseMainAuthFlowReturn {
  const [authForm, setAuthForm] = useState<LoginForm>({
    username: '',
    password: '',
    campId: null,
  })
  const [authErrors, setAuthErrors] = useState<LoginErrors>({})
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [selectedCharacter, setSelectedCharacter] = useState<number | null>(null)
  const [showCharError, setShowCharError] = useState(false)

  const validateLoginForm = useCallback((): boolean => {
    const nextErrors: LoginErrors = {}

    if (!authForm.username.trim()) nextErrors.username = 'Campo requerido'
    if (authForm.username.length > 0 && authForm.username.length < 3)
      nextErrors.username = 'Minimo 3 caracteres'

    if (!authForm.password) nextErrors.password = 'Campo requerido'
    if (authForm.password.length > 0 && authForm.password.length < 6)
      nextErrors.password = 'Minimo 6 caracteres'

    if (!authForm.campId || authForm.campId <= 0) {
      nextErrors.campId = 'Debes seleccionar un campamento en el globo'
    }

    setAuthErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }, [authForm])

  const handleAuthFieldChange = useCallback(
    (field: 'username' | 'password', value: string) => {
      setAuthForm((prev) => ({ ...prev, [field]: value }))
      if (authErrors[field]) setAuthErrors((prev) => ({ ...prev, [field]: undefined }))
      if (authErrors.general) setAuthErrors((prev) => ({ ...prev, general: undefined }))
    },
    [authErrors],
  )

  const handleAuthSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()

      if (!validateLoginForm()) return

      setIsAuthenticating(true)
      setAuthErrors({})

      try {
        const response = await loginRequest(authForm)
        const normalizedUser = {
          ...response.user,
          role: normalizeUserRole(response.user.rol),
        }
        const token = response.token ?? response.accessToken
        const savedPath = localStorage.getItem('last_secure_path')

        if (!token) {
          throw new Error('No se recibio token de acceso')
        }

        localStorage.setItem('token', token)
        localStorage.setItem('accessToken', token)
        window.dispatchEvent(new Event(SESSION_TOKEN_CHANGED_EVENT))
        localStorage.setItem('user', JSON.stringify(normalizedUser))
        localStorage.removeItem('admin_settings_v2')
        localStorage.setItem('last_selected_camp_id', String(response.user.campId))

        const sessionMessage = (window.history.state?.usr as { sessionMessage?: string } | undefined)?.sessionMessage
        const redirectPath = getPostLoginRoute(normalizedUser.role, {
          savedPath,
          restoreSavedAdminDashboard: Boolean(sessionMessage),
        })
        localStorage.removeItem('last_secure_path')

        return { redirectPath }
      } catch (error) {
        const message = getErrorMessage(error, 'login')
        setAuthErrors({
          general: message,
        })
      } finally {
        setIsAuthenticating(false)
      }
    },
    [authForm, validateLoginForm],
  )

  return {
    authForm,
    setAuthForm,
    authErrors,
    setAuthErrors,
    isAuthenticating,
    setIsAuthenticating,
    selectedCharacter,
    setSelectedCharacter,
    showCharError,
    setShowCharError,
    validateLoginForm,
    handleAuthFieldChange,
    handleAuthSubmit,
  }
}
