import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ApocInput } from '../components/ApocInput'
import { LandingGhosts } from '../components/LandingGhosts'
import { HudCorners, Scanlines } from '../components/BackgroundEffects'
import { loginRequest } from '../services/authApi'
import { SESSION_TOKEN_CHANGED_EVENT } from '../../../shared/services/sessionService'
import { getPostLoginRoute, normalizeUserRole } from '../../../shared/services/postLoginRouting'
import { getErrorMessage } from '../../../shared/services/errorMessages'
import { useAuthState } from '../../../shared/context/AuthContext'
import { PopupMessage } from '../../../shared/components/PopupMessage'
import type { LoginErrors, LoginForm } from '../types'

const LAST_SELECTED_CAMP_ID_KEY = 'last_selected_camp_id'

export default function LoginPage() {
  const navigate = useNavigate()
  const authState = useAuthState()

  const [form, setForm] = useState<LoginForm>({ username: '', password: '', campId: null })
  const [errors, setErrors] = useState<LoginErrors>({})
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showLoginForm, setShowLoginForm] = useState(false)
  const [cinematicPulse, setCinematicPulse] = useState(0)
  const [popupMessage, setPopupMessage] = useState<string | null>(null)

  useEffect(() => {
    if (authState?.selectedCampId && authState.selectedCampId > 0) {
      setForm((prev) => ({ ...prev, campId: authState.selectedCampId }))
      localStorage.setItem(LAST_SELECTED_CAMP_ID_KEY, String(authState.selectedCampId))
      return
    }

    const storedCampIdRaw = localStorage.getItem(LAST_SELECTED_CAMP_ID_KEY)
    const storedCampId = storedCampIdRaw ? Number(storedCampIdRaw) : NaN
    if (Number.isFinite(storedCampId) && storedCampId > 0) {
      setForm((prev) => ({ ...prev, campId: storedCampId }))
      return
    }

    const rawUser = localStorage.getItem('user')
    if (!rawUser) return
    try {
      const parsed = JSON.parse(rawUser) as { campId?: number }
      if (typeof parsed.campId === 'number' && parsed.campId > 0) {
        setForm((prev) => ({ ...prev, campId: parsed.campId }))
        localStorage.setItem(LAST_SELECTED_CAMP_ID_KEY, String(parsed.campId))
      }
    } catch {    }
  }, [authState?.selectedCampId])

  function validate(): boolean {
    const nextErrors: LoginErrors = {}

    if (!form.username.trim()) nextErrors.username = 'Campo requerido'
    if (form.username.length > 0 && form.username.length < 3)
      nextErrors.username = 'Mínimo 3 caracteres'

    if (!form.password) nextErrors.password = 'Campo requerido'
    if (form.password.length > 0 && form.password.length < 6)
      nextErrors.password = 'Mínimo 6 caracteres'

    if (!form.campId || form.campId <= 0) nextErrors.general = 'Debes seleccionar un campamento antes de iniciar sesion'

    setErrors(nextErrors)
    if (nextErrors.general) setPopupMessage(nextErrors.general)
    return Object.keys(nextErrors).length === 0
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!validate()) return

    setLoading(true)
    setErrors({})

    try {
      const response = await loginRequest(form)
      const normalizedUser = {
        ...response.user,
        role: normalizeUserRole(response.user.rol),
      }
      const token = response.token ?? response.accessToken
      const savedPath = localStorage.getItem('last_secure_path')

      if (!token) {
        throw new Error('No se recibió token de acceso')
      }

      localStorage.setItem('token', token)
      localStorage.setItem('accessToken', token)
      localStorage.setItem('user', JSON.stringify(normalizedUser))
      localStorage.setItem(LAST_SELECTED_CAMP_ID_KEY, String(response.user.campId))
      window.dispatchEvent(new Event(SESSION_TOKEN_CHANGED_EVENT))

      const defaultRoute = getPostLoginRoute(normalizedUser.role)
      const redirectPath =
        normalizedUser.role === 'SYSTEM_ADMIN' && savedPath?.startsWith('/admin-dashboard')
          ? savedPath
          : defaultRoute
      localStorage.removeItem('last_secure_path')
      
      localStorage.setItem('postLoadingRoute', redirectPath)
      
  
      navigate('/loading', { replace: true })
    } catch (error) {
      const message = getErrorMessage(error, 'login')
      setErrors({
        general: message,
      })
      setPopupMessage(message)
    } finally {
      setLoading(false)
    }
  }

  function handleSetField(field: keyof LoginForm) {
    return (value: string) => {
      setForm((prev) => ({ ...prev, [field]: value }))
      if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  return (
    <div
      style={{
        width: '100vw',
        minHeight: '100vh',
        background: '#060a04',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
      }}
    >
      <LandingGhosts fadingOut={showLoginForm} />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse at 50% 100%, rgba(20,50,10,0.55) 0%, rgba(6,10,4,0) 65%)',
          pointerEvents: 'none',
        }}
      />

      <Scanlines />
      <HudCorners />

      <motion.div
        layout
        initial={{ opacity: 0, y: -12 }}
        animate={{
          opacity: 1,
          y: 0,
          maxWidth: showLoginForm ? 440 : 520,
          paddingTop: showLoginForm ? 40 : 48,
          paddingBottom: showLoginForm ? 40 : 48,
        }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        style={{
          width: '100%',
          maxWidth: 520,
          background: 'rgba(6,12,4,0.92)',
          border: '1px solid rgba(74,138,48,0.2)',
          borderRadius: 12,
          paddingLeft: 36,
          paddingRight: 36,
          minHeight: 360,
          overflow: 'hidden',
          position: 'relative',
          zIndex: 2,
        }}
      >
        <AnimatePresence mode="sync" initial={false}>
          {!showLoginForm ? (
            <motion.div
              key="landing"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)', scale: 1 }}
              exit={{ opacity: 0, y: -4, filter: 'blur(7px)', scale: 0.985 }}
              transition={{ duration: 0.28 }}
              style={{ textAlign: 'center' }}
            >
              <div
                style={{
                  fontFamily: "'Courier New', monospace",
                  fontSize: 9,
                  letterSpacing: '4px',
                  color: '#2d4a1e',
                  textTransform: 'uppercase',
                  marginBottom: 12,
                }}
              >
                Sistema de supervivencia
              </div>

              <h1
                style={{
                  fontFamily: "'Georgia', serif",
                  fontSize: 40,
                  fontWeight: 800,
                  color: '#b8f080',
                  letterSpacing: '8px',
                  textTransform: 'uppercase',
                  margin: '0 0 10px',
                  textShadow: '0 0 36px rgba(100,220,60,0.4)',
                }}
              >
                Gestión del Fin
              </h1>

              <div
                style={{
                  fontFamily: "'Courier New', monospace",
                  fontSize: 10,
                  letterSpacing: '3px',
                  color: '#355522',
                  textTransform: 'uppercase',
                  marginBottom: 28,
                }}
              >
                Acceso restringido al refugio
              </div>

              <motion.button
                type="button"
                onClick={() => {
                  setCinematicPulse((prev) => prev + 1)
                  setShowLoginForm(true)
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  background: 'rgba(74,138,48,0.14)',
                  border: '1px solid rgba(74,138,48,0.5)',
                  borderRadius: 4,
                  color: '#7ddb50',
                  fontFamily: "'Courier New', monospace",
                  fontSize: 11,
                  letterSpacing: '4px',
                  textTransform: 'uppercase',
                  padding: '14px 24px',
                  cursor: 'pointer',
                }}
              >
                Iniciar sesión
              </motion.button>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 6, filter: 'blur(8px)', scale: 0.985 }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)', scale: 1 }}
              exit={{ opacity: 0, y: -4, filter: 'blur(6px)' }}
              transition={{ duration: 0.3 }}
            >
              <div style={{ textAlign: 'center', marginBottom: 26 }}>
                <h1
                  style={{
                    fontFamily: "'Georgia', serif",
                    fontSize: 34,
                    fontWeight: 800,
                    color: '#b8f080',
                    letterSpacing: '7px',
                    textTransform: 'uppercase',
                    margin: 0,
                    textShadow: '0 0 36px rgba(100,220,60,0.4)',
                  }}
                >
                  Gestión del Fin
                </h1>
              </div>

              <form onSubmit={handleSubmit} noValidate>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <ApocInput
                    label="Usuario"
                    value={form.username}
                    onChange={handleSetField('username')}
                    error={errors.username}
                    placeholder="nombre de usuario"
                  />

                  <div>
                    <ApocInput
                      label="Contraseña"
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={handleSetField('password')}
                      error={errors.password}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      style={{
                        marginTop: 4,
                        background: 'none',
                        border: 'none',
                        color: '#2a5018',
                        fontSize: 9,
                        letterSpacing: '2px',
                        textTransform: 'uppercase',
                        cursor: 'pointer',
                        padding: 0,
                        fontFamily: "'Courier New', monospace",
                      }}
                    >
                      {showPassword ? 'Ocultar' : 'Mostrar'} contraseña
                    </button>
                  </div>

                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={!loading ? { scale: 1.02 } : {}}
                    whileTap={!loading ? { scale: 0.98 } : {}}
                    style={{
                      marginTop: 8,
                      background: loading ? 'rgba(74,138,48,0.1)' : 'rgba(74,138,48,0.12)',
                      border: `1px solid ${loading ? 'rgba(74,138,48,0.2)' : 'rgba(74,138,48,0.5)'}`,
                      borderRadius: 4,
                      color: loading ? '#3a6020' : '#7ddb50',
                      fontFamily: "'Courier New', monospace",
                      fontSize: 11,
                      letterSpacing: '4px',
                      textTransform: 'uppercase',
                      padding: '14px',
                      cursor: loading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {loading ? 'Verificando...' : 'INICIAR SESIÓN'}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {cinematicPulse > 0 && (
            <motion.div
              key={`pulse-${cinematicPulse}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.1, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.38, ease: 'easeOut' }}
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: 12,
                pointerEvents: 'none',
                background:
                  'radial-gradient(circle at 50% 45%, rgba(125,219,80,0.22), rgba(125,219,80,0) 65%)',
              }}
            />
          )}
        </AnimatePresence>
      </motion.div>
      <PopupMessage
        message={popupMessage}
        onClose={() => setPopupMessage(null)}
        variant="error"
      />
    </div>
  )
}
