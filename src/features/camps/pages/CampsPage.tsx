import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useCamps, useCampStats } from '../api/queries'
import { useCreateCamp, useUpdateCamp, useDeleteCamp } from '../api/mutations'
import type { Camp, CreateCampRequest, UpdateCampRequest } from '../types'
import { LoadingSkeleton, EmptyState, ErrorState } from '../../catalogs/components/StateComponents'

interface FormState {
  id?: number
  name: string
  description: string
  capacity: number
  latitude: number
  longitude: number
  zone?: string
  defenseLevel: number
  watchers: number
}

const INITIAL_FORM: FormState = {
  name: '',
  description: '',
  capacity: 50,
  latitude: 0,
  longitude: 0,
  zone: '',
  defenseLevel: 50,
  watchers: 5,
}

export function CampsPage() {
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState<FormState>(INITIAL_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<Camp['status'] | 'ALL'>('ALL')

  const { data: camps = [], isLoading, error, refetch } = useCamps()
  const { data: stats } = useCampStats()
  const createMutation = useCreateCamp()
  const updateMutation = useUpdateCamp()
  const deleteMutation = useDeleteCamp()

  const filteredCamps = useMemo(() => {
    return filterStatus === 'ALL' ? camps : camps.filter((c: Camp) => c.status === filterStatus)
  }, [camps, filterStatus])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!formData.name.trim() || formData.capacity === 0) {
      setFormError('Nombre y capacidad son requeridos')
      return
    }

    try {
      if (formData.id) {
        await updateMutation.mutateAsync({
          id: formData.id,
          data: {
            name: formData.name,
            description: formData.description,
            capacity: formData.capacity,
            defenseLevel: formData.defenseLevel,
            watchers: formData.watchers,
            location: {
              latitude: formData.latitude,
              longitude: formData.longitude,
              zone: formData.zone,
            },
          } as UpdateCampRequest,
        })
      } else {
        await createMutation.mutateAsync({
          name: formData.name,
          description: formData.description,
          capacity: formData.capacity,
          defenseLevel: formData.defenseLevel,
          watchers: formData.watchers,
          location: {
            latitude: formData.latitude,
            longitude: formData.longitude,
            zone: formData.zone,
          },
        } as CreateCampRequest)
      }
      setFormData(INITIAL_FORM)
      setShowForm(false)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al procesar campamento')
    }
  }

  const handleEdit = (camp: Camp) => {
    setFormData({
      id: camp.id,
      name: camp.name,
      description: camp.description,
      capacity: camp.capacity,
      latitude: camp.location.latitude,
      longitude: camp.location.longitude,
      zone: camp.location.zone,
      defenseLevel: camp.defenseLevel,
      watchers: camp.watchers,
    })
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    if (window.confirm('¿Eliminar este campamento?')) {
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

  const getStatusColor = (status: Camp['status']) => {
    switch (status) {
      case 'ACTIVE':
        return '#7ddb50'
      case 'ABANDONED':
        return '#8080a0'
      case 'COMPROMISED':
        return '#e08080'
      case 'UNDER_CONSTRUCTION':
        return '#e0a050'
      default:
        return '#7ddb50'
    }
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
          Campamentos
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

      {stats && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '12px',
            marginBottom: '24px',
          }}
        >
          <div
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
              }}
            >
              TOTAL
            </div>
            <div
              style={{
                fontFamily: "'Courier New', monospace",
                fontSize: '20px',
                color: '#7ddb50',
                fontWeight: 'bold',
              }}
            >
              {(stats as any).totalCamps || 0}
            </div>
          </div>
          <div
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
              }}
            >
              ACTIVOS
            </div>
            <div
              style={{
                fontFamily: "'Courier New', monospace",
                fontSize: '20px',
                color: '#7ddb50',
                fontWeight: 'bold',
              }}
            >
              {(stats as any).activeCamps || 0}
            </div>
          </div>
          <div
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
              }}
            >
              POBLACIÓN
            </div>
            <div
              style={{
                fontFamily: "'Courier New', monospace",
                fontSize: '20px',
                color: '#b8f080',
                fontWeight: 'bold',
              }}
            >
              {(stats as any).totalPopulation || 0}
            </div>
          </div>
        </motion.div>
      )}

      <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {(['ALL', 'ACTIVE', 'ABANDONED', 'COMPROMISED', 'UNDER_CONSTRUCTION'] as const).map(
          (status) => (
            <motion.button
              key={status}
              onClick={() => setFilterStatus(status)}
              whileHover={{ scale: 1.02 }}
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
              {status === 'ALL' ? 'Todos' : status.replace(/_/g, ' ')}
            </motion.button>
          ),
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
            <h3 style={{ fontFamily: "'Courier New', monospace", color: '#7ddb50', marginTop: 0 }}>
              {formData.id ? 'Editar Campamento' : 'Nuevo Campamento'}
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
                type="text"
                placeholder="Nombre"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                style={{
                  background: 'rgba(10,18,8,0.8)',
                  border: '1px solid rgba(74,138,48,0.3)',
                  color: '#7ddb50',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  fontFamily: "'Courier New', monospace",
                }}
              />
              <input
                type="number"
                placeholder="Capacidad"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                min={1}
                style={{
                  background: 'rgba(10,18,8,0.8)',
                  border: '1px solid rgba(74,138,48,0.3)',
                  color: '#7ddb50',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  fontFamily: "'Courier New', monospace",
                }}
              />
            </div>

            <textarea
              placeholder="Descripción"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              style={{
                width: '100%',
                background: 'rgba(10,18,8,0.8)',
                border: '1px solid rgba(74,138,48,0.3)',
                color: '#7ddb50',
                padding: '8px 12px',
                borderRadius: '4px',
                fontFamily: "'Courier New', monospace",
                marginBottom: '12px',
                minHeight: '60px',
              }}
            />

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px',
                marginBottom: '12px',
              }}
            >
              <input
                type="number"
                placeholder="Latitud"
                value={formData.latitude}
                onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) })}
                step={0.0001}
                style={{
                  background: 'rgba(10,18,8,0.8)',
                  border: '1px solid rgba(74,138,48,0.3)',
                  color: '#7ddb50',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  fontFamily: "'Courier New', monospace",
                }}
              />
              <input
                type="number"
                placeholder="Longitud"
                value={formData.longitude}
                onChange={(e) =>
                  setFormData({ ...formData, longitude: parseFloat(e.target.value) })
                }
                step={0.0001}
                style={{
                  background: 'rgba(10,18,8,0.8)',
                  border: '1px solid rgba(74,138,48,0.3)',
                  color: '#7ddb50',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  fontFamily: "'Courier New', monospace",
                }}
              />
              <input
                type="text"
                placeholder="Zona"
                value={formData.zone || ''}
                onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                style={{
                  background: 'rgba(10,18,8,0.8)',
                  border: '1px solid rgba(74,138,48,0.3)',
                  color: '#7ddb50',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  fontFamily: "'Courier New', monospace",
                }}
              />
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                marginBottom: '16px',
              }}
            >
              <div>
                <label
                  style={{
                    display: 'block',
                    fontFamily: "'Courier New', monospace",
                    fontSize: '10px',
                    color: '#3a6020',
                    marginBottom: '4px',
                  }}
                >
                  Defensa: {formData.defenseLevel}%
                </label>
                <input
                  type="range"
                  value={formData.defenseLevel}
                  onChange={(e) =>
                    setFormData({ ...formData, defenseLevel: parseInt(e.target.value) })
                  }
                  min={0}
                  max={100}
                  style={{ width: '100%' }}
                />
              </div>
              <input
                type="number"
                placeholder="Centinelas"
                value={formData.watchers}
                onChange={(e) => setFormData({ ...formData, watchers: parseInt(e.target.value) })}
                min={0}
                style={{
                  background: 'rgba(10,18,8,0.8)',
                  border: '1px solid rgba(74,138,48,0.3)',
                  color: '#7ddb50',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  fontFamily: "'Courier New', monospace",
                }}
              />
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
        <LoadingSkeleton rows={5} cols={5} />
      ) : error ? (
        <ErrorState title="Error" message={error.message} onRetry={() => refetch()} />
      ) : filteredCamps.length === 0 ? (
        <EmptyState
          title="Sin campamentos"
          description="No hay campamentos creados"
          action={{ label: 'Crear primero', onClick: () => setShowForm(true) }}
        />
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '16px',
          }}
        >
          {filteredCamps.map((camp: Camp) => (
            <motion.div
              key={camp.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.02 }}
              style={{
                background: 'rgba(10,18,8,0.7)',
                border: `1px solid ${getStatusColor(camp.status)}44`,
                borderRadius: '8px',
                padding: '16px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '12px',
                }}
              >
                <h3
                  style={{
                    fontFamily: "'Georgia', serif",
                    fontSize: '14px',
                    color: '#b8f080',
                    margin: 0,
                  }}
                >
                  {camp.name}
                </h3>
                <div
                  style={{
                    background: getStatusColor(camp.status),
                    color: '#060a04',
                    fontFamily: "'Courier New', monospace",
                    fontSize: '8px',
                    fontWeight: 'bold',
                    letterSpacing: '1px',
                    padding: '4px 8px',
                    borderRadius: '3px',
                  }}
                >
                  {camp.status.replace(/_/g, ' ')}
                </div>
              </div>

              <div
                style={{
                  fontFamily: "'Courier New', monospace",
                  fontSize: '11px',
                  color: '#3a6020',
                  marginBottom: '12px',
                  height: '40px',
                  overflow: 'hidden',
                }}
              >
                {camp.description}
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px',
                  marginBottom: '12px',
                }}
              >
                <div
                  style={{ background: 'rgba(74,138,48,0.1)', padding: '8px', borderRadius: '4px' }}
                >
                  <div
                    style={{
                      fontFamily: "'Courier New', monospace",
                      fontSize: '9px',
                      color: '#3a6020',
                    }}
                  >
                    CAPACIDAD
                  </div>
                  <div
                    style={{
                      fontFamily: "'Courier New', monospace",
                      fontSize: '16px',
                      color: '#7ddb50',
                      fontWeight: 'bold',
                    }}
                  >
                    {camp.currentPopulation}/{camp.capacity}
                  </div>
                </div>
                <div
                  style={{ background: 'rgba(74,138,48,0.1)', padding: '8px', borderRadius: '4px' }}
                >
                  <div
                    style={{
                      fontFamily: "'Courier New', monospace",
                      fontSize: '9px',
                      color: '#3a6020',
                    }}
                  >
                    DEFENSA
                  </div>
                  <div
                    style={{
                      fontFamily: "'Courier New', monospace",
                      fontSize: '16px',
                      color: '#b8f080',
                      fontWeight: 'bold',
                    }}
                  >
                    {camp.defenseLevel}%
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                <motion.button
                  onClick={() => handleEdit(camp)}
                  whileHover={{ scale: 1.1 }}
                  style={{
                    background: 'rgba(74,138,48,0.14)',
                    border: '1px solid rgba(74,138,48,0.3)',
                    color: '#7ddb50',
                    cursor: 'pointer',
                    fontSize: '12px',
                    padding: '6px 10px',
                    borderRadius: '4px',
                    flex: 1,
                    fontFamily: "'Courier New', monospace",
                  }}
                >
                  ✏ Editar
                </motion.button>
                <motion.button
                  onClick={() => handleDelete(camp.id)}
                  whileHover={{ scale: 1.1 }}
                  style={{
                    background: 'rgba(224,80,80,0.14)',
                    border: '1px solid rgba(224,80,80,0.3)',
                    color: '#e08080',
                    cursor: 'pointer',
                    fontSize: '12px',
                    padding: '6px 10px',
                    borderRadius: '4px',
                    fontFamily: "'Courier New', monospace",
                  }}
                >
                  ✕ Eliminar
                </motion.button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  )
}
