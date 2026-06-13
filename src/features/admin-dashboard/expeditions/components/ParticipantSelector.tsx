import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, Search } from 'lucide-react'
import type { ExpeditionParticipant } from '../types'

type ParticipantSelectorProps = {
  activeParticipants: ExpeditionParticipant[]
  injuredParticipants: ExpeditionParticipant[]
  selectedIds: number[]
  onChange: (selectedIds: number[]) => void
}

function PersonCard({
  person,
  isSelected,
  warning,
  onPreview,
  onAdd,
  onRemove,
}: {
  person: ExpeditionParticipant
  isSelected: boolean
  warning?: string
  onPreview: () => void
  onAdd: () => void
  onRemove: () => void
}) {
  const stamina = person.status === 'INJURED' ? 38 : Math.min(98, 62 + (person.age % 18))

  return (
    <article className={`expx-person-card${isSelected ? ' is-selected' : ''}`}>
      <div className="expx-person-topline">
        <button type="button" className="expx-person-avatar-btn" onClick={onPreview}>
          <img
            src={person.profileImage}
            alt={`Perfil de ${person.fullName}`}
            className={`expx-person-avatar${person.status === 'INJURED' ? ' is-injured' : ''}`}
          />
        </button>
        <div className="expx-person-stamina" aria-hidden="true">
          <span style={{ width: `${stamina}%` }} />
        </div>
      </div>
      <div className="expx-person-main">
        <span className="expx-person-name">{person.fullName}</span>
        <span className="expx-person-role">{person.roleLabel}</span>
      </div>
      <span className="expx-person-meta">Edad {person.age}</span>
      {warning ? (
        <span className="expx-person-warning">
          <AlertTriangle size={12} /> {warning}
        </span>
      ) : null}

      <div className="expx-person-actions">
        <button type="button" className="expx-btn-ghost" onClick={onPreview}>
          Ver perfil
        </button>
        {isSelected ? (
          <button type="button" className="expx-btn-ghost" onClick={onRemove}>
            Quitar
          </button>
        ) : (
          <button type="button" className="expx-btn" onClick={onAdd}>
            Agregar
          </button>
        )}
      </div>
    </article>
  )
}

