import { useMemo } from 'react'
import { AlertTriangle, MapPin, ShieldAlert, Users } from 'lucide-react'
import { WorldMap } from '../../../expeditions-ui/components/WorldMap'
import type { MappedCampPoint } from '../types'

type ExpeditionsWorldMapProps = {
  camps: MappedCampPoint[]
  selectedCampId: number | null
  onSelectCamp: (campId: number) => void
  onCreateFromCamp: (campId: number) => void
}

type DotPath = {
  start: { lat: number; lng: number; label?: string }
  end: { lat: number; lng: number; label?: string }
  status?: string
}

function statusHint(status: MappedCampPoint['status']): string {
  if (status === 'COMPROMISED') return 'DELAYED'
  if (status === 'ABANDONED') return 'LOST'
  return 'ACTIVE'
}

function statusLabel(status: MappedCampPoint['status']) {
  if (status === 'COMPROMISED') return { text: 'Comprometido', tone: 'critical' }
  if (status === 'UNDER_CONSTRUCTION') return { text: 'En montaje', tone: 'warning' }
  if (status === 'ABANDONED') return { text: 'Abandonado', tone: 'critical' }
  return { text: 'Operativo', tone: 'good' }
}

export function ExpeditionsWorldMap({
  camps,
  selectedCampId,
  onSelectCamp,
  onCreateFromCamp,
}: ExpeditionsWorldMapProps) {
  const baseCamp = camps[0]

  const dots = useMemo<DotPath[]>(() => {
    if (!baseCamp) return []
    return camps
      .filter((camp) => camp.id !== baseCamp.id)
      .map((camp) => ({
        start: { lat: baseCamp.latitude, lng: baseCamp.longitude, label: 'Base' },
        end: { lat: camp.latitude, lng: camp.longitude, label: camp.name.slice(0, 14) },
        status: statusHint(camp.status),
      }))
  }, [baseCamp, camps])

  const selectedCamp = camps.find((camp) => camp.id === selectedCampId) ?? null

  return (
    <div className="expx-map-layout">
      <div className="expx-map-canvas">
        <div className="expx-map-layer expx-map-layer--heat" aria-hidden="true" />
        <div className="expx-map-layer expx-map-layer--fog" aria-hidden="true" />
        <div className="expx-map-layer expx-map-layer--grid" aria-hidden="true" />
        <WorldMap
          dots={dots}
          lineColor="#69BFB7"
          onZoneClick={(dot) => {
            const hit = camps.find(
              (camp) =>
                Math.abs(camp.latitude - dot.end.lat) < 0.0001 &&
                Math.abs(camp.longitude - dot.end.lng) < 0.0001,
            )
            if (hit) onSelectCamp(hit.id)
          }}
        />

        <div className="expx-map-legend2">
          <span><i className="is-active" /> Activa</span>
          <span><i className="is-planned" /> Planificada</span>
          <span><i className="is-delayed" /> Retrasada</span>
          <span><i className="is-completed" /> Completada</span>
        </div>
      </div>

      <aside className="expx-map-side">
        <h3 className="expx-panel-title">Campamentos globales</h3>
        <div className="expx-camp-list">
          {camps.map((camp) => {
            const isSelected = camp.id === selectedCampId
            return (
              <button
                key={camp.id}
                type="button"
                className={`expx-camp-row${isSelected ? ' is-selected' : ''}`}
                onClick={() => onSelectCamp(camp.id)}
              >
                <MapPin size={14} />
                <span>{camp.name}</span>
                <small className={`expx-camp-tag tone-${statusLabel(camp.status).tone}`}>{statusLabel(camp.status).text}</small>
              </button>
            )
          })}
        </div>

        {selectedCamp ? (
          <div className="expx-camp-detail">
            <h4>{selectedCamp.name}</h4>
            <p>
              Poblacion: {selectedCamp.currentPopulation}/{selectedCamp.capacity}
            </p>
            <p>
              Coordenadas: {selectedCamp.latitude.toFixed(3)}, {selectedCamp.longitude.toFixed(3)}
            </p>
            <p className="expx-camp-mini-stats">
              <Users size={12} /> Ocupacion {Math.round((selectedCamp.currentPopulation / Math.max(1, selectedCamp.capacity)) * 100)}%
            </p>
            <button type="button" className="expx-btn" onClick={() => onCreateFromCamp(selectedCamp.id)}>
              Crear expedicion desde campamento
            </button>
          </div>
        ) : (
          <div className="expx-warning">
            <ShieldAlert size={14} />
            <span>Selecciona un campamento para iniciar una nueva expedicion.</span>
          </div>
        )}

        <div className="expx-map-alert">
          <AlertTriangle size={12} />
          <span>Rutas con latencia alta usan trazo intermitente.</span>
        </div>
      </aside>
    </div>
  )
}
