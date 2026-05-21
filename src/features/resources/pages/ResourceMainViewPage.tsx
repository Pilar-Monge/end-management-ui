import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import ResourceMainThreeScene from '../components/ResourceMainThreeScene'
import ResourceControlPanelPage from './ResourceControlPanelPage'
import './resource-main-view.css'

export default function ResourceMainViewPage() {
  const navigate = useNavigate()
  const [showPanel, setShowPanel] = useState(false)

  return (
    <main className="resource-main-view-page">
      {showPanel ? (
        <ResourceControlPanelPage onExit={() => setShowPanel(false)} />
      ) : (
        <ResourceMainThreeScene onExit={() => navigate('/')} onOpenPanel={() => setShowPanel(true)} />
      )}
    </main>
  )
}
