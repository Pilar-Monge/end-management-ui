import { useMemo, useState } from 'react'
import type { MappedCampPoint } from '../types'
import { ParticipantSelector } from './ParticipantSelector'
import type { ExpeditionParticipant } from '../types'

type ExpeditionCreateWizardProps = {
  camps: MappedCampPoint[]
  preselectedCampId: number | null
  activeParticipants: ExpeditionParticipant[]
  injuredParticipants: ExpeditionParticipant[]
  isSaving?: boolean
  onCancel: () => void
  onCreate: (payload: {
    name: string
    objective: string
    sector: string
    total: number
    campId: number
    participantIds: number[]
  }) => void
}

const STEPS = ['Mision', 'Ruta', 'Tiempo', 'Participantes', 'Confirmar']

export function ExpeditionCreateWizard({
  camps,
  preselectedCampId,
  activeParticipants,
  injuredParticipants,
  isSaving = false,
  onCancel,
  onCreate,
}: ExpeditionCreateWizardProps) {
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [objective, setObjective] = useState('')
  const [sector, setSector] = useState('')
  const [totalDays, setTotalDays] = useState(4)
  const [campId, setCampId] = useState<number>(preselectedCampId ?? camps[0]?.id ?? 0)
  const [participantIds, setParticipantIds] = useState<number[]>([])

  const selectedCamp = useMemo(() => camps.find((camp) => camp.id === campId) ?? null, [campId, camps])

  const selectedParticipantCount = participantIds.length

  const canAdvance = useMemo(() => {
    if (step === 0) return name.trim().length > 2 && objective.trim().length > 5
    if (step === 1) return sector.trim().length > 2 && campId > 0
    if (step === 2) return totalDays > 0
    if (step === 3) return participantIds.length > 0
    return true
  }, [campId, name, objective, participantIds.length, sector, step, totalDays])

  const submit = () => {
    if (!canAdvance || campId <= 0 || isSaving) return
    onCreate({
      name: name.trim(),
      objective: objective.trim(),
      sector: sector.trim(),
      total: totalDays,
      campId,
      participantIds,
    })
  }

  return (
    <div className="expx-wizard">
      <div className="expx-steps">
        {STEPS.map((label, index) => (
          <div key={label} className={`expx-step${index <= step ? ' is-active' : ''}`}>
            <span>{index + 1}</span>
            <small>{label}</small>
          </div>
        ))}
      </div>

      {step === 0 && (
        <div className="expx-form-grid">
          <label>
            Nombre de expedicion
            <input value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label>
            Objetivo operativo
            <textarea value={objective} onChange={(event) => setObjective(event.target.value)} rows={4} />
          </label>
        </div>
      )}

      {step === 1 && (
        <div className="expx-form-grid">
          <label>
            Campamento de salida
            <select value={campId} onChange={(event) => setCampId(Number(event.target.value))}>
              {camps.map((camp) => (
                <option key={camp.id} value={camp.id}>
                  {camp.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Sector / destino
            <input
              value={sector}
              onChange={(event) => setSector(event.target.value)}
              placeholder="Ej: Sector Norte - Hospital central"
            />
          </label>
        </div>
      )}

      {step === 2 && (
        <div className="expx-form-grid">
          <label>
            Duracion estimada (dias)
            <input
              type="number"
              min={1}
              value={totalDays}
              onChange={(event) => setTotalDays(Math.max(1, Number(event.target.value) || 1))}
            />
          </label>
          {selectedCamp ? (
            <div className="expx-camp-note">
              <strong>{selectedCamp.name}</strong>
              <span>
                Coordenadas base: {selectedCamp.latitude.toFixed(3)}, {selectedCamp.longitude.toFixed(3)}
              </span>
            </div>
          ) : null}
        </div>
      )}

      {step === 3 && (
        <ParticipantSelector
          activeParticipants={activeParticipants}
          injuredParticipants={injuredParticipants}
          selectedIds={participantIds}
          onChange={setParticipantIds}
        />
      )}

      {step === 4 && (
        <div className="expx-summary">
          <h4>Resumen de mision</h4>
          <p>Nombre: {name}</p>
          <p>Objetivo: {objective}</p>
          <p>Sector: {sector}</p>
          <p>Duracion: {totalDays} dias</p>
          <p>Campamento: {selectedCamp?.name ?? `#${campId}`}</p>
          <p>Participantes: {selectedParticipantCount}</p>
          <p className="expx-local-note">
            Esta fase crea la expedicion en modo local. Despues se conecta al backend.
          </p>
        </div>
      )}

      <div className="expx-actions">
        <button type="button" className="expx-btn-ghost" onClick={onCancel} disabled={isSaving}>
          Cancelar
        </button>
        <div>
          <button
            type="button"
            className="expx-btn-ghost"
            onClick={() => setStep((prev) => Math.max(0, prev - 1))}
            disabled={step === 0 || isSaving}
          >
            Atras
          </button>
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              className="expx-btn"
              onClick={() => setStep((prev) => Math.min(STEPS.length - 1, prev + 1))}
              disabled={!canAdvance || isSaving}
            >
              Siguiente
            </button>
          ) : (
            <button type="button" className="expx-btn" onClick={submit} disabled={isSaving}>
              {isSaving ? 'Guardando...' : 'Crear expedicion'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
