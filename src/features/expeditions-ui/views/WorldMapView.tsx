import { useState } from 'react'
import { WorldMap } from '../components/WorldMap'
import { Btn } from './ExpedicionesViews'

const EXPEDITIONS_MAP = [
  {
    id: 1,
    name: 'Valle Profundo',
    team: 'Equipo Alfa',
    status: 'IN_PROGRESS',
    time: '02:16',
    start: { lat: 4.6, lng: -74.08, label: 'Base' },
    end: { lat: 19.43, lng: -99.13, label: 'Valle Profundo' },
    danger: 'Alto',
    climate: 'Templado',
    resources: ['Minerales', 'Agua', 'Madera'],
    desc: 'Zona rica en recursos minerales. Requiere equipo de perforación.',
  },
  {
    id: 2,
    name: 'Río Oeste',
    team: 'Equipo Beta',
    status: 'PLANNED',
    time: '—',
    start: { lat: 4.6, lng: -74.08 },
    end: { lat: -33.87, lng: 151.21, label: 'Río Oeste' },
    danger: 'Medio',
    climate: 'Húmedo',
    resources: ['Agua', 'Pescado', 'Plantas'],
    desc: 'Cuenca fluvial con alta biodiversidad.',
  },
  {
    id: 3,
    name: 'Montaña Negra',
    team: 'Equipo Gamma',
    status: 'DELAYED',
    time: '05:20',
    start: { lat: 4.6, lng: -74.08 },
    end: { lat: 28.61, lng: 77.21, label: 'Montaña Negra' },
    danger: 'Extremo',
    climate: 'Frío',
    resources: ['Minerales', 'Energía', 'Cristales'],
    desc: 'Pico volcánico inestable. Precaución máxima.',
  },
  {
    id: 4,
    name: 'Costa Esmeralda',
    team: 'Equipo Delta',
    status: 'COMPLETED',
    time: '00:00',
    start: { lat: 4.6, lng: -74.08 },
    end: { lat: 51.51, lng: -0.13, label: 'Costa Esmeralda' },
    danger: 'Bajo',
    climate: 'Tropical',
    resources: ['Pescado', 'Sal', 'Madera'],
    desc: 'Zona costera segura, ideal para descanso.',
  },
  {
    id: 5,
    name: 'Bosque Oscuro',
    team: 'Equipo Épsilon',
    status: 'IN_PROGRESS',
    time: '01:45',
    start: { lat: 4.6, lng: -74.08 },
    end: { lat: -1.29, lng: 36.82, label: 'Bosque Oscuro' },
    danger: 'Alto',
    climate: 'Húmedo',
    resources: ['Plantas', 'Hongos', 'Madera'],
    desc: 'Selva densa con flora desconocida.',
  },
  {
    id: 6,
    name: 'Paso del Cóndor',
    team: 'Equipo Zeta',
    status: 'LOST',
    time: '—',
    start: { lat: 4.6, lng: -74.08 },
    end: { lat: 35.68, lng: 139.69, label: 'Paso del Cóndor' },
    danger: 'Extremo',
    climate: 'Árido',
    resources: ['Minerales', 'Energía'],
    desc: 'Zona de contacto perdido. No enviar equipos sin refuerzos.',
  },
]

const STATUS_ICON: Record<string, { icon: string; color: string; label: string }> = {
  IN_PROGRESS: { icon: '►', color: '#69BFB7', label: 'En Progreso' },
  PLANNED: { icon: '◆', color: '#67ACA9', label: 'Planeada' },
  DELAYED: { icon: '▲', color: '#f59e0b', label: 'Retrasada' },
  COMPLETED: { icon: '✓', color: '#4ade80', label: 'Completada' },
  LOST: { icon: '✕', color: '#ef4444', label: 'Perdida' },
}

