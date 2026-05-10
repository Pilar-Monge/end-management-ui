import { Suspense, lazy } from 'react'
import { useNavigate } from 'react-router-dom'
import './resource-main-view.css'

const ResourceMainThreeScene = lazy(() => import('../components/ResourceMainThreeScene'))

export default function ResourceMainViewPage() {
  const navigate = useNavigate()

  return (
    <main className="resource-main-view-page">
      <Suspense fallback={<div style={{ color: '#cfe7ff', padding: 16 }}>Cargando vista 3D...</div>}>
        <ResourceMainThreeScene onExit={() => navigate('/')} />
      </Suspense>
    </main>
  )
}