export function ParticipantSelector({
  activeParticipants,
  injuredParticipants,
  selectedIds,
  onChange,
}: ParticipantSelectorProps) {
  const [search, setSearch] = useState('')
  const [selectedProfile, setSelectedProfile] = useState<ExpeditionParticipant | null>(null)
  const [photoPreview, setPhotoPreview] = useState<{ src: string; name: string } | null>(null)
  const query = search.trim().toLowerCase()

  const filteredActive = useMemo(
    () =>
      activeParticipants.filter((person) => {
        if (!query) return true
        return (
          person.fullName.toLowerCase().includes(query) ||
          person.roleLabel.toLowerCase().includes(query)
        )
      }),
    [activeParticipants, query],
  )

  const filteredInjured = useMemo(
    () =>
      injuredParticipants.filter((person) => {
        if (!query) return true
        return (
          person.fullName.toLowerCase().includes(query) ||
          person.roleLabel.toLowerCase().includes(query)
        )
      }),
    [injuredParticipants, query],
  )

  const selectedParticipants = useMemo(() => {
    const catalog = [...activeParticipants, ...injuredParticipants]
    return selectedIds
      .map((selectedId) => catalog.find((person) => person.id === selectedId))
      .filter((person): person is ExpeditionParticipant => Boolean(person))
  }, [activeParticipants, injuredParticipants, selectedIds])

  const addParticipant = (personId: number, needsWarning: boolean) => {
    if (selectedIds.includes(personId)) return

    if (needsWarning) {
      const confirmed = window.confirm(
        'La persona esta lesionada (INJURED). Deseas incluirla de todas formas?',
      )
      if (!confirmed) return
    }

    onChange([...selectedIds, personId])
  }

  const removeParticipant = (personId: number) => {
    onChange(selectedIds.filter((id) => id !== personId))
  }

  useEffect(() => {
    if (!selectedProfile && !photoPreview) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (photoPreview) {
        setPhotoPreview(null)
        return
      }
      setSelectedProfile(null)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [photoPreview, selectedProfile])

  return (
    <div className="expx-participant-shell">
      <div className="expx-selected-wrap">
        <h4>Seleccionados ({selectedParticipants.length})</h4>
        {selectedParticipants.length > 0 ? (
          <div className="expx-selected-list">
            {selectedParticipants.map((person) => (
                <button
                  key={person.id}
                  type="button"
                  className="expx-selected-chip"
                  onClick={() => removeParticipant(person.id)}
                >
                  {person.fullName} - {person.roleLabel} x
                </button>
            ))}
          </div>
        ) : (
          <p className="expx-block-note">No hay participantes agregados.</p>
        )}
      </div>

      <div className="expx-search">
        <Search size={13} />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por nombre o rol"
        />
      </div>

      <div className="expx-participant-cols">
        <section>
          <h4>ACTIVE ({filteredActive.length})</h4>
          <div className="expx-person-grid">
            {filteredActive.map((person) => (
              <PersonCard
                key={person.id}
                person={person}
                isSelected={selectedIds.includes(person.id)}
                onPreview={() => setSelectedProfile(person)}
                onAdd={() => addParticipant(person.id, false)}
                onRemove={() => removeParticipant(person.id)}
              />
            ))}
          </div>
        </section>

        <section>
          <h4>INJURED ({filteredInjured.length})</h4>
          <p className="expx-block-note">Seleccion permitida con advertencia medica.</p>
          <div className="expx-person-grid">
            {filteredInjured.map((person) => (
              <PersonCard
                key={person.id}
                person={person}
                isSelected={selectedIds.includes(person.id)}
                warning="Riesgo alto"
                onPreview={() => setSelectedProfile(person)}
                onAdd={() => addParticipant(person.id, true)}
                onRemove={() => removeParticipant(person.id)}
              />
            ))}
          </div>
        </section>
      </div>

      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {selectedProfile ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="expx-profile-overlay"
                onClick={() => setSelectedProfile(null)}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 14 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 8 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="expx-profile-card"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="expx-profile-head">
                    <h3>Ficha de participante</h3>
                    <button type="button" className="expx-btn-ghost" onClick={() => setSelectedProfile(null)}>
                      X
                    </button>
                  </div>

                  <div className="expx-profile-main">
                    <button
                      type="button"
                      className="expx-profile-photo-btn"
                      onClick={() =>
                        setPhotoPreview({ src: selectedProfile.profileImage, name: selectedProfile.fullName })
                      }
                    >
                      <img
                        src={selectedProfile.profileImage}
                        alt={`Perfil de ${selectedProfile.fullName}`}
                        className="expx-profile-photo"
                      />
                    </button>
                    <div>
                      <h4>{selectedProfile.fullName}</h4>
                      <small>{selectedProfile.roleLabel}</small>
                    </div>
                    <span className={`expx-profile-status is-${selectedProfile.status.toLowerCase()}`}>
                      {selectedProfile.status}
                    </span>
                  </div>

                  <div className="expx-profile-grid">
                    <article>
                      <span>Edad</span>
                      <strong>{selectedProfile.age} anos</strong>
                    </article>
                    <article>
                      <span>ID</span>
                      <strong>#{selectedProfile.id}</strong>
                    </article>
                  </div>

                  <div className="expx-profile-description">
                    <span>Descripcion</span>
                    <p>{selectedProfile.description}</p>
                  </div>

                  <div className="expx-actions">
                    <button
                      type="button"
                      className="expx-btn-ghost"
                      onClick={() => setSelectedProfile(null)}
                    >
                      Volver
                    </button>
                    <div>
                      {selectedIds.includes(selectedProfile.id) ? (
                        <button
                          type="button"
                          className="expx-btn-ghost"
                          onClick={() => removeParticipant(selectedProfile.id)}
                        >
                          Quitar de expedicion
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="expx-btn"
                          onClick={() => addParticipant(selectedProfile.id, selectedProfile.status === 'INJURED')}
                        >
                          Agregar a expedicion
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            ) : null}
          </AnimatePresence>,
          document.body,
        )}

      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {photoPreview ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="expx-profile-overlay expx-profile-overlay--photo"
                onClick={() => setPhotoPreview(null)}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.94, y: 8 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="expx-profile-photo-modal"
                  onClick={(event) => event.stopPropagation()}
                >
                  <img src={photoPreview.src} alt={`Perfil ampliado de ${photoPreview.name}`} />
                </motion.div>
              </motion.div>
            ) : null}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  )
}