export function WorldMapDashboard() {
  const [selectedZone, setSelectedZone] = useState<(typeof EXPEDITIONS_MAP)[0] | null>(null)

  const dots = EXPEDITIONS_MAP.map((e) => ({
    start: e.start,
    end: e.end,
    status: e.status,
  }))

  return (
    <div className="wm-layout">
      <div className="wm-map-area">
        <WorldMap
          dots={dots}
          lineColor="#69BFB7"
          onZoneClick={(dot) => {
            const zone = EXPEDITIONS_MAP.find(
              (e) => e.end.lat === dot.end.lat && e.end.lng === dot.end.lng,
            )
            if (zone) setSelectedZone(zone)
          }}
        />

        <div className="wm-legend">
          {Object.entries(STATUS_ICON).map(([key, val]) => (
            <div key={key} className="wm-legend-item">
              <span style={{ color: val.color, fontSize: 10 }}>{val.icon}</span>
              <span>{val.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="wm-sidebar">
        {selectedZone ? (
          <div className="tactical-zone-panel">
            <div className="tactical-zone-header">
              <div>
                <h3 className="tactical-zone-title">{selectedZone.name}</h3>
                <span
                  className="tactical-zone-status"
                  style={{ color: STATUS_ICON[selectedZone.status]?.color || '#A4C2C5' }}
                >
                  {STATUS_ICON[selectedZone.status]?.label || 'Desconocido'}
                </span>
              </div>
              <button className="tactical-close-btn" onClick={() => setSelectedZone(null)}>
                ✕
              </button>
            </div>

            <p className="tactical-zone-desc">{selectedZone.desc}</p>

            <div className="tactical-stats-grid">
              <div className="tactical-stat">
                <span>Peligro</span>
                <strong className="text-red-400">{selectedZone.danger}</strong>
              </div>
              <div className="tactical-stat">
                <span>Clima</span>
                <strong>{selectedZone.climate}</strong>
              </div>
              <div className="tactical-stat">
                <span>Equipo</span>
                <strong>{selectedZone.team}</strong>
              </div>
              <div className="tactical-stat">
                <span>Tiempo</span>
                <strong>{selectedZone.time}</strong>
              </div>
            </div>

            <div className="tactical-resources">
              <h4 className="tactical-subtitle">Recursos Disponibles</h4>
              <div className="tactical-resource-cards">
                {selectedZone.resources.map((r) => (
                  <div key={r} className="tactical-resource-card">
                    <span className="tactical-resource-icon">◆</span>
                    <span>{r}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="tactical-actions">
              <Btn variant="primary" style={{ width: '100%' }}>
                Planificar Expedición
              </Btn>
              <Btn variant="ghost" style={{ width: '100%' }}>
                Ver Detalles
              </Btn>
            </div>
          </div>
        ) : (
          <>
            <h3 className="wm-sidebar-title">Expediciones Activas</h3>
            <div className="wm-exp-list">
              {EXPEDITIONS_MAP.map((e) => {
                const info = STATUS_ICON[e.status] || STATUS_ICON.PLANNED
                return (
                  <div
                    key={e.id}
                    className="wm-exp-card"
                    onClick={() => setSelectedZone(e)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div
                      className="wm-exp-icon"
                      style={{ borderColor: info.color, color: info.color }}
                    >
                      {info.icon}
                    </div>
                    <div className="wm-exp-info">
                      <span className="wm-exp-name">{e.name}</span>
                      <span className="wm-exp-team">{e.team}</span>
                    </div>
                    <div
                      className="wm-exp-time"
                      style={{
                        color:
                          e.status === 'DELAYED'
                            ? '#f59e0b'
                            : e.status === 'LOST'
                              ? '#ef4444'
                              : '#A4C2C5',
                      }}
                    >
                      {e.time}
                    </div>
                  </div>
                )
              })}
            </div>

            <h3 className="wm-sidebar-title" style={{ marginTop: 16 }}>
              Resumen Rápido
            </h3>
            <div className="wm-stats">
              <div className="wm-stat-row">
                <span>En Progreso</span>
                <span className="wm-stat-val" style={{ color: '#69BFB7' }}>
                  2
                </span>
              </div>
              <div className="wm-stat-row">
                <span>Planeadas</span>
                <span className="wm-stat-val" style={{ color: '#67ACA9' }}>
                  1
                </span>
              </div>
              <div className="wm-stat-row">
                <span>Retrasadas</span>
                <span className="wm-stat-val" style={{ color: '#f59e0b' }}>
                  1
                </span>
              </div>
              <div className="wm-stat-row">
                <span>Completadas</span>
                <span className="wm-stat-val" style={{ color: '#4ade80' }}>
                  1
                </span>
              </div>
              <div className="wm-stat-row">
                <span>Perdidas</span>
                <span className="wm-stat-val" style={{ color: '#ef4444' }}>
                  1
                </span>
              </div>
              <div className="wm-stat-row">
                <span>Personal en campo</span>
                <span className="wm-stat-val">23</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
