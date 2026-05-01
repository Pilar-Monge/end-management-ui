import type { ChangeEvent, FormEvent } from 'react'
import { useMemo, useState } from 'react'
import '../admission.css'
import { submitAdmission } from '../services/admissionApi'
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
}

const textFields = [
  { name: 'nombre', label: 'Nombre', maxLength: 100, required: true },
  { name: 'primerApellido', label: 'Primer apellido', maxLength: 100, required: true },
  { name: 'segundoApellido', label: 'Segundo apellido', maxLength: 100, required: false },
] as const

const healthFields = [
  { name: 'salud', label: 'Nivel de salud declarado', placeholder: 'Sin enfermedades conocidas' },
  { name: 'experiencia', label: 'Experiencia previa', placeholder: '10 años en expediciones' },
  { name: 'condicion', label: 'Condición física', placeholder: 'Buen estado físico' },
  {
    name: 'habilidades',
    label: 'Habilidades',
    placeholder: 'Navegación GPS, primeros auxilios, cocina',
  },
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
  const [form, setForm] = useState<FormState>(initialForm)
  const [photoPreview, setPhotoPreview] = useState<string>('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [sent, setSent] = useState(false)
  const [warning, setWarning] = useState('')
  const [genderOpen, setGenderOpen] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [calendarDate, setCalendarDate] = useState(() => new Date(2026, 3, 1))

  const calendarDays = useMemo(() => buildCalendar(calendarDate, form.nacimiento), [calendarDate, form.nacimiento])

  const updateFormValue = (name: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleInput = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target
    updateFormValue(name as keyof FormState, value)
  }

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

    setWarning('')
    setSent(true)
    submitAdmission(form, photoFile)
      .then(() => {
        setWarning('')
        setSent(true)
        window.setTimeout(() => setSent(false), 3200)
      })
      .catch((err) => {
        setWarning(err instanceof Error ? err.message : String(err))
        setSent(false)
      })
  }

  return (
    <main className="admission-page">
      <div className="admission-backdrop" />
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
                    pattern="[A-Za-z0-9-]+"
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
                {healthFields.map((field) => (
                  <label className="field-label" key={field.name}>
                    {field.label}
                    <textarea
                      className="classified-input classified-textarea"
                      name={field.name}
                      onChange={handleInput}
                      placeholder={field.placeholder}
                      required
                      value={form[field.name]}
                    />
                  </label>
                ))}
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
              <input accept="image/png,image/jpeg" className="sr-only" name="foto" onChange={handlePhoto} type="file" />
            </label>

            <button className="submit-stamp" type="submit">
              Procesar Ingreso
            </button>

            <p className="notice-slip">
              NOTICE: BY SUBMITTING THIS DOCUMENT, YOU ACKNOWLEDGE THAT ALL RESOURCES PROVIDED ARE PROPERTY OF THE CAMP
              ADMINISTRATION.
            </p>

            {warning && <p className="form-warning">{warning}</p>}
            {sent && <p className="animate-confirm form-confirm">Expediente enviado.</p>}
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
          <div className="calendar-popover animate-pop" onClick={(event) => event.stopPropagation()}>
            <div className="calendar-header">
              <strong>
                {monthNames[calendarDate.getMonth()]} de {calendarDate.getFullYear()}
              </strong>
              <div className="calendar-header-actions">
                <button aria-label="Mes anterior" className="cal-nav" onClick={() => changeCalendarMonth(-1)} type="button">
                  ◄
                </button>
                <button aria-label="Mes siguiente" className="cal-nav" onClick={() => changeCalendarMonth(1)} type="button">
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
