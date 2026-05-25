interface AdminBootOverlayProps {
  visible: boolean
  progress: number
  phase: string
}

export function AdminBootOverlay({ visible, progress, phase }: AdminBootOverlayProps) {
  if (!visible) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 5000,
        display: 'grid',
        placeItems: 'center',
        background:
          'radial-gradient(circle at 50% 20%, rgba(24,68,64,0.34), rgba(3,9,9,0.96) 58%), rgba(3,9,9,0.97)',
      }}
    >
      <div
        style={{
          width: 'min(560px, calc(100vw - 36px))',
          border: '1px solid rgba(105,191,183,0.35)',
          background: 'rgba(4,14,14,0.82)',
          padding: '18px 18px 16px',
          boxShadow: '0 16px 40px rgba(0,0,0,0.45)',
        }}
      >
        <div
          style={{
            color: '#9ed9d3',
            fontSize: 11,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            fontWeight: 800,
          }}
        >
          Sincronizacion Administrativa
        </div>
        <div style={{ color: '#f0fafa', fontSize: 20, fontWeight: 900, letterSpacing: '0.04em', marginTop: 8 }}>
          Cargando Centro de Mando
        </div>
        <div style={{ color: 'rgba(164,194,197,0.82)', fontSize: 11, marginTop: 8 }}>{phase}</div>

        <div style={{ marginTop: 14, height: 9, background: 'rgba(109,176,173,0.16)', overflow: 'hidden' }}>
          <span
            style={{
              display: 'block',
              height: '100%',
              width: `${Math.max(0, Math.min(100, progress))}%`,
              background: 'linear-gradient(90deg, #4ea399, #7dd5c6)',
              transition: 'width 140ms linear',
            }}
          />
        </div>
        <div style={{ marginTop: 8, color: '#69bfb7', fontSize: 12, fontWeight: 800 }}>
          {Math.round(progress)}%
        </div>
      </div>
    </div>
  )
}
