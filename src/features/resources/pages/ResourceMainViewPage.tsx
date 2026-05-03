import { useNavigate } from 'react-router-dom'
import ResourceMainThreeScene from '../components/ResourceMainThreeScene'
import './resource-main-view.css'

export default function ResourceMainViewPage() {
  const navigate = useNavigate()

  return (
    <main className="resource-main-view-page">
      <ResourceMainThreeScene onExit={() => navigate('/')} />
    </main>
  )
}
