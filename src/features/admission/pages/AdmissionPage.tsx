import type { ChangeEvent, FormEvent } from 'react'
import { useMemo, useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import '../admission.css'
import { useCreateAdmissionRequest } from '../api/queries'
import { useCamps } from '../../camps/api/queries'
import type { CalendarDay, FormState } from '../types'

const initialForm: FormState = {
  nombre: '',
  primerApellido: '',
  segundoApellido: '',
  email: '',
  usuario: '',
  genero: '',
  nacimiento: '',
  salud: '',
  experiencia: '',
  condicion: '',
  habilidades: '',
  campId: undefined,
}

const textFields = [
  { name: 'nombre', label: 'Nombre', maxLength: 100, required: true },
  { name: 'primerApellido', label: 'Primer apellido', maxLength: 100, required: true },
  { name: 'segundoApellido', label: 'Segundo apellido', maxLength: 100, required: false },
] as const

const healthLevelOptions = [
  { value: '', label: 'Seleccionar nivel de salud' },
  { value: 'healthy no symptoms', label: 'Sin enfermedades conocidas' },
  { value: 'stable under treatment', label: 'Salud estable' },
  { value: 'moderate stable', label: 'Enfermedades crónicas controladas' },
  { value: 'severe high fever respiratory', label: 'Enfermedades graves' },
  { value: 'critical sepsis', label: 'Enfermedad crítica' },
] as const

const physicalConditionOptions = [
  { value: '', label: 'Seleccionar condición física' },
  { value: 'athletic strong endurance excellent', label: 'Excelente estado físico' },
  { value: 'strong endurance', label: 'Muy buen estado físico' },
  { value: 'average acceptable', label: 'Buen estado físico' },
  { value: 'moderate acceptable', label: 'Condición física moderada' },
  { value: 'limited mobility recovering', label: 'Movilidad limitada' },
  { value: 'immobile cannot walk', label: 'Inmovilizado' },
] as const

const skillsOptions = [
  { value: '', label: 'Seleccionar habilidades', disabled: true },
  { value: 'medic', label: 'Medico' },
  { value: 'nurse', label: 'Enfermero' },
  { value: 'doctor', label: 'Doctor' },
  { value: 'mechanic', label: 'Mecanico' },
  { value: 'engineer', label: 'Ingeniero' },
  { value: 'hunter', label: 'Cazador' },
  { value: 'security', label: 'Seguridad' },
  { value: 'farmer', label: 'Agricultor' },
  { value: 'logistics', label: 'Logistica' },
  { value: 'cook', label: 'Cocinero' },
  { value: 'radio', label: 'Operador de radio' },
  { value: 'none', label: 'Ninguna' },
] as const

const genderOptions = ['MALE', 'FEMALE', 'OTHER']
const monthNames = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
]
const weekDays = ['LU', 'MA', 'MI', 'JU', 'VI', 'SA', 'DO']

const toDateValue = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const formatDate = (value: string) => {
  if (!value) return 'AAAA-MM-DD'
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}

const buildCalendar = (viewDate: Date, selectedValue: string): CalendarDay[] => {
  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const todayValue = toDateValue(new Date())
  const firstDay = new Date(year, month, 1)
  const mondayOffset = (firstDay.getDay() + 6) % 7
  const start = new Date(year, month, 1 - mondayOffset)

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    const value = toDateValue(date)

    return {
      date,
      value,
      inMonth: date.getMonth() === month,
      isSelected: value === selectedValue,
      isToday: value === todayValue,
    }
  })
}

