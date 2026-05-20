import { useMemo, useState } from 'react'
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
  onToggle,
}: {
  person: ExpeditionParticipant
  isSelected: boolean
  warning?: string
  onToggle: () => void
}) {
  const initials = person.fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk[0]?.toUpperCase() ?? '')
    .join('')

  const stamina = person.status === 'INJURED' ? 38 : Math.min(98, 62 + (person.age % 18))

  return (
    <button
      type="button"
      className={`expx-person-card${isSelected ? ' is-selected' : ''}`}
      onClick={onToggle}
    >
      <div className="expx-person-topline">
        <span className={`expx-person-avatar${person.status === 'INJURED' ? ' is-injured' : ''}`}>{initials}</span>
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
    </button>
  )
}

export function ParticipantSelector({
  activeParticipants,
  injuredParticipants,
  selectedIds,
  onChange,
}: ParticipantSelectorProps) {
  const [search, setSearch] = useState('')
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

  const toggleSelection = (personId: number, needsWarning: boolean) => {
    const alreadySelected = selectedIds.includes(personId)
    if (alreadySelected) {
      onChange(selectedIds.filter((id) => id !== personId))
      return
    }

    if (needsWarning) {
      const confirmed = window.confirm(
        'La persona esta lesionada (INJURED). Deseas incluirla de todas formas?',
      )
      if (!confirmed) return
    }

    onChange([...selectedIds, personId])
  }

  return (
    <div className="expx-participant-shell">
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
                onToggle={() => toggleSelection(person.id, false)}
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
                onToggle={() => toggleSelection(person.id, true)}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
