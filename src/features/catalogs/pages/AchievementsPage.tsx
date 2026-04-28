import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAchievements } from '../api/queries'
import { useCreateAchievement, useUpdateAchievement, useDeleteAchievement } from '../api/mutations'
import type { Achievement, CreateAchievementRequest, UpdateAchievementRequest } from '../types'
import { LoadingSkeleton, EmptyState, ErrorState } from '../components/StateComponents'

interface FormState {
  id?: number
  name: string
  description: string
  icon: string
  points: number
  category: Achievement['category']
}

const INITIAL_FORM: FormState = {
  name: '',
  description: '',
  icon: '⭐',
  points: 10,
  category: 'SURVIVAL',
}

export function AchievementsPage() {
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState<FormState>(INITIAL_FORM)
  const [formError, setFormError] = useState<string | null>(null)

  const { data: achievements = [], isLoading, error, refetch } = useAchievements()
  const createMutation = useCreateAchievement()
  const updateMutation = useUpdateAchievement()
  const deleteMutation = useDeleteAchievement()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!formData.name.trim()) {
      setFormError('El nombre es requerido')
      return
    }

    try {
      if (formData.id) {
        await updateMutation.mutateAsync({
          id: formData.id,
          data: {
            name: formData.name,
            description: formData.description,
            icon: formData.icon,
            points: formData.points,
            category: formData.category,
          } as UpdateAchievementRequest,
        })
      } else {
        await createMutation.mutateAsync({
          name: formData.name,
          description: formData.description,
          icon: formData.icon,
          points: formData.points,
          category: formData.category,
        } as CreateAchievementRequest)
      }
      setFormData(INITIAL_FORM)
      setShowForm(false)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al procesar el logro')
    }
  }

  const handleEdit = (item: Achievement) => {
    setFormData({
      id: item.id,
      name: item.name,
      description: item.description,
      icon: item.icon,
      points: item.points,
      category: item.category,
    })
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    if (window.confirm('¿Eliminar este logro?')) {
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
          Logros
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
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '80px 1fr',
                gap: '12px',
                marginBottom: '12px',
              }}
            >
              <input
                type="text"
                placeholder="Icono"
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                maxLength={2}
                style={{
                  background: 'rgba(10,18,8,0.8)',
                  border: '1px solid rgba(74,138,48,0.3)',
                  color: '#7ddb50',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  fontFamily: "'Arial', sans-serif",
                  fontSize: '20px',
                  textAlign: 'center',
                }}
              />
              <input
                type="text"
                placeholder="Nombre del logro"
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
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                marginBottom: '12px',
              }}
            >
              <input
                type="number"
                placeholder="Puntos"
                value={formData.points}
                onChange={(e) =>
                  setFormData({ ...formData, points: parseInt(e.target.value) || 0 })
                }
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
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value as Achievement['category'] })
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
                <option value="COMBAT">Combate</option>
                <option value="EXPLORATION">Exploración</option>
                <option value="SURVIVAL">Supervivencia</option>
                <option value="LEADERSHIP">Liderazgo</option>
                <option value="INNOVATION">Innovación</option>
                <option value="TEAM">Equipo</option>
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
      ) : achievements.length === 0 ? (
        <EmptyState
          title="Sin logros"
          description="No hay logros definidos"
          action={{ label: 'Crear primero', onClick: () => setShowForm(true) }}
        />
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: '16px',
          }}
        >
          {achievements.map((item: Achievement) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.05 }}
              style={{
                background: 'rgba(10,18,8,0.7)',
                border: '1px solid rgba(74,138,48,0.3)',
                borderRadius: '8px',
                padding: '16px',
                textAlign: 'center',
                cursor: 'pointer',
              }}
            >
              <div style={{ fontSize: '40px', marginBottom: '8px' }}>{item.icon}</div>
              <h3
                style={{
                  fontFamily: "'Courier New', monospace",
                  fontSize: '12px',
                  letterSpacing: '1px',
                  color: '#7ddb50',
                  margin: '0 0 4px',
                  textTransform: 'uppercase',
                }}
              >
                {item.name}
              </h3>
              <p
                style={{
                  fontFamily: "'Courier New', monospace",
                  fontSize: '10px',
                  color: '#3a6020',
                  margin: '0 0 8px',
                }}
              >
                {item.category}
              </p>
              <div
                style={{
                  fontFamily: "'Courier New', monospace",
                  fontSize: '11px',
                  color: '#b8f080',
                  marginBottom: '12px',
                  fontWeight: 'bold',
                }}
              >
                +{item.points} pts
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
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
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  )
}
