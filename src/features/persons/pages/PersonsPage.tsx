import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { EmptyState, ErrorState, LoadingSkeleton } from '../../catalogs/components/StateComponents'
import { useCreatePerson, useDeletePerson, useUpdatePerson } from '../api/mutations'
import { usePersons, usePersonsStats } from '../api/queries'
import type { CreatePersonRequest, Person, PersonStatus, UpdatePersonRequest } from '../types'

interface FormState {
  id?: number
  firstName: string
  lastName: string
  alias: string
  age: number
  campId: number
  occupationId: number
  notes: string
  status: PersonStatus
}

const INITIAL_FORM: FormState = {
  firstName: '',
  lastName: '',
  alias: '',
  age: 18,
  campId: 1,
  occupationId: 1,
  notes: '',
  status: 'ACTIVE',
}

const STATUS_OPTIONS: Array<PersonStatus | 'ALL'> = [
  'ALL',
  'ACTIVE',
  'INJURED',
  'MISSING',
  'DECEASED',
]

export function PersonsPage() {
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState<FormState>(INITIAL_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<PersonStatus | 'ALL'>('ALL')

  const { data: persons = [], isLoading, error, refetch } = usePersons()
  const { data: stats } = usePersonsStats()

  const createMutation = useCreatePerson()
  const updateMutation = useUpdatePerson()
  const deleteMutation = useDeletePerson()

  const filteredPersons = useMemo(() => {
    if (filterStatus === 'ALL') {
      return persons
    }

    return persons.filter((person: Person) => person.status === filterStatus)
  }, [persons, filterStatus])

  function resetForm() {
    setFormData(INITIAL_FORM)
    setFormError(null)
    setShowForm(false)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setFormError('Nombre y apellido son obligatorios.')
      return
    }

    if (!Number.isFinite(formData.age) || formData.age < 1) {
      setFormError('La edad debe ser mayor que cero.')
      return
    }

    if (!Number.isFinite(formData.campId) || formData.campId < 1) {
      setFormError('Campamento invalido.')
      return
    }

    if (!Number.isFinite(formData.occupationId) || formData.occupationId < 1) {
      setFormError('Ocupacion invalida.')
      return
    }

    try {
      if (formData.id) {
        const payload: UpdatePersonRequest = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          alias: formData.alias || undefined,
          age: formData.age,
          campId: formData.campId,
          occupationId: formData.occupationId,
          notes: formData.notes || undefined,
          status: formData.status,
        }

        await updateMutation.mutateAsync({ id: formData.id, data: payload })
      } else {
        const payload: CreatePersonRequest = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          alias: formData.alias || undefined,
          age: formData.age,
          campId: formData.campId,
          occupationId: formData.occupationId,
          notes: formData.notes || undefined,
        }

        await createMutation.mutateAsync(payload)
      }

      resetForm()
    } catch (submitError) {
      if (submitError instanceof Error) {
        setFormError(submitError.message)
      } else {
        setFormError('No fue posible guardar la persona.')
      }
    }
  }

  function handleEdit(person: Person) {
    setFormData({
      id: person.id,
      firstName: person.firstName,
      lastName: person.lastName,
      alias: person.alias ?? '',
      age: person.age,
      campId: person.campId,
      occupationId: person.occupationId,
      notes: person.notes ?? '',
      status: person.status,
    })

    setFormError(null)
    setShowForm(true)
  }

  async function handleDelete(personId: number) {
    const confirmed = window.confirm('Deseas eliminar esta persona?')

    if (!confirmed) {
      return
    }

    try {
      await deleteMutation.mutateAsync(personId)
    } catch (deleteError) {
      const message =
        deleteError instanceof Error ? deleteError.message : 'No fue posible eliminar.'
      window.alert(message)
    }
  }

  function statusColor(status: PersonStatus) {
    switch (status) {
      case 'ACTIVE':
        return '#7ddb50'
      case 'INJURED':
        return '#d9a63f'
      case 'MISSING':
        return '#8899aa'
      case 'DECEASED':
        return '#c95a5a'
      default:
        return '#7ddb50'
    }
  }

  return (
    <div style={{ padding: '24px' }}>
      <div
        style={{
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <h1
          style={{
            fontFamily: "'Georgia', serif",
            fontSize: '28px',
            color: '#b8f080',
            letterSpacing: '3px',
            margin: 0,
            textTransform: 'uppercase',
          }}
        >
          Personas
        </h1>

        {!showForm && (
          <motion.button
            onClick={() => setShowForm(true)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{
              background: 'rgba(74,138,48,0.14)',
              border: '1px solid rgba(74,138,48,0.5)',
              borderRadius: '4px',
              color: '#7ddb50',
              fontFamily: "'Courier New', monospace",
              fontSize: '11px',
              letterSpacing: '2px',
              textTransform: 'uppercase',
              padding: '10px 16px',
              cursor: 'pointer',
            }}
          >
            + Nueva Persona
          </motion.button>
        )}
      </div>

      {stats && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '12px',
            marginBottom: '20px',
          }}
        >
          {[
            { label: 'Total', value: stats.totalPersons },
            { label: 'Activos', value: stats.activePersons },
            { label: 'Heridos', value: stats.injuredPersons },
            { label: 'Ausentes', value: stats.missingPersons },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                background: 'rgba(74,138,48,0.1)',
                border: '1px solid rgba(74,138,48,0.2)',
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontFamily: "'Courier New', monospace",
                  fontSize: '10px',
                  color: '#3a6020',
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                }}
              >
                {item.label}
              </div>
              <div
                style={{
                  fontFamily: "'Courier New', monospace",
                  fontSize: '20px',
                  color: '#7ddb50',
                  fontWeight: 'bold',
                }}
              >
                {item.value}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {STATUS_OPTIONS.map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            style={{
              background: filterStatus === status ? 'rgba(74,138,48,0.2)' : 'transparent',
              border: `1px solid ${filterStatus === status ? 'rgba(74,138,48,0.5)' : 'rgba(74,138,48,0.2)'}`,
              borderRadius: '4px',
              color: filterStatus === status ? '#7ddb50' : '#3a6020',
              fontFamily: "'Courier New', monospace",
              fontSize: '10px',
              letterSpacing: '1px',
              padding: '6px 12px',
              cursor: 'pointer',
              textTransform: 'uppercase',
            }}
          >
            {status === 'ALL' ? 'Todos' : status}
          </button>
        ))}
      </div>

      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: 'rgba(10,18,8,0.7)',
            border: '1px solid rgba(74,138,48,0.3)',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '20px',
          }}
        >
          <form onSubmit={handleSubmit}>
            <h3 style={{ marginTop: 0, color: '#7ddb50', fontFamily: "'Courier New', monospace" }}>
              {formData.id ? 'Editar Persona' : 'Nueva Persona'}
            </h3>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                marginBottom: '12px',
              }}
            >
              <input
                value={formData.firstName}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, firstName: event.target.value }))
                }
                placeholder="Nombre"
                style={inputStyle}
              />
              <input
                value={formData.lastName}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, lastName: event.target.value }))
                }
                placeholder="Apellido"
                style={inputStyle}
              />
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '12px',
                marginBottom: '12px',
              }}
            >
              <input
                value={formData.alias}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, alias: event.target.value }))
                }
                placeholder="Alias"
                style={inputStyle}
              />
              <input
                type="number"
                value={formData.age}
                min={1}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    age: Number.parseInt(event.target.value, 10) || 0,
                  }))
                }
                placeholder="Edad"
                style={inputStyle}
              />
              <select
                value={formData.status}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, status: event.target.value as PersonStatus }))
                }
                style={inputStyle}
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INJURED">INJURED</option>
                <option value="MISSING">MISSING</option>
                <option value="DECEASED">DECEASED</option>
              </select>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                marginBottom: '12px',
              }}
            >
              <input
                type="number"
                min={1}
                value={formData.campId}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    campId: Number.parseInt(event.target.value, 10) || 0,
                  }))
                }
                placeholder="Camp ID"
                style={inputStyle}
              />
              <input
                type="number"
                min={1}
                value={formData.occupationId}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    occupationId: Number.parseInt(event.target.value, 10) || 0,
                  }))
                }
                placeholder="Occupation ID"
                style={inputStyle}
              />
            </div>

            <textarea
              value={formData.notes}
              onChange={(event) => setFormData((prev) => ({ ...prev, notes: event.target.value }))}
              placeholder="Notas"
              style={{ ...inputStyle, width: '100%', minHeight: '72px', marginBottom: '12px' }}
            />

            {formError && (
              <div
                style={{
                  background: 'rgba(224,80,80,0.1)',
                  color: '#e08080',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  marginBottom: '12px',
                  fontSize: '12px',
                  fontFamily: "'Courier New', monospace",
                }}
              >
                {formError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="submit"
                style={primaryButtonStyle}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {formData.id ? 'Actualizar' : 'Crear'}
              </button>
              <button type="button" onClick={resetForm} style={secondaryButtonStyle}>
                Cancelar
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {isLoading ? (
        <LoadingSkeleton rows={5} cols={5} />
      ) : error ? (
        <ErrorState title="Error" message={error.message} onRetry={() => refetch()} />
      ) : filteredPersons.length === 0 ? (
        <EmptyState
          title="Sin personas"
          description="No hay supervivientes registrados para este filtro."
          action={{ label: 'Crear primera persona', onClick: () => setShowForm(true) }}
        />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '16px',
          }}
        >
          {filteredPersons.map((person: Person) => (
            <motion.div
              key={person.id}
              whileHover={{ scale: 1.02 }}
              style={{
                background: 'rgba(10,18,8,0.7)',
                border: `1px solid ${statusColor(person.status)}55`,
                borderRadius: '8px',
                padding: '16px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '10px',
                  gap: '8px',
                }}
              >
                <h3 style={{ margin: 0, color: '#b8f080', fontSize: '16px' }}>
                  {person.firstName} {person.lastName}
                </h3>
                <span
                  style={{
                    background: statusColor(person.status),
                    color: '#060a04',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    padding: '3px 8px',
                    borderRadius: '3px',
                    letterSpacing: '1px',
                  }}
                >
                  {person.status}
                </span>
              </div>

              <div
                style={{
                  color: '#3a6020',
                  fontFamily: "'Courier New', monospace",
                  fontSize: '12px',
                  marginBottom: '10px',
                }}
              >
                Alias: {person.alias || '-'}
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px',
                  marginBottom: '12px',
                }}
              >
                <InfoBox label="Edad" value={person.age} />
                <InfoBox label="Camp ID" value={person.campId} />
                <InfoBox label="Occupation" value={person.occupationId} />
                <InfoBox label="Logros" value={person.achievementIds?.length || 0} />
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => handleEdit(person)}
                  style={smallPrimaryButtonStyle}
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(person.id)}
                  style={smallDangerButtonStyle}
                >
                  Eliminar
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

function InfoBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div
      style={{
        background: 'rgba(74,138,48,0.1)',
        borderRadius: '4px',
        padding: '8px',
      }}
    >
      <div
        style={{
          fontFamily: "'Courier New', monospace",
          fontSize: '9px',
          color: '#3a6020',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "'Courier New', monospace",
          fontSize: '14px',
          color: '#7ddb50',
          fontWeight: 'bold',
        }}
      >
        {value}
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  background: 'rgba(10,18,8,0.8)',
  border: '1px solid rgba(74,138,48,0.3)',
  color: '#7ddb50',
  padding: '8px 12px',
  borderRadius: '4px',
  fontFamily: "'Courier New', monospace",
}

const primaryButtonStyle: React.CSSProperties = {
  background: 'rgba(74,138,48,0.14)',
  border: '1px solid rgba(74,138,48,0.5)',
  color: '#7ddb50',
  borderRadius: '4px',
  padding: '10px 16px',
  cursor: 'pointer',
  textTransform: 'uppercase',
  letterSpacing: '1px',
  fontFamily: "'Courier New', monospace",
}

const secondaryButtonStyle: React.CSSProperties = {
  background: 'rgba(60,60,80,0.14)',
  border: '1px solid rgba(100,100,120,0.3)',
  color: '#8080a0',
  borderRadius: '4px',
  padding: '10px 16px',
  cursor: 'pointer',
  textTransform: 'uppercase',
  letterSpacing: '1px',
  fontFamily: "'Courier New', monospace",
}

const smallPrimaryButtonStyle: React.CSSProperties = {
  background: 'rgba(74,138,48,0.14)',
  border: '1px solid rgba(74,138,48,0.3)',
  color: '#7ddb50',
  borderRadius: '4px',
  padding: '6px 10px',
  cursor: 'pointer',
  fontFamily: "'Courier New', monospace",
  fontSize: '12px',
  flex: 1,
}

const smallDangerButtonStyle: React.CSSProperties = {
  background: 'rgba(224,80,80,0.14)',
  border: '1px solid rgba(224,80,80,0.3)',
  color: '#e08080',
  borderRadius: '4px',
  padding: '6px 10px',
  cursor: 'pointer',
  fontFamily: "'Courier New', monospace",
  fontSize: '12px',
}
