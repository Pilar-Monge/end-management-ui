import { Suspense, lazy } from 'react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ResourceControlPanelPage from './ResourceControlPanelPage'
import './resource-main-view.css'

const ResourceMainThreeScene = lazy(() => import('../components/ResourceMainThreeScene'))

export default function ResourceMainViewPage() {
  const navigate = useNavigate()
  const [showPanel, setShowPanel] = useState(false)

  return (
    <main className="resource-main-view-page">
      {showPanel ? (
        <ResourceControlPanelPage onExit={() => setShowPanel(false)} />
      ) : (
        <Suspense fallback={<div style={{ color: '#cfe7ff', padding: 16 }}>Cargando vista 3D...</div>}>
          <ResourceMainThreeScene onExit={() => navigate('/')} onOpenPanel={() => setShowPanel(true)} />
        </Suspense>
      )}
    </main>
  )
}
