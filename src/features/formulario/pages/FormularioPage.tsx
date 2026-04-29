import { useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import type { FormState, CalendarDay } from '../types'
import {
  initialForm,
  textFields,
  healthFields,
  genderOptions,
  monthNames,
  weekDays,
} from '../constants'
import { toDateValue, formatDate, buildCalendar } from '../utils'
import '../formulario.css'

export default function FormularioPage() {
  const [form, setForm] = useState<FormState>(initialForm)
  const [photoPreview, setPhotoPreview] = useState<string>('')
  const [sent, setSent] = useState(false)
  const [warning, setWarning] = useState('')
  const [genderOpen, setGenderOpen] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [calendarDate, setCalendarDate] = useState(() => new Date(2026, 3, 1))

  const calendarDays = useMemo(
    () => buildCalendar(calendarDate, form.nacimiento),
    [calendarDate, form.nacimiento],
  )

  const updateFormValue = (name: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleInput = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target
    updateFormValue(name as keyof FormState, value)
  }

  const handlePhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
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

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!form.genero || !form.nacimiento) {
      setWarning('Complete género y fecha de nacimiento para continuar.')
      return
    }

    setWarning('')
    setSent(true)
    window.setTimeout(() => setSent(false), 3200)
  }

  return (
    <main>
      <span className="ash-particle ash-one" aria-hidden="true" />
      <span className="ash-particle ash-two" aria-hidden="true" />
      <span className="ember-particle ember-one" aria-hidden="true" />
      <span className="ember-particle ember-two" aria-hidden="true" />

      <section className="dossier">
        <span className="paper-clip" aria-hidden="true" />
        <span className="fold-line" aria-hidden="true" />
        <span className="burn-mark burn-one" aria-hidden="true" />
        <span className="burn-mark burn-two" aria-hidden="true" />
        <span className="bullet-hole" aria-hidden="true" />
        <span className="blood-drip blood-one" aria-hidden="true" />
        <span className="blood-drip blood-two" aria-hidden="true" />

        <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'flex-end', paddingRight: '1rem' }}>
          <div className="stamp confidential-stamp" style={{ animation: 'stampImpact 720ms cubic-bezier(0.2, 1.55, 0.35, 1) both 360ms' }}>CONFIDENCIAL</div>
        </div>

        <header style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'center' }}>
          <div className="header-card">
            <p className="header-eyebrow">Registro de sobreviviente</p>
            <h1 className="stencil" style={{ 
              margin: '0.25rem 0', 
              lineHeight: 1,
              fontSize: 'clamp(3rem, 5vw, 5.5rem)'
            }}>
              Camp Zero
            </h1>
            <p className="header-subtitle">Formulario de ingreso a zona segura</p>
          </div>
        </header>

        <form onSubmit={handleSubmit}>
          <div>
            <fieldset className="file-section">
              <legend className="section-title">Datos personales</legend>
              <div className="form-fields" style={{ gap: '1rem' }}>
                  {textFields.map((field) => (
                    <label key={field.name} className="field-label">
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
                      className="custom-trigger"
                      onClick={() => setGenderOpen((current) => !current)}
                      type="button"
                    >
                      <span>{form.genero || 'Seleccionar'}</span>
                      <span className="trigger-mark">▾</span>
                    </button>
                  </div>

                  <div className="field-label" style={{ gridColumn: 'span 2' }}>
                    Fecha de nacimiento
                    <button
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

              <fieldset className="file-section">
                <legend className="section-title">Información de salud</legend>
                <div className="form-fields" style={{ gap: '1rem' }}>
                  {healthFields.map((field) => (
                    <label key={field.name} className="field-label">
                      {field.label}
                      <textarea
                        className="classified-input"
                        name={field.name}
                        onChange={handleInput}
                        placeholder={field.placeholder}
                        required
                        value={form[field.name]}
                        style={{ minHeight: '4rem', resize: 'vertical' }}
                      />
                    </label>
                  ))}
                </div>
              </fieldset>
          </div>

          <aside style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <label className="photo-drop">
              {photoPreview ? (
                <img alt="Vista previa del retrato" src={photoPreview} />
              ) : (
                <span
                  style={{
                    fontFamily: 'monospace',
                    textAlign: 'center',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: '#1a1410',
                  }}
                >
                  Subir retrato
                  <small
                    style={{
                      display: 'block',
                      marginTop: '0.5rem',
                      fontSize: '0.65rem',
                      letterSpacing: '0.05em',
                    }}
                  >
                    PNG o JPG
                  </small>
                </span>
              )}
              <input
                accept="image/png,image/jpeg"
                name="foto"
                onChange={handlePhoto}
                type="file"
                style={{ display: 'none' }}
              />
            </label>

            <button className="submit-stamp" type="submit">
              Procesar Ingreso
            </button>

            <p className="notice-slip">
              NOTICE: BY SUBMITTING THIS DOCUMENT, YOU ACKNOWLEDGE THAT ALL RESOURCES PROVIDED ARE
              PROPERTY OF THE CAMP ADMINISTRATION.
            </p>

            {warning && <p className="form-warning">⚠️ {warning}</p>}

            {sent && <p className="form-confirm">✓ Expediente enviado.</p>}
          </aside>
        </form>
      </section>

      {genderOpen && (
        <div className="modal-backdrop" onClick={() => setGenderOpen(false)}>
          <div className="dropdown-panel" onClick={(event) => event.stopPropagation()}>
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
          <div className="calendar-popover" onClick={(event) => event.stopPropagation()}>
            <div className="calendar-header">
              <strong>
                {monthNames[calendarDate.getMonth()]} de {calendarDate.getFullYear()}
              </strong>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="cal-nav" onClick={() => changeCalendarMonth(-1)} type="button">
                  ◄
                </button>
                <button className="cal-nav" onClick={() => changeCalendarMonth(1)} type="button">
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
                  className={`calendar-day ${day.inMonth ? '' : 'is-muted'} ${day.isSelected ? 'is-selected' : ''} ${day.isToday ? 'is-today' : ''}`}
                  key={day.value}
                  onClick={() => selectCalendarDay(day)}
                  type="button"
                >
                  {day.date.getDate()}
                </button>
              ))}
            </div>
            <div className="calendar-footer">
              <button
                onClick={() => {
                  updateFormValue('nacimiento', '')
                  setCalendarOpen(false)
                }}
                type="button"
              >
                Borrar
              </button>
              <button
                onClick={() =>
                  selectCalendarDay({
                    date: new Date(),
                    inMonth: true,
                    isSelected: false,
                    isToday: true,
                    value: toDateValue(new Date()),
                  })
                }
                type="button"
              >
                Hoy
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
