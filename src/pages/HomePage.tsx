import { useNavigate } from 'react-router-dom'

export default function HomePage() {
  const navigate = useNavigate()

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
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          textAlign: 'center',
          maxWidth: 600,
        }}
      >
        <div
          style={{
            fontFamily: "'Courier New', monospace",
            fontSize: 32,
            letterSpacing: '3px',
            marginBottom: 8,
          }}
        >
          GESTIÓN DEL FIN
        </div>

        <div
          style={{
            fontFamily: "'Courier New', monospace",
            fontSize: 12,
            color: '#3a6020',
            letterSpacing: '2px',
            marginBottom: 48,
          }}
        >
          SISTEMA DE SUPERVIVENCIA
        </div>

        <div style={{ display: 'flex', gap: '16px', flexDirection: 'column' }}>
          <button
            onClick={() => navigate('/admission')}
            style={{
              background: 'rgba(74, 138, 48, 0.2)',
              border: '1px solid rgba(125, 219, 80, 0.5)',
              color: '#7ddb50',
              fontFamily: "'Courier New', monospace",
              fontSize: 12,
              letterSpacing: '2px',
              padding: '14px 32px',
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

          <button
            onClick={() => navigate('/login')}
            style={{
              background: 'rgba(60, 60, 80, 0.1)',
              border: '1px solid rgba(100, 100, 120, 0.3)',
              color: '#8080a0',
              fontFamily: "'Courier New', monospace",
              fontSize: 12,
              letterSpacing: '2px',
              padding: '14px 32px',
              borderRadius: 4,
              cursor: 'pointer',
              textTransform: 'uppercase',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(100, 100, 120, 0.15)'
              e.currentTarget.style.boxShadow = '0 0 8px rgba(100, 100, 120, 0.15)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(60, 60, 80, 0.1)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            Iniciar Sesión
          </button>
        </div>
      </div>
    </div>
  )
}
