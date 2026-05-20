import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import './expeditions-panel.css'
import { ExpeditionsWorldMap } from './components/ExpeditionsWorldMap'
import { ExpeditionCreateWizard } from './components/ExpeditionCreateWizard'
import { ParticipantSelector } from './components/ParticipantSelector'
import { ActiveExpeditionDetail } from './components/ActiveExpeditionDetail'
import { useExpeditionsState } from './useExpeditionsState'
import type { ExpeditionMode } from './types'

type ExpeditionsPanelProps = {
  mode: string
  currentCampId: number
  onModeChange: (mode: ExpeditionMode) => void
}

function normalizeMode(mode: string): ExpeditionMode {
  if (mode === 'create') return 'create'
  if (mode === 'participants') return 'participants'
  if (mode === 'activeOps') return 'activeOps'
  if (mode === 'history') return 'history'
  if (mode === 'resources') return 'resources'
  return 'map'
}

export function ExpeditionsPanel({ mode, currentCampId, onModeChange }: ExpeditionsPanelProps) {
  const [selectedCampId, setSelectedCampId] = useState<number | null>(null)
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<number[]>([])
  const [selectedActiveExpeditionId, setSelectedActiveExpeditionId] = useState<number | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const {
    isLoading,
    isSaving,
    loadError,
    mapPoints,
    participantsCatalog,
    activeParticipants,
    injuredParticipants,
    activeExpeditions,
    historyExpeditions,
    createExpeditionWithFallback,
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

  const handleExpeditionCreate = async (payload: {
    name: string
    objective: string
    sector: string
    total: number
    campId: number
    participantIds: number[]
  }) => {
    const result = await createExpeditionWithFallback(payload)
    if (result.source === 'remote') {
      setNotice(
        result.participantAssignmentWarning
          ? 'Expedicion creada en backend. Aviso: no se pudo confirmar asignacion de participantes.'
          : 'Expedicion creada en backend correctamente.',
      )
    } else {
      setNotice('Backend no disponible. Expedicion creada localmente como respaldo.')
    }
    setTimeout(() => setNotice(null), 3200)
    setSelectedActiveExpeditionId(result.record.id)
    onModeChange('activeOps')
  }

  const resolvedSelectedActiveExpeditionId =
    selectedActiveExpeditionId && activeExpeditions.some((expedition) => expedition.id === selectedActiveExpeditionId)
      ? selectedActiveExpeditionId
      : null

  const selectedActiveExpedition =
    activeExpeditions.find((expedition) => expedition.id === resolvedSelectedActiveExpeditionId) ?? null

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
      {isSaving ? <div className="expx-state">Guardando expedicion y sincronizando participantes...</div> : null}
      {loadError ? <div className="expx-state is-error">{loadError}</div> : null}

      <AnimatePresence mode="wait" initial={false}>
        {!isLoading && currentMode === 'map' && (
          <motion.div key="map" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.24, ease: 'easeOut' }}>
            <ExpeditionsWorldMap
              camps={mapPoints}
              selectedCampId={selectedCampId}
              onSelectCamp={setSelectedCampId}
              onCreateFromCamp={(campId) => {
                setSelectedCampId(campId)
                onModeChange('create')
              }}
            />
          </motion.div>
        )}

        {!isLoading && currentMode === 'create' && (
          <motion.div key="create" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.24, ease: 'easeOut' }}>
            <ExpeditionCreateWizard
              key={selectedCampId ?? 0}
              camps={mapPoints}
              preselectedCampId={selectedCampId}
              activeParticipants={activeParticipants}
              injuredParticipants={injuredParticipants}
              isSaving={isSaving}
              onCancel={() => onModeChange('map')}
              onCreate={handleExpeditionCreate}
            />
          </motion.div>
        )}

        {!isLoading && currentMode === 'participants' && (
          <motion.div key="participants" className="expx-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.24, ease: 'easeOut' }}>
            <h3>Seleccion operativa de participantes</h3>
            <ParticipantSelector
              activeParticipants={activeParticipants}
              injuredParticipants={injuredParticipants}
              selectedIds={selectedParticipantIds}
              onChange={setSelectedParticipantIds}
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
