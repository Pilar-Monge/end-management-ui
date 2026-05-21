import { useEffect, useMemo, useState } from 'react'
import { Clock3, Route, ShieldAlert, Users } from 'lucide-react'
import { WorldMap } from '../../../expeditions-ui/components/WorldMap'
import type { ExpeditionParticipant, ExpeditionRecord, MappedCampPoint } from '../types'
import { ParticipantSelector } from './ParticipantSelector'

type ActiveExpeditionDetailProps = {
  expedition: ExpeditionRecord
  camps: MappedCampPoint[]
  participants: ExpeditionParticipant[]
  canManageParticipants: boolean
  onUpdateParticipants: (participantIds: number[]) => Promise<void>
  isUpdatingParticipants: boolean
}

function statusTone(status: ExpeditionRecord['status']) {
  if (status === 'PROGRAMADA') return '#4AAED2'
  if (status === 'REGRESANDO') return '#D4A65A'
  if (status === 'COMPLETADA') return '#0D9488'
  return '#7FB8FF'
}

export function ActiveExpeditionDetail({
  expedition,
  camps,
  participants,
  canManageParticipants,
  onUpdateParticipants,
  isUpdatingParticipants,
}: ActiveExpeditionDetailProps) {
  const expeditionCamp = camps.find((camp) => camp.id === expedition.campId) ?? camps[0] ?? null
  const homeCamp = camps[0] ?? null
  const fallbackCamp = camps.find((camp) => camp.id !== homeCamp?.id) ?? null
  const [isParticipantsOverlayOpen, setIsParticipantsOverlayOpen] = useState(false)
  const [pendingParticipantIds, setPendingParticipantIds] = useState<number[]>(expedition.participantIds)

  const relatedParticipants = useMemo(
    () => participants.filter((person) => expedition.participantIds.includes(person.id)),
    [expedition.participantIds, participants],
  )

  const activeParticipants = useMemo(
    () => participants.filter((person) => person.status === 'ACTIVE'),
    [participants],
  )

  const injuredParticipants = useMemo(
    () => participants.filter((person) => person.status === 'INJURED'),
    [participants],
  )

  const canApplyChanges =
    pendingParticipantIds.length > 0 &&
    pendingParticipantIds.join(',') !== expedition.participantIds.join(',')

  const openParticipantsManager = () => {
    setPendingParticipantIds(expedition.participantIds)
    setIsParticipantsOverlayOpen(true)
  }

  const applyParticipantsUpdate = async () => {
    if (!canApplyChanges || isUpdatingParticipants) return
    await onUpdateParticipants(pendingParticipantIds)
    setIsParticipantsOverlayOpen(false)
  }

  useEffect(() => {
    if (!isParticipantsOverlayOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsParticipantsOverlayOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isParticipantsOverlayOpen])

  const dots = useMemo(() => {
    if (!homeCamp || !expeditionCamp) return []

    const destination =
      expeditionCamp.id === homeCamp.id && fallbackCamp
        ? fallbackCamp
        : expeditionCamp

    return [
      {
        start: { lat: homeCamp.latitude, lng: homeCamp.longitude, label: 'Base' },
        end: { lat: destination.latitude, lng: destination.longitude, label: destination.name.slice(0, 14) },
        status: expedition.status === 'COMPLETADA' ? 'COMPLETED' : expedition.status === 'PROGRAMADA' ? 'PLANNED' : 'IN_PROGRESS',
      },
    ]
  }, [expedition.status, expeditionCamp, fallbackCamp, homeCamp])

  const progressPercent = Math.max(0, Math.min(100, Math.round((expedition.day / Math.max(1, expedition.total)) * 100)))

  const timelineSteps = [
    { label: 'Plan', active: true },
    { label: 'Salida', active: expedition.day >= 0 },
    { label: 'Campo', active: expedition.day >= Math.max(1, Math.ceil(expedition.total * 0.4)) },
    { label: 'Retorno', active: expedition.status === 'REGRESANDO' || expedition.status === 'COMPLETADA' },
    { label: 'Cierre', active: expedition.status === 'COMPLETADA' },
  ]

  return (
    <aside className="expx-detail-panel">
      <div className="expx-detail-head">
        <h3>{expedition.name}</h3>
        <span style={{ color: statusTone(expedition.status) }}>{expedition.status}</span>
      </div>

      <p className="expx-detail-objective">{expedition.objective}</p>

      <div className="expx-progress-wrap">
        <div className="expx-progress-bar">
          <span style={{ width: `${progressPercent}%` }} />
        </div>
        <small>{progressPercent}% completado</small>
      </div>

      <div className="expx-timeline">
        {timelineSteps.map((step) => (
          <div key={step.label} className={`expx-tl-step${step.active ? ' is-active' : ''}`}>
            <i />
            <span>{step.label}</span>
          </div>
        ))}
      </div>

      <div className="expx-detail-map">
        <WorldMap dots={dots} lineColor="#69BFB7" />
      </div>

      <div className="expx-detail-meta">
        <small className="expx-detail-meta-item">
          <Clock3 size={11} />
          Dia {expedition.day}/{expedition.total}
        </small>
        <small className="expx-detail-meta-item">
          <Route size={11} /> Sector: {expedition.sector}
        </small>
        <small className="expx-detail-meta-item">
          <ShieldAlert size={11} /> Campamento: {expeditionCamp?.name ?? `#${expedition.campId}`}
        </small>
      </div>

      <div className="expx-detail-crew">
        <h4>
          <Users size={13} /> Participantes ({relatedParticipants.length})
        </h4>
        <div className="expx-crew-actions">
          <button
            type="button"
            className="expx-btn-ghost"
            onClick={openParticipantsManager}
            disabled={!canManageParticipants || isUpdatingParticipants}
          >
            Gestionar participantes
          </button>
          {!canManageParticipants ? (
            <small className="expx-block-note">
              Solo puedes cambiar participantes antes de iniciar la expedicion o antes del dia de salida.
            </small>
          ) : null}
        </div>
        {relatedParticipants.length > 0 ? (
          relatedParticipants.map((person) => (
            <div key={person.id} className="expx-detail-person">
              <span>{person.fullName}</span>
              <small>{person.roleLabel}</small>
            </div>
          ))
        ) : (
          <p>Sin personas enlazadas en registro actual.</p>
        )}
      </div>

      {isParticipantsOverlayOpen ? (
        <div className="expx-overlay" role="dialog" aria-modal="true" aria-label="Gestion de participantes">
          <div className="expx-overlay-card">
            <div className="expx-overlay-head">
              <div>
                <h3>Gestionar participantes</h3>
                <small>{expedition.name}</small>
              </div>
              <button
                type="button"
                className="expx-btn-ghost"
                onClick={() => setIsParticipantsOverlayOpen(false)}
                disabled={isUpdatingParticipants}
              >
                Salir
              </button>
            </div>
            <ParticipantSelector
              activeParticipants={activeParticipants}
              injuredParticipants={injuredParticipants}
              selectedIds={pendingParticipantIds}
              onChange={setPendingParticipantIds}
            />
            <div className="expx-actions">
              <button
                type="button"
                className="expx-btn-ghost"
                onClick={() => setIsParticipantsOverlayOpen(false)}
                disabled={isUpdatingParticipants}
              >
                Cancelar
              </button>
              <div>
                <button
                  type="button"
                  className="expx-btn"
                  onClick={applyParticipantsUpdate}
                  disabled={!canApplyChanges || isUpdatingParticipants}
                >
                  {isUpdatingParticipants ? 'Actualizando...' : 'Aplicar cambios'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </aside>
  )
}
