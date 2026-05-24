import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ModuleMap } from '../../features/login/components/ModuleMap'
import { SESSION_TOKEN_CHANGED_EVENT } from '../../shared/services/sessionService'

export default function MainAppPage() {
  const navigate = useNavigate()

  const user = useMemo(() => {
    const raw = localStorage.getItem('user')
    if (!raw) return null

    try {
      return JSON.parse(raw) as { username: string; role: string }
    } catch {
      return null
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
          onClick={() => {
            localStorage.removeItem('token')
            localStorage.removeItem('accessToken')
            localStorage.removeItem('user')
            window.dispatchEvent(new Event(SESSION_TOKEN_CHANGED_EVENT))
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

      <div
        style={{
          width: '100%',
          maxWidth: 680,
          marginBottom: 24,
          display: 'flex',
          gap: '12px',
        }}
      >
        <button
          onClick={() => navigate('/admission')}
          style={{
            flex: 1,
            background: 'rgba(74, 138, 48, 0.2)',
            border: '1px solid rgba(74, 138, 48, 0.5)',
            color: '#7ddb50',
            fontFamily: "'Courier New', monospace",
            fontSize: 11,
            letterSpacing: '1px',
            padding: '12px 16px',
            borderRadius: 4,
            cursor: 'pointer',
            textTransform: 'uppercase',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(125, 219, 80, 0.15)'
            e.currentTarget.style.boxShadow = '0 0 12px rgba(125, 219, 80, 0.2)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(74, 138, 48, 0.2)'
            e.currentTarget.style.boxShadow = 'none'
          }}
        >
          Ir a Formulario
        </button>
      </div>

      <ModuleMap userRole={user.role} onNavigate={(path) => navigate(path)} />
    </div>
  )
}
