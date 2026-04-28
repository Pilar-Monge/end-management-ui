import { useNavigate } from 'react-router-dom'

export default function FormularioPage() {
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
            fontSize: 28,
            letterSpacing: '3px',
            marginBottom: 32,
          }}
        >
          FORMULARIO
        </div>

        <div
          style={{
            fontFamily: "'Courier New', monospace",
            fontSize: 14,
            color: '#3a6020',
            marginBottom: 32,
            lineHeight: 1.8,
          }}
        >
          Página del formulario
        </div>

        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'none',
            border: '1px solid rgba(125,219,80,0.3)',
            color: '#7ddb50',
            fontFamily: "'Courier New', monospace",
            fontSize: 12,
            letterSpacing: '2px',
            padding: '12px 24px',
            borderRadius: 3,
            cursor: 'pointer',
            textTransform: 'uppercase',
          }}
        >
          Volver
        </button>
      </div>
    </div>
  )
}
