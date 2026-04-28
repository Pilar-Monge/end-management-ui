import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import HomePage from './pages/HomePage'
import LoginPage from './features/login/pages/LoginPage'
import MainAppPage from './app/layout/MainAppPage'
import { FormularioPage } from './features/formulario'
import { CampsPage } from './features/camps'
import { PersonsPage } from './features/persons'
import {
  ResourceTypesPage,
  OccupationsPage,
  OccupationCriteriaPage,
  AchievementsPage,
} from './features/catalogs'
import { useSessionManager } from './shared/hooks'

function CatalogsLayout() {
  const navigate = useNavigate()
  const tab = new URLSearchParams(window.location.search).get('tab') || 'resources'
  const tabs = {
    resources: { label: 'Tipos de Recursos', component: ResourceTypesPage },
    occupations: { label: 'Ocupaciones', component: OccupationsPage },
    criteria: { label: 'Criterios', component: OccupationCriteriaPage },
    achievements: { label: 'Logros', component: AchievementsPage },
  } as const

  const ActiveComponent = tabs[tab as keyof typeof tabs]?.component || ResourceTypesPage

  return (
    <div style={{ minHeight: '100vh', background: '#060a04', color: '#7ddb50' }}>
      <div
        style={{
          borderBottom: '1px solid rgba(74,138,48,0.2)',
          background: 'rgba(10,18,8,0.9)',
          padding: '16px 24px',
          display: 'flex',
          gap: '20px',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', gap: '16px' }}>
          {Object.entries(tabs).map(([key, { label }]) => (
            <button
              key={key}
              onClick={() => navigate(`?tab=${key}`)}
              style={{
                background: tab === key ? 'rgba(74,138,48,0.2)' : 'transparent',
                border: `1px solid ${tab === key ? 'rgba(74,138,48,0.5)' : 'rgba(74,138,48,0.2)'}`,
                borderRadius: '4px',
                color: tab === key ? '#7ddb50' : '#3a6020',
                fontFamily: "'Courier New', monospace",
                fontSize: '11px',
                letterSpacing: '1px',
                padding: '8px 14px',
                cursor: 'pointer',
                textTransform: 'uppercase',
                transition: 'all 0.2s',
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={() => navigate('/app')}
          style={{
            background: 'rgba(60,60,80,0.14)',
            border: '1px solid rgba(100,100,120,0.3)',
            color: '#8080a0',
            fontFamily: "'Courier New', monospace",
            fontSize: '10px',
            letterSpacing: '1px',
            padding: '8px 14px',
            borderRadius: '4px',
            cursor: 'pointer',
            textTransform: 'uppercase',
          }}
        >
          Volver
        </button>
      </div>
      <ActiveComponent />
    </div>
  )
}

function App() {
  useSessionManager()

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/app" element={<MainAppPage />} />
      <Route path="/formulario" element={<FormularioPage />} />
      <Route path="/camps" element={<CampsPage />} />
      <Route path="/persons" element={<PersonsPage />} />
      <Route path="/catalogs" element={<CatalogsLayout />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
