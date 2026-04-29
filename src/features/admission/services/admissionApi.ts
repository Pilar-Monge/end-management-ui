import type { FormState } from '../types'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'

export async function submitAdmission(form: FormState, photo: File | null): Promise<void> {
  const formData = new FormData()

  formData.append('nombre', form.nombre)
  formData.append('primer_apellido', form.primerApellido)
  formData.append('segundo_apellido', form.segundoApellido)
  formData.append('email', form.email)
  formData.append('usuario', form.usuario)
  formData.append('genero', form.genero)
  formData.append('nacimiento', form.nacimiento)
  formData.append('salud', form.salud)
  formData.append('experiencia', form.experiencia)
  formData.append('condicion', form.condicion)
  formData.append('habilidades', form.habilidades)

  if (photo) {
    formData.append('photo', photo)
  }

  const response = await fetch(`${BASE_URL}/admission_requests`, {
    method: 'POST',
    body: formData,
  })

  const errorText = await response.text()
  if (!response.ok) throw new Error(errorText || 'Error al enviar el formulario')
}
