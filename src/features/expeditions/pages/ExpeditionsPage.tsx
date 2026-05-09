import { useNavigate } from 'react-router-dom'
import ExpeditionsThreeScene from '../components/ExpeditionsThreeScene'
import './expeditions.css'

export default function ExpeditionsPage() {
  const navigate = useNavigate()

  return (
    <main className="expeditions-page">
      <ExpeditionsThreeScene onExit={() => navigate('/')} />
    </main>
  )
}
