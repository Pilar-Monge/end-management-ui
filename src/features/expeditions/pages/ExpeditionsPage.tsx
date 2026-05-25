import { Suspense, lazy } from 'react'
import { useNavigate } from 'react-router-dom'
import './expeditions.css'

const ExpeditionsThreeScene = lazy(() => import('../components/ExpeditionsThreeScene'))

export default function ExpeditionsPage() {
  const navigate = useNavigate()

  return (
    <main className="expeditions-page">
      <Suspense fallback={<div style={{ color: '#cfe7ff', padding: 16 }}>Cargando vista 3D...</div>}>
        <ExpeditionsThreeScene
          onExit={() => navigate('/')}
          onSyncComplete={() => navigate('/expeditions-ui')}
        />
      </Suspense>
    </main>
  )
}
