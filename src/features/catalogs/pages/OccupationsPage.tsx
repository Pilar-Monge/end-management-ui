
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useOccupations } from '../api/queries';
import { useCreateOccupation, useUpdateOccupation, useDeleteOccupation } from '../api/mutations';
import type { Occupation, CreateOccupationRequest, UpdateOccupationRequest } from '../types';
import { LoadingSkeleton, EmptyState, ErrorState } from '../components/StateComponents';

interface FormState {
  id?: number;
  name: string;
  description: string;
  skills: string;
  minimumExperience: number;
}

const INITIAL_FORM: FormState = {
  name: '',
  description: '',
  skills: '',
  minimumExperience: 0,
};

export function OccupationsPage() {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<FormState>(INITIAL_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: occupations = [], isLoading, error, refetch } = useOccupations();
  const createMutation = useCreateOccupation();
  const updateMutation = useUpdateOccupation();
  const deleteMutation = useDeleteOccupation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.name.trim()) {
      setFormError('El nombre es requerido');
      return;
    }

    try {
      const skillsArray = formData.skills
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      if (formData.id) {
        await updateMutation.mutateAsync({
          id: formData.id,
          data: {
            name: formData.name,
            description: formData.description,
            skills: skillsArray,
            minimumExperience: formData.minimumExperience,
          } as UpdateOccupationRequest,
        });
      } else {
        await createMutation.mutateAsync({
          name: formData.name,
          description: formData.description,
          skills: skillsArray,
          minimumExperience: formData.minimumExperience,
        } as CreateOccupationRequest);
      }
      setFormData(INITIAL_FORM);
      setShowForm(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al procesar la ocupación');
    }
  };

  const handleEdit = (item: Occupation) => {
    setFormData({
      id: item.id,
      name: item.name,
      description: item.description,
      skills: item.skills.join(', '),
      minimumExperience: item.minimumExperience,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('¿Eliminar esta ocupación?')) {
      try {
        await deleteMutation.mutateAsync(id);
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Error al eliminar');
      }
    }
  };

  const handleCancel = () => {
    setFormData(INITIAL_FORM);
    setShowForm(false);
    setFormError(null);
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
          Ocupaciones
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
            + Nueva
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
            <input
              type="text"
              placeholder="Nombre de ocupación"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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

            <input
              type="text"
              placeholder="Habilidades (separadas por comas)"
              value={formData.skills}
              onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
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

            <input
              type="number"
              placeholder="Experiencia mínima (horas)"
              value={formData.minimumExperience}
              onChange={(e) => setFormData({ ...formData, minimumExperience: parseInt(e.target.value) || 0 })}
              style={{
                width: '100%',
                background: 'rgba(10,18,8,0.8)',
                border: '1px solid rgba(74,138,48,0.3)',
                color: '#7ddb50',
                padding: '8px 12px',
                borderRadius: '4px',
                fontFamily: "'Courier New', monospace",
                marginBottom: '16px',
              }}
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
      ) : occupations.length === 0 ? (
        <EmptyState
          title="Sin ocupaciones"
          description="No hay ocupaciones definidas"
          action={{ label: 'Crear primera', onClick: () => setShowForm(true) }}
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
              <tr style={{ background: 'rgba(74,138,48,0.1)', borderBottom: '1px solid rgba(74,138,48,0.2)' }}>
                <th style={{ padding: '12px', textAlign: 'left', color: '#7ddb50', fontWeight: 'bold' }}>
                  Nombre
                </th>
                <th style={{ padding: '12px', textAlign: 'left', color: '#7ddb50', fontWeight: 'bold' }}>
                  Habilidades
                </th>
                <th style={{ padding: '12px', textAlign: 'left', color: '#7ddb50', fontWeight: 'bold' }}>
                  Exp. Mín.
                </th>
                <th style={{ padding: '12px', textAlign: 'center', color: '#7ddb50', fontWeight: 'bold' }}>
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {occupations.map((item: Occupation, idx: number) => (
                <tr
                  key={item.id}
                  style={{
                    borderBottom: '1px solid rgba(74,138,48,0.1)',
                    background: idx % 2 === 0 ? 'transparent' : 'rgba(74,138,48,0.05)',
                  }}
                >
                  <td style={{ padding: '12px', color: '#b8f080' }}>{item.name}</td>
                  <td style={{ padding: '12px', color: '#3a6020', fontSize: '11px' }}>
                    {item.skills.slice(0, 2).join(', ')}
                    {item.skills.length > 2 && ` +${item.skills.length - 2}`}
                  </td>
                  <td style={{ padding: '12px', color: '#3a6020' }}>{item.minimumExperience}h</td>
                  <td style={{ padding: '12px', textAlign: 'center', display: 'flex', gap: '8px', justifyContent: 'center' }}>
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
  );
}