export default function AdmissionPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const shouldReturnToGlobalMap = Boolean(
    (location.state as { returnToGlobalMap?: boolean } | null)?.returnToGlobalMap,
  )
  const prefilledCampId = (location.state as { campId?: number } | null)?.campId
  const prefilledCampName = (location.state as { campName?: string } | null)?.campName
  const { data: camps = [] } = useCamps({ enabled: !prefilledCampId })
  const createAdmission = useCreateAdmissionRequest()

  const [form, setForm] = useState<FormState>(initialForm)
  const [photoPreview, setPhotoPreview] = useState<string>('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [warning, setWarning] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [genderOpen, setGenderOpen] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [calendarDate, setCalendarDate] = useState(() => new Date(2026, 3, 1))
  const [showAiResult, setShowAiResult] = useState(false)
  const [aiResult, setAiResult] = useState<{
    status: string
    message: string
    type: 'success' | 'warning'
  } | null>(null)

  const calendarDays = useMemo(
    () => buildCalendar(calendarDate, form.nacimiento),
    [calendarDate, form.nacimiento],
  )
  const isSubmitting = createAdmission.isPending

  const updateFormValue = (name: keyof FormState, value: string | number | undefined) => {
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleInput = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    updateFormValue(name as keyof FormState, value)
  }

  const handleSkillToggle = (event: ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = event.target
    const currentSkills = form.habilidades
      ? form.habilidades === 'none'
        ? []
        : form.habilidades
            .split(',')
            .map((skill) => skill.trim())
            .filter(Boolean)
      : []

    if (value === 'none') {
      updateFormValue('habilidades', checked ? 'none' : '')
      return
    }

    let nextSkills = currentSkills.filter((skill) => skill !== 'none')
    if (checked) {
      if (!nextSkills.includes(value)) nextSkills = [...nextSkills, value]
    } else {
      nextSkills = nextSkills.filter((skill) => skill !== value)
    }

    updateFormValue('habilidades', nextSkills.join(', '))
  }

  const handleCampSelect = (event: ChangeEvent<HTMLSelectElement>) => {
    const campId = parseInt(event.target.value, 10) || undefined
    updateFormValue('campId', campId)
  }
  useEffect(() => {
    if (prefilledCampId) {
      updateFormValue('campId', prefilledCampId)
    }
  }, [prefilledCampId])

  const handlePhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    setPhotoFile(file)

    if (!file) {
      setPhotoPreview('')
      return
    }

    setPhotoPreview(URL.createObjectURL(file))
  }

  const changeCalendarMonth = (amount: number) => {
    setCalendarDate((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1))
  }

  const selectCalendarDay = (day: CalendarDay) => {
    updateFormValue('nacimiento', day.value)
    setCalendarDate(new Date(day.date.getFullYear(), day.date.getMonth(), 1))
    setCalendarOpen(false)
  }

  const clearBirthDate = () => {
    updateFormValue('nacimiento', '')
    setCalendarOpen(false)
  }

  const selectToday = () => {
    const today = new Date()
    selectCalendarDay({
      date: today,
      inMonth: true,
      isSelected: false,
      isToday: true,
      value: toDateValue(today),
    })
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!form.genero || !form.nacimiento) {
      setWarning('Complete género y fecha de nacimiento para continuar.')
      return
    }

    if (!form.campId) {
      setWarning('Debe seleccionar un campamento para continuar.')
      return
    }

    setWarning('')
    setSuccessMessage('')
    setAiResult(null)
    
    const formattedExperience = form.experiencia && !Number.isNaN(Number(form.experiencia)) 
      ? `${form.experiencia} años` 
      : form.experiencia || null
    
    const payload = {
      name: form.nombre,
      lastName1: form.primerApellido,
      lastName2: form.segundoApellido || null,
      email: form.email,
      desiredUsername: form.usuario,
      gender: form.genero,
      birthDate: form.nacimiento,
      declaredHealthLevel: form.salud || null,
      previousExperience: formattedExperience,
      physicalCondition: form.condicion || null,
      declaredSkills: form.habilidades && form.habilidades !== 'none' ? form.habilidades : null,
      campId: Number(form.campId),
    }

    const handleSuccess = (data: any) => {
      setShowAiResult(true)

      if (data.status === 'PENDING_ADMIN') {
        setAiResult({
          status: 'PENDING_ADMIN',
          message: `Tu solicitud fue evaluada favorablemente por nuestro sistema de IA y está en espera de revisión administrativa. Tu rol sugerido es: ${data.aiReport?.suggestedRole || 'pendiente de evaluación'}.`,
          type: 'success',
        })
        setSuccessMessage('Expediente enviado exitosamente. Espera revisión administrativa.')
      } else if (data.status === 'REJECTED') {
        setAiResult({
          status: 'REJECTED',
          message: `Tu solicitud ha sido rechazada durante la evaluación automática. Motivo: ${data.rejectionReason || data.aiReport?.admissionReason || 'No cumple con los requisitos'}`,
          type: 'warning',
        })
      } else if (data.status === 'APPROVED') {
        setAiResult({
          status: 'APPROVED',
          message: `Felicidades! Tu solicitud ha sido aprobada. Bienvenido al campamento.`,
          type: 'success',
        })
        setSuccessMessage('Bienvenido al campamento!')
      }

      setTimeout(() => {
        setForm(initialForm)
        setPhotoFile(null)
        setPhotoPreview('')
      }, 3000)
    }

    const handleError = (error: any) => {
      setWarning(
        error instanceof Error ? error.message : String(error) || 'Error al procesar la solicitud',
      )
      setShowAiResult(false)
    }
    if (photoFile) {
      const formData = new FormData()
      formData.append('name', payload.name)
      formData.append('lastName1', payload.lastName1)
      if (payload.lastName2) formData.append('lastName2', payload.lastName2)
      formData.append('email', payload.email)
      formData.append('desiredUsername', payload.desiredUsername)
      formData.append('gender', payload.gender)
      formData.append('birthDate', payload.birthDate)
      if (payload.declaredHealthLevel)
        formData.append('declaredHealthLevel', payload.declaredHealthLevel)
      if (payload.previousExperience)
        formData.append('previousExperience', payload.previousExperience)
      if (payload.physicalCondition) formData.append('physicalCondition', payload.physicalCondition)
      if (payload.declaredSkills) formData.append('declaredSkills', payload.declaredSkills)
      formData.append('campId', String(payload.campId))
      formData.append('photo', photoFile)

      createAdmission.mutate(formData, {
        onSuccess: handleSuccess,
        onError: handleError,
      })
      return
    }
    createAdmission.mutate(payload, {
      onSuccess: handleSuccess,
      onError: handleError,
    })
  }

  const selectedSkills = form.habilidades
    ? form.habilidades === 'none'
      ? ['none']
      : form.habilidades
          .split(',')
          .map((skill) => skill.trim())
          .filter(Boolean)
    : []

  return (
    <main className="admission-page">
      <div className="admission-backdrop" />
      {shouldReturnToGlobalMap && (
        <button
          aria-label="Volver al lobby"
          className="admission-map-close"
          onClick={() => navigate('/main-homepage', { state: { initialAppState: 'explore' } })}
          type="button"
        >
          <X size={24} className="admission-map-close-icon" />
        </button>
      )}
      <div className="ash ash-one" />
      <div className="ash ash-two" />
      <div className="ember ember-one" />
      <div className="ember ember-two" />

      <section className="dossier">
        <span aria-hidden="true" className="paper-clip" />
        <span aria-hidden="true" className="fold-line" />
        <span aria-hidden="true" className="burn-mark burn-one" />
        <span aria-hidden="true" className="burn-mark burn-two" />
        <span aria-hidden="true" className="bullet-hole" />
        <span aria-hidden="true" className="blood-drip blood-one" />
        <span aria-hidden="true" className="blood-drip blood-two" />

        <div className="stamp-wrap">
          <div className="stamp-card stamp">Clasificado</div>
        </div>

        <header className="admission-header">
          <div className="header-card">
            <p className="header-eyebrow">Survival System - Project X</p>
            <h1 className="stencil">Camp Zero</h1>
            <p className="header-subtitle">Formulario de ingreso a zona segura</p>
          </div>
        </header>

        <form className="admission-form-shell" onSubmit={handleSubmit}>
          <div className="admission-main">
            <fieldset className="file-section animate-rise">
              <legend className="section-title">Selección de campamento</legend>
              <div className="admission-personal-grid">
                <label className="field-label">
                  Campamento
                  {prefilledCampId ? (
                    <select
                      className="classified-input"
                      name="campId"
                      disabled
                      value={form.campId ?? ''}
                    >
                      <option value={prefilledCampId}>
                        {prefilledCampName ?? `Campamento ${prefilledCampId}`}
                      </option>
                    </select>
                  ) : (
                    <select
                      className="classified-input"
                      name="campId"
                      onChange={handleCampSelect}
                      required
                      value={form.campId ?? ''}
                    >
                      <option value="">Seleccionar campamento</option>
                      {camps.map((camp) => (
                        <option key={camp.id} value={camp.id}>
                          {camp.name}
                        </option>
                      ))}
                    </select>
                  )}
                </label>
              </div>
            </fieldset>

            <fieldset className="file-section animate-rise">
              <legend className="section-title">Datos personales</legend>
              <div className="admission-personal-grid">
                {textFields.map((field) => (
                  <label className="field-label" key={field.name}>
                    {field.label}
                    <input
                      className="classified-input"
                      maxLength={field.maxLength}
                      name={field.name}
                      onChange={handleInput}
                      required={field.required}
                      value={form[field.name]}
                    />
                  </label>
                ))}

                <label className="field-label">
                  Email
                  <input
                    className="classified-input"
                    name="email"
                    onChange={handleInput}
                    placeholder="correo@ejemplo.com"
                    required
                    type="email"
                    value={form.email}
                  />
                </label>

                <label className="field-label">
                  Usuario
                  <input
                    className="classified-input"
                    maxLength={30}
                    minLength={3}
                    name="usuario"
                    onChange={handleInput}
                    placeholder="sobreviviente-01"
                    required
                    value={form.usuario}
                  />
                </label>

                <div className="field-label">
                  Género
                  <button
                    aria-expanded={genderOpen}
                    className="custom-trigger"
                    onClick={() => setGenderOpen((current) => !current)}
                    type="button"
                  >
                    <span>{form.genero || 'Seleccionar'}</span>
                    <span className="trigger-mark">▾</span>
                  </button>
                </div>

                <div className="field-label admission-birth-field">
                  Fecha de nacimiento
                  <button
                    aria-expanded={calendarOpen}
                    className="custom-trigger"
                    onClick={() => setCalendarOpen((current) => !current)}
                    type="button"
                  >
                    <span>{formatDate(form.nacimiento)}</span>
                    <span className="calendar-icon" />
                  </button>
                </div>
              </div>
            </fieldset>

            <fieldset className="file-section animate-rise-delay">
              <legend className="section-title">Información de salud</legend>
              <div className="admission-health-grid">
                <label className="field-label">
                  Nivel de salud declarado
                  <select
                    className="classified-input"
                    name="salud"
                    onChange={handleInput}
                    required
                    value={form.salud}
                  >
                    {healthLevelOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field-label">
                  Experiencia previa (años)
                  <input
                    className="classified-input"
                    type="number"
                    name="experiencia"
                    onChange={handleInput}
                    placeholder="0"
                    required
                    value={form.experiencia}
                    min="0"
                    max="60"
                  />
                </label>

                <label className="field-label">
                  Condición física
                  <select
                    className="classified-input"
                    name="condicion"
                    onChange={handleInput}
                    required
                    value={form.condicion}
                  >
                    {physicalConditionOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="field-label">
                  <span>Habilidades</span>
                  <div className="classified-input">
                    {skillsOptions
                      .filter((option) => option.value)
                      .map((option) => (
                        <label key={option.value} className="field-label">
                          <input
                            checked={selectedSkills.includes(option.value)}
                            name="habilidades"
                            onChange={handleSkillToggle}
                            type="checkbox"
                            value={option.value}
                          />
                          {option.label}
                        </label>
                      ))}
                  </div>
                  <input
                    aria-hidden="true"
                    className="sr-only"
                    name="habilidadesRequired"
                    readOnly
                    required
                    tabIndex={-1}
                    type="text"
                    value={form.habilidades}
                  />
                </div>
              </div>
            </fieldset>
          </div>

          <aside className="admission-side animate-slide">
            <label className="photo-drop">
              {photoPreview ? (
                <img alt="Vista previa del retrato" className="photo-preview" src={photoPreview} />
              ) : (
                <span>
                  Subir retrato
                  <small>PNG o JPG</small>
                </span>
              )}
              <input
                accept="image/png,image/jpeg"
                className="sr-only"
                name="foto"
                onChange={handlePhoto}
                type="file"
              />
            </label>

            <button className="submit-stamp" disabled={isSubmitting} type="submit">
              {isSubmitting ? 'Procesando...' : 'Procesar Ingreso'}
            </button>

            <p className="notice-slip">
              NOTICE: BY SUBMITTING THIS DOCUMENT, YOU ACKNOWLEDGE THAT ALL RESOURCES PROVIDED ARE
              PROPERTY OF THE CAMP ADMINISTRATION.
            </p>

            {warning && <p className="form-warning">{warning}</p>}
            {successMessage && <p className="animate-confirm form-confirm">{successMessage}</p>}
            {showAiResult && aiResult && (
              <div
                className={`ai-result-box ${aiResult.type === 'success' ? 'success' : 'warning'}`}
              >
                <p className="ai-result-status">{aiResult.status}</p>
                <p className="ai-result-message">{aiResult.message}</p>
              </div>
            )}
          </aside>
        </form>
      </section>

      {genderOpen && (
        <div className="modal-backdrop" onClick={() => setGenderOpen(false)}>
          <div className="dropdown-panel animate-pop" onClick={(event) => event.stopPropagation()}>
            <p className="modal-title">Seleccionar género</p>
            {genderOptions.map((option) => (
              <button
                className={`dropdown-option ${form.genero === option ? 'is-active' : ''}`}
                key={option}
                onClick={() => {
                  updateFormValue('genero', option)
                  setGenderOpen(false)
                }}
                type="button"
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      )}

      {calendarOpen && (
        <div className="modal-backdrop" onClick={() => setCalendarOpen(false)}>
          <div
            className="calendar-popover animate-pop"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="calendar-header">
              <strong>
                {monthNames[calendarDate.getMonth()]} de {calendarDate.getFullYear()}
              </strong>
              <div className="calendar-header-actions">
                <button
                  aria-label="Mes anterior"
                  className="cal-nav"
                  onClick={() => changeCalendarMonth(-1)}
                  type="button"
                >
                  ◄
                </button>
                <button
                  aria-label="Mes siguiente"
                  className="cal-nav"
                  onClick={() => changeCalendarMonth(1)}
                  type="button"
                >
                  ►
                </button>
              </div>
            </div>
            <div className="calendar-grid">
              {weekDays.map((day) => (
                <span className="calendar-weekday" key={day}>
                  {day}
                </span>
              ))}
              {calendarDays.map((day) => (
                <button
                  className={`calendar-day ${day.inMonth ? '' : 'is-muted'} ${day.isSelected ? 'is-selected' : ''} ${
                    day.isToday ? 'is-today' : ''
                  }`}
                  key={day.value}
                  onClick={() => selectCalendarDay(day)}
                  type="button"
                >
                  {day.date.getDate()}
                </button>
              ))}
            </div>
            <div className="calendar-footer">
              <button onClick={clearBirthDate} type="button">
                Borrar
              </button>
              <button onClick={selectToday} type="button">
                Hoy
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
