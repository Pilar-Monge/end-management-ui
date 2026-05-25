import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import './expeditions-panel.css'
import { ExpeditionsWorldMap } from './components/ExpeditionsWorldMap'
import { ActiveExpeditionDetail } from './components/ActiveExpeditionDetail'
import { useExpeditionsState } from './useExpeditionsState'
import type { ExpeditionMode } from './types'

type ExpeditionsPanelProps = {
  mode: string
  currentCampId: number
}

function normalizeMode(mode: string): ExpeditionMode {
  if (mode === 'activeOps') return 'activeOps'
  if (mode === 'history') return 'history'
  if (mode === 'resources') return 'resources'
  return 'map'
}

export function ExpeditionsPanel({ mode, currentCampId }: ExpeditionsPanelProps) {
  const [selectedCampId, setSelectedCampId] = useState<number | null>(null)
  const [selectedActiveExpeditionId, setSelectedActiveExpeditionId] = useState<number | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const {
    isLoading,
    isUpdatingParticipants,
    loadError,
    mapPoints,
    participantsCatalog,
    activeParticipants,
    activeExpeditions,
    historyExpeditions,
    updateExpeditionParticipants,
  } = useExpeditionsState({ currentCampId })

  const currentMode = normalizeMode(mode)

  const kpis = useMemo(
    () => [
      { label: 'ACTIVAS', value: activeExpeditions.length },
      { label: 'HISTORIAL', value: historyExpeditions.length },
      { label: 'PERSONAL DISPONIBLE', value: activeParticipants.length },
    ],
    [activeExpeditions.length, activeParticipants.length, historyExpeditions.length],
  )

  const resolvedSelectedActiveExpeditionId =
    selectedActiveExpeditionId && activeExpeditions.some((expedition) => expedition.id === selectedActiveExpeditionId)
      ? selectedActiveExpeditionId
      : null

  const selectedActiveExpedition =
    activeExpeditions.find((expedition) => expedition.id === resolvedSelectedActiveExpeditionId) ?? null

  const canEditParticipants = (status: string, day: number) => status === 'PROGRAMADA' && day <= 0

  const handleParticipantsUpdate = async (expeditionId: number, participantIds: number[]) => {
    const result = await updateExpeditionParticipants(expeditionId, participantIds)
    if (result.source === 'remote') {
      setNotice('Participantes actualizados y sincronizados con el backend.')
    } else if (result.source === 'local') {
      setNotice('Modo sin conexion: participantes actualizados de forma local.')
    } else {
      setNotice('No se encontro la expedicion para actualizar participantes.')
    }
    setTimeout(() => setNotice(null), 3200)
  }

  return (
    <div className="expx-shell">
      <div className="expx-bg-depth" aria-hidden="true" />
      <div className="expx-kpis">
        {kpis.map((kpi) => (
          <article key={kpi.label}>
            <strong>{kpi.value}</strong>
            <span>{kpi.label}</span>
          </article>
        ))}
      </div>

      <AnimatePresence>
        {notice ? (
          <motion.div
            className="expx-notice"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
          >
            {notice}
            <span className="expx-notice-progress" aria-hidden="true" />
          </motion.div>
        ) : null}
      </AnimatePresence>

      {isLoading ? (
        <div className="expx-skeleton-wrap" aria-hidden="true">
          <div className="expx-skeleton expx-skeleton--line" />
          <div className="expx-skeleton-grid">
            <div className="expx-skeleton expx-skeleton--block" />
            <div className="expx-skeleton expx-skeleton--block" />
          </div>
        </div>
      ) : null}
      {isUpdatingParticipants ? <div className="expx-state">Actualizando participantes de la expedicion...</div> : null}
      {loadError ? <div className="expx-state is-error">{loadError}</div> : null}

      <AnimatePresence mode="wait" initial={false}>
        {!isLoading && currentMode === 'map' && (
          <motion.div key="map" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.24, ease: 'easeOut' }}>
            <ExpeditionsWorldMap
              camps={mapPoints}
              selectedCampId={selectedCampId}
              onSelectCamp={setSelectedCampId}
            />
          </motion.div>
        )}

        {!isLoading && currentMode === 'activeOps' && (
          <motion.div
            key="activeOps"
            className={`expx-active-grid${selectedActiveExpedition ? ' expx-active-grid--open' : ''}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
          >
            <div className="expx-list">
              <div className="expx-list-hint">Toca una mision para abrir o cerrar el panel de detalle.</div>
              {activeExpeditions.map((expedition) => (
                <button
                  key={expedition.id}
                  type="button"
                  className={`expx-list-item expx-list-button status-${expedition.status.replace(/\s+/g, '-').toLowerCase()}${resolvedSelectedActiveExpeditionId === expedition.id ? ' is-selected' : ''}`}
                  onClick={() =>
                    setSelectedActiveExpeditionId((prev) => (prev === expedition.id ? null : expedition.id))
                  }
                >
                  <h4>{expedition.name}</h4>
                  <p>{expedition.objective}</p>
                  <small>
                    {expedition.status} | Dia {expedition.day}/{expedition.total} | Sector: {expedition.sector}
                  </small>
                </button>
              ))}
              {activeExpeditions.length === 0 ? <div className="expx-state">Sin expediciones activas.</div> : null}
            </div>

            {selectedActiveExpedition ? (
              <motion.div
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
              >
                <ActiveExpeditionDetail
                  expedition={selectedActiveExpedition}
                  camps={mapPoints}
                  participants={participantsCatalog}
                  canManageParticipants={canEditParticipants(
                    selectedActiveExpedition.status,
                    selectedActiveExpedition.day,
                  )}
                  onUpdateParticipants={(participantIds) =>
                    handleParticipantsUpdate(selectedActiveExpedition.id, participantIds)
                  }
                  isUpdatingParticipants={isUpdatingParticipants}
                />
              </motion.div>
            ) : null}
          </motion.div>
        )}

        {!isLoading && currentMode === 'history' && (
          <motion.div key="history" className="expx-list" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.24, ease: 'easeOut' }}>
            {historyExpeditions.map((expedition) => (
              <article key={expedition.id} className="expx-list-item status-completada">
                <h4>{expedition.name}</h4>
                <p>{expedition.objective}</p>
                <small>COMPLETADA | Sector: {expedition.sector}</small>
              </article>
            ))}
            {historyExpeditions.length === 0 ? <div className="expx-state">No hay historial aun.</div> : null}
          </motion.div>
        )}

        {!isLoading && currentMode === 'resources' && (
          <motion.div key="resources" className="expx-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.24, ease: 'easeOut' }}>
            <h3>Recursos de expedicion</h3>
            <p>
              Este bloque queda preparado para conectar el modulo de consumo/obtencion al backend.
              La navegacion ya esta refactorizada para el nuevo flujo.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
