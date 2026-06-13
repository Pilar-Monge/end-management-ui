import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ModuleMap } from '../features/login/components/ModuleMap'
import { SESSION_TOKEN_CHANGED_EVENT } from '../shared/services/sessionService'
import { logoutCurrentSession, readCachedSessionUser, type CachedSessionUser } from '../shared/services/sessionProfile'

export default function MainAppPage() {
  const navigate = useNavigate()

  const [user, setUser] = useState<CachedSessionUser | null>(() => readCachedSessionUser())

  useEffect(() => {
    const syncUser = () => setUser(readCachedSessionUser())
    window.addEventListener(SESSION_TOKEN_CHANGED_EVENT, syncUser)
    window.addEventListener('storage', syncUser)
    return () => {
      window.removeEventListener(SESSION_TOKEN_CHANGED_EVENT, syncUser)
      window.removeEventListener('storage', syncUser)
    }
  }, [])

  if (!user) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: '#060a04',
          color: '#7ddb50',
        }}
      >
        Sesión no disponible
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#060a04',
        color: '#7ddb50',
        padding: '32px 20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 680,
          marginBottom: 18,
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "'Courier New', monospace",
              fontSize: 10,
              letterSpacing: '3px',
              color: '#3a6020',
            }}
          >
            Bienvenido
          </div>
          <div
            style={{ fontFamily: "'Courier New', monospace", fontSize: 16, letterSpacing: '2px' }}
          >
            {user.username}
          </div>
        </div>
        <button
          onClick={async () => {
            await logoutCurrentSession()
            navigate('/')
          }}
          style={{
            background: 'none',
            border: '1px solid rgba(224,80,80,0.25)',
            color: '#804040',
            fontFamily: "'Courier New', monospace",
            fontSize: 10,
            letterSpacing: '2px',
            padding: '8px 12px',
            borderRadius: 3,
            cursor: 'pointer',
            textTransform: 'uppercase',
          }}
        >
          Salir
        </button>
      </div>

      <ModuleMap userRole={user.role ?? user.rol ?? ''} onNavigate={(path) => navigate(path)} />
    </div>
  )
}
