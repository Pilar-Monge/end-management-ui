import { useState } from 'react'
import { motion } from 'framer-motion'
import { useOccupationCriteria, useOccupations } from '../api/queries'
import {
  useCreateOccupationCriteria,
  useUpdateOccupationCriteria,
  useDeleteOccupationCriteria,
} from '../api/mutations'
import type {
  OccupationAssignmentCriteria,
  Occupation,
  CreateOccupationCriteriaRequest,
  UpdateOccupationCriteriaRequest,
} from '../types'
import { LoadingSkeleton, EmptyState, ErrorState } from '../components/StateComponents'

interface FormState {
  id?: number
  occupationId: number
  criteriaName: string
  weight: number
  evaluationType: OccupationAssignmentCriteria['evaluationType']
}

const INITIAL_FORM: FormState = {
  occupationId: 0,
  criteriaName: '',
  weight: 1,
  evaluationType: 'MANDATORY',
}

export function OccupationCriteriaPage() {
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState<FormState>(INITIAL_FORM)
  const [formError, setFormError] = useState<string | null>(null)

  const { data: criteria = [], isLoading, error, refetch } = useOccupationCriteria()
  const { data: occupations = [] } = useOccupations()
  const createMutation = useCreateOccupationCriteria()
  const updateMutation = useUpdateOccupationCriteria()
  const deleteMutation = useDeleteOccupationCriteria()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!formData.criteriaName.trim() || formData.occupationId === 0) {
      setFormError('Ocupación y criterio son requeridos')
      return
    }

    try {
      if (formData.id) {
        await updateMutation.mutateAsync({
          id: formData.id,
          data: {
            occupationId: formData.occupationId,
            criteriaName: formData.criteriaName,
            weight: formData.weight,
            evaluationType: formData.evaluationType,
          } as UpdateOccupationCriteriaRequest,
        })
      } else {
        await createMutation.mutateAsync({
          occupationId: formData.occupationId,
          criteriaName: formData.criteriaName,
          weight: formData.weight,
          evaluationType: formData.evaluationType,
        } as CreateOccupationCriteriaRequest)
      }
      setFormData(INITIAL_FORM)
      setShowForm(false)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al procesar el criterio')
    }
  }

  const handleEdit = (item: OccupationAssignmentCriteria) => {
    setFormData({
      id: item.id,
      occupationId: item.occupationId,
      criteriaName: item.criteriaName,
      weight: item.weight,
      evaluationType: item.evaluationType,
    })
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    if (window.confirm('¿Eliminar este criterio?')) {
      try {
        await deleteMutation.mutateAsync(id)
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Error al eliminar')
      }
    }
  }

  const handleCancel = () => {
    setFormData(INITIAL_FORM)
    setShowForm(false)
    setFormError(null)
  }

  const getOccupationName = (occId: number) => {
    return occupations.find((o: Occupation) => o.id === occId)?.name || 'Desconocida'
  }

  return (
    <div style={{ padding: '24px' }}>
      <div
        style={{
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
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
          Criterios de Asignación
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
            + Nuevo
          </motion.button>
        )}
      </div>

      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: 'rgba(10,18,8,0.7)',
            border: '1px solid rgba(74,138,48,0.3)',
            borderRadius: '8px',
            padding: '20px',
            marginBottom: '24px',
          }}
        >
          <form onSubmit={handleSubmit}>
            <select
              value={formData.occupationId}
              onChange={(e) => setFormData({ ...formData, occupationId: parseInt(e.target.value) })}
              style={{
                width: '100%',
                background: 'rgba(10,18,8,0.8)',
                border: '1px solid rgba(74,138,48,0.3)',
                color: '#7ddb50',
                padding: '8px 12px',
                borderRadius: '4px',
                fontFamily: "'Courier New', monospace",
                marginBottom: '12px',
              }}
            >
              <option value={0}>Seleccionar ocupación</option>
              {occupations.map((occ: Occupation) => (
                <option key={occ.id} value={occ.id}>
                  {occ.name}
                </option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Nombre del criterio"
              value={formData.criteriaName}
              onChange={(e) => setFormData({ ...formData, criteriaName: e.target.value })}
              style={{
                width: '100%',
                background: 'rgba(10,18,8,0.8)',
                border: '1px solid rgba(74,138,48,0.3)',
                color: '#7ddb50',
                padding: '8px 12px',
                borderRadius: '4px',
                fontFamily: "'Courier New', monospace",
                marginBottom: '12px',
              }}
            />

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
                placeholder="Peso (ponderación)"
                value={formData.weight}
                onChange={(e) =>
                  setFormData({ ...formData, weight: parseFloat(e.target.value) || 1 })
                }
                min={0}
                max={100}
                step={0.1}
                style={{
                  background: 'rgba(10,18,8,0.8)',
                  border: '1px solid rgba(74,138,48,0.3)',
                  color: '#7ddb50',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  fontFamily: "'Courier New', monospace",
                }}
              />
              <select
                value={formData.evaluationType}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    evaluationType: e.target
                      .value as OccupationAssignmentCriteria['evaluationType'],
                  })
                }
                style={{
                  background: 'rgba(10,18,8,0.8)',
                  border: '1px solid rgba(74,138,48,0.3)',
                  color: '#7ddb50',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  fontFamily: "'Courier New', monospace",
                }}
              >
                <option value="MANDATORY">Obligatorio</option>
                <option value="OPTIONAL">Opcional</option>
                <option value="PREFERRED">Preferente</option>
              </select>
            </div>

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
                ⚠ {formError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px' }}>
              <motion.button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  background:
                    createMutation.isPending || updateMutation.isPending
                      ? 'rgba(74,138,48,0.1)'
                      : 'rgba(74,138,48,0.14)',
                  border: '1px solid rgba(74,138,48,0.5)',
                  borderRadius: '4px',
                  color:
                    createMutation.isPending || updateMutation.isPending ? '#3a6020' : '#7ddb50',
                  fontFamily: "'Courier New', monospace",
                  fontSize: '11px',
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                  padding: '10px 16px',
                  cursor:
                    createMutation.isPending || updateMutation.isPending
                      ? 'not-allowed'
                      : 'pointer',
                  flex: 1,
                }}
              >
                {formData.id ? 'Actualizar' : 'Crear'}
              </motion.button>
              <motion.button
                type="button"
                onClick={handleCancel}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  background: 'rgba(60,60,80,0.14)',
                  border: '1px solid rgba(100,100,120,0.3)',
                  borderRadius: '4px',
                  color: '#8080a0',
                  fontFamily: "'Courier New', monospace",
                  fontSize: '11px',
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                  padding: '10px 16px',
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </motion.button>
            </div>
          </form>
        </motion.div>
      )}

      {isLoading ? (
        <LoadingSkeleton rows={5} cols={4} />
      ) : error ? (
        <ErrorState title="Error" message={error.message} onRetry={() => refetch()} />
      ) : criteria.length === 0 ? (
        <EmptyState
          title="Sin criterios"
          description="No hay criterios de asignación definidos"
          action={{ label: 'Crear primero', onClick: () => setShowForm(true) }}
        />
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            background: 'rgba(10,18,8,0.5)',
            border: '1px solid rgba(74,138,48,0.2)',
            borderRadius: '8px',
            overflow: 'hidden',
          }}
        >
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontFamily: "'Courier New', monospace",
              fontSize: '12px',
            }}
          >
            <thead>
              <tr
                style={{
                  background: 'rgba(74,138,48,0.1)',
                  borderBottom: '1px solid rgba(74,138,48,0.2)',
                }}
              >
                <th
                  style={{
                    padding: '12px',
                    textAlign: 'left',
                    color: '#7ddb50',
                    fontWeight: 'bold',
                  }}
                >
                  Ocupación
                </th>
                <th
                  style={{
                    padding: '12px',
                    textAlign: 'left',
                    color: '#7ddb50',
                    fontWeight: 'bold',
                  }}
                >
                  Criterio
                </th>
                <th
                  style={{
                    padding: '12px',
                    textAlign: 'center',
                    color: '#7ddb50',
                    fontWeight: 'bold',
                  }}
                >
                  Peso
                </th>
                <th
                  style={{
                    padding: '12px',
                    textAlign: 'center',
                    color: '#7ddb50',
                    fontWeight: 'bold',
                  }}
                >
                  Tipo
                </th>
                <th
                  style={{
                    padding: '12px',
                    textAlign: 'center',
                    color: '#7ddb50',
                    fontWeight: 'bold',
                  }}
                >
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {criteria.map((item: OccupationAssignmentCriteria, idx: number) => (
                <tr
                  key={item.id}
                  style={{
                    borderBottom: '1px solid rgba(74,138,48,0.1)',
                    background: idx % 2 === 0 ? 'transparent' : 'rgba(74,138,48,0.05)',
                  }}
                >
                  <td style={{ padding: '12px', color: '#b8f080' }}>
                    {getOccupationName(item.occupationId)}
                  </td>
                  <td style={{ padding: '12px', color: '#3a6020' }}>{item.criteriaName}</td>
                  <td style={{ padding: '12px', textAlign: 'center', color: '#7ddb50' }}>
                    {item.weight.toFixed(2)}
                  </td>
                  <td
                    style={{
                      padding: '12px',
                      textAlign: 'center',
                      color: '#3a6020',
                      fontSize: '11px',
                    }}
                  >
                    {item.evaluationType}
                  </td>
                  <td
                    style={{
                      padding: '12px',
                      textAlign: 'center',
                      display: 'flex',
                      gap: '8px',
                      justifyContent: 'center',
                    }}
                  >
                    <motion.button
                      onClick={() => handleEdit(item)}
                      whileHover={{ scale: 1.1 }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#7ddb50',
                        cursor: 'pointer',
                        fontSize: '14px',
                      }}
                    >
                      ✏
                    </motion.button>
                    <motion.button
                      onClick={() => handleDelete(item.id)}
                      whileHover={{ scale: 1.1 }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#e08080',
                        cursor: 'pointer',
                        fontSize: '14px',
                      }}
                    >
                      ✕
                    </motion.button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}
    </div>
  )
}
