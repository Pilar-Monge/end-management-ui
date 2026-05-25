import { useState } from 'react'
import type { CreatePersonRequest, Person, PersonStatus, UpdatePersonRequest } from '../types'
import { useCreatePerson, useDeletePerson, useUpdatePerson } from '../api/mutations'

export interface FormState {
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

export function usePersonForm(onSuccess?: () => void) {
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState<FormState>(INITIAL_FORM)
  const [formError, setFormError] = useState<string | null>(null)

  const createMutation = useCreatePerson()
  const updateMutation = useUpdatePerson()
  const deleteMutation = useDeletePerson()

  function resetForm() {
    setFormData(INITIAL_FORM)
    setFormError(null)
    setShowForm(false)
  }

  function setFormField(field: keyof FormState, value: any) {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (formError) setFormError(null)
  }

  function openForm(person?: Person) {
    if (person) {
      setFormData({
        id: person.id,
        firstName: person.firstName,
        lastName: person.lastName,
        alias: person.alias || '',
        age: person.age,
        campId: person.campId,
        occupationId: person.occupationId,
        notes: person.notes || '',
        status: person.status,
      })
    }
    setShowForm(true)
  }

  function validateForm(): boolean {
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setFormError('Nombre y apellido son obligatorios.')
      return false
    }

    if (!Number.isFinite(formData.age) || formData.age < 1) {
      setFormError('La edad debe ser mayor que cero.')
      return false
    }

    if (!Number.isFinite(formData.campId) || formData.campId < 1) {
      setFormError('Campamento invalido.')
      return false
    }

    if (!Number.isFinite(formData.occupationId) || formData.occupationId < 1) {
      setFormError('Ocupacion invalida.')
      return false
    }

    return true
  }

  async function submitForm() {
    if (!validateForm()) return false

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
        await updateMutation.mutateAsync({ id: formData.id, ...payload })
      } else {
        const payload: CreatePersonRequest = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          alias: formData.alias || undefined,
          age: formData.age,
          campId: formData.campId,
          occupationId: formData.occupationId,
          notes: formData.notes || undefined,
          status: formData.status,
        }
        await createMutation.mutateAsync(payload)
      }
      resetForm()
      onSuccess?.()
      return true
    } catch (error: any) {
      setFormError(error.message || 'Error al guardar persona')
      return false
    }
  }

  return {
    showForm,
    setShowForm,
    formData,
    setFormField,
    formError,
    setFormError,
    resetForm,
    openForm,
    submitForm,
    isSubmitting: createMutation.isPending || updateMutation.isPending,
    mutations: {
      create: createMutation,
      update: updateMutation,
      delete: deleteMutation,
    },
  }
}
