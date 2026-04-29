import type { ChangeEvent, FormEvent } from 'react'
import { useMemo, useState } from 'react'
import '../admission.css'
import { submitAdmission } from '../services/admissionApi'
import type { FormState, CalendarDay } from '../types'

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
    <main
      style={{
        position: 'relative',
        minHeight: '100vh',
        overflow: 'hidden',
        backgroundColor: '#15120d',
        padding: '20px 16px',
        color: '#1a1410',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at 20% 15%, rgba(0,0,0,.55), transparent 30%), radial-gradient(circle at 78% 6%, rgba(0,0,0,.35), transparent 24%), linear-gradient(115deg, rgba(0,0,0,.48), transparent 42%, rgba(0,0,0,.62))',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <div className="ash ash-one" />
      <div className="ash ash-two" />
      <div className="ember ember-one" />
      <div className="ember ember-two" />

      <section
        className="dossier"
        style={{
          position: 'relative',
          width: 'min(1180px, calc(100vw - 32px))',
          maxWidth: '1180px',
          margin: '0 auto',
          backgroundColor: '#f0dcae',
          backgroundImage: "url('/images/paper-texture.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundBlendMode: 'multiply',
          padding: '48px 42px 42px',
          zIndex: 1,
          animation: 'dossierArrive 650ms ease both',
        }}
      >
        <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'flex-end', paddingRight: '16px' }}>
          <div
            className="stamp confidential-stamp"
            style={{
              display: 'inline-block',
              transform: 'rotate(3deg)',
              padding: '6px 20px',
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '0.28em',
            }}
          >
            Confidencial
          </div>
        </div>

        <header style={{ marginBottom: '20px', display: 'flex' }}>
          <div
            className="header-card"
            style={{
              position: 'relative',
              display: 'inline-block',
              padding: '12px 18px',
              background: 'rgba(248, 232, 195, 0.95)',
              border: '2px solid rgba(15, 12, 8, 0.9)',
              boxShadow: '8px 10px 0 rgba(0,0,0,0.12)',
              zIndex: 2,
            }}
          >
            <p className="header-eyebrow" style={{ fontFamily: "ui-monospace, 'Courier New', monospace", fontSize: '0.82rem', fontWeight: 900, letterSpacing: '0.36em', textTransform: 'uppercase', color: '#1a1410', margin: 0 }}>
              Registro de sobreviviente
            </p>
            <h1 className="stencil" style={{ marginTop: '4px', fontSize: 'clamp(2.5rem, 8vw, 4rem)', fontWeight: 900, textTransform: 'uppercase', lineHeight: 1, letterSpacing: '0.05em', color: '#000', textShadow: '0 6px 12px rgba(0,0,0,0.45)' }}>
              Campamento Cero
            </h1>
            <p className="header-subtitle" style={{ marginTop: '8px', fontFamily: "ui-monospace, 'Courier New', monospace", fontSize: '1rem', fontWeight: 900, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#6b1414' }}>
              Formulario de ingreso a zona segura
            </p>
          </div>
        </header>

        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 calc(100% - 240px)', minWidth: '300px' }}>
            <fieldset className="file-section file-section--spaced">
              <legend style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace', fontSize: '0.75rem', fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#0a0806', background: 'rgba(248, 232, 195, 0.95)', border: '1.5px solid rgba(15, 12, 8, 0.5)', padding: '8px 12px', marginBottom: '12px' }}>
                Datos Personales
              </legend>
              <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(3, 1fr)' }}>
                {textFields.map((field) => (
                  <label key={field.name} style={{ display: 'block', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace', fontSize: '0.92rem', fontWeight: 900, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#0a0806' }}>
                    {field.label}
                    <input name={field.name} onChange={handleInput} maxLength={field.maxLength} required={field.required} type="text" value={form[field.name]} style={{ marginTop: '4px', width: '100%', border: 0, borderBottom: '3px solid #0d0b08', background: 'rgba(255, 245, 215, 0.55)', padding: '0.65rem 0.55rem 0.55rem', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace', fontSize: '1.02rem', fontWeight: 700, color: '#06050a', outline: 'none', transition: 'background-color 180ms ease, box-shadow 180ms ease, transform 180ms ease', minHeight: '2.7rem' }} />
                  </label>
                ))}
              </div>
              <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(2, 1fr)', marginTop: '16px' }}>
                <label style={{ position: 'relative' }}>
                  <span style={{ display: 'block', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace', fontSize: '0.92rem', fontWeight: 900, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#0a0806', marginBottom: '4px' }}>Email</span>
                  <input name="email" onChange={handleInput} placeholder="correo@ejemplo.com" required type="email" value={form.email} style={{ width: '100%', border: 0, borderBottom: '3px solid #0d0b08', background: 'rgba(255, 245, 215, 0.55)', padding: '0.65rem 0.55rem 0.55rem', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace', fontSize: '1.02rem', fontWeight: 700, color: '#06050a', outline: 'none', transition: 'background-color 180ms ease, box-shadow 180ms ease, transform 180ms ease', minHeight: '2.7rem' }} />
                </label>
                <label style={{ position: 'relative' }}>
                  <span style={{ display: 'block', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace', fontSize: '0.92rem', fontWeight: 900, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#0a0806', marginBottom: '4px' }}>Usuario</span>
                  <input name="usuario" onChange={handleInput} placeholder="sobreviviente-01" required type="text" value={form.usuario} style={{ width: '100%', border: 0, borderBottom: '3px solid #0d0b08', background: 'rgba(255, 245, 215, 0.55)', padding: '0.65rem 0.55rem 0.55rem', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace', fontSize: '1.02rem', fontWeight: 700, color: '#06050a', outline: 'none', transition: 'background-color 180ms ease, box-shadow 180ms ease, transform 180ms ease', minHeight: '2.7rem' }} />
                </label>
              </div>
              <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(2, 1fr)', marginTop: '16px' }}>
                <label style={{ position: 'relative' }}>
                  <span style={{ display: 'block', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace', fontSize: '0.92rem', fontWeight: 900, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#0a0806', marginBottom: '4px' }}>Género</span>
                  <button onClick={() => setGenderOpen(!genderOpen)} style={{ alignItems: 'center', background: 'rgba(255, 245, 215, 0.55)', border: 0, borderBottom: '3px solid #0d0b08', color: '#06050a', cursor: 'pointer', display: 'flex', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace', fontSize: '1.02rem', fontWeight: 800, justifyContent: 'space-between', minHeight: '2.7rem', padding: '0.65rem 0.55rem 0.55rem', textAlign: 'left', transition: 'background-color 180ms ease, transform 180ms ease', width: '100%' } as any} type="button">
                    {form.genero || 'Seleccionar'}
                    <span style={{ color: '#8f1d1d', fontSize: '1.1rem' }}>▼</span>
                  </button>
                </label>
                <label style={{ position: 'relative' }}>
                  <span style={{ display: 'block', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace', fontSize: '0.92rem', fontWeight: 900, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#0a0806', marginBottom: '4px' }}>Fecha de nacimiento</span>
                  <button onClick={() => setCalendarOpen(!calendarOpen)} style={{ background: 'rgba(255, 245, 215, 0.55)', border: 0, borderBottom: '3px solid #0d0b08', color: '#06050a', cursor: 'pointer', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace', fontSize: '1.02rem', fontWeight: 700, minHeight: '2.7rem', padding: '0.65rem 0.55rem 0.55rem', textAlign: 'left', transition: 'background-color 180ms ease, transform 180ms ease', width: '100%' } as any} type="button">
                    {formatDate(form.nacimiento)}
                  </button>
                </label>
              </div>
            </fieldset>
            <fieldset className="file-section">
              <legend style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace', fontSize: '0.75rem', fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#0a0806', background: 'rgba(248, 232, 195, 0.95)', border: '1.5px solid rgba(15, 12, 8, 0.5)', padding: '8px 12px', marginBottom: '12px' }}>
                Información de Salud
              </legend>
              <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(2, 1fr)' }}>
                {healthFields.map((field) => (
                  <label key={field.name} style={{ display: 'block', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace', fontSize: '0.92rem', fontWeight: 900, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#0a0806' }}>
                    {field.label}
                    <textarea name={field.name} onChange={handleInput} placeholder={field.placeholder} value={form[field.name]} style={{ marginTop: '4px', width: '100%', border: 0, borderBottom: '3px solid #0d0b08', background: 'rgba(255, 245, 215, 0.55)', padding: '0.65rem 0.55rem 0.55rem', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace', fontSize: '1.02rem', fontWeight: 700, color: '#06050a', outline: 'none', transition: 'background-color 180ms ease, box-shadow 180ms ease, transform 180ms ease', minHeight: '64px', resize: 'vertical' }} />
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
          <aside style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: '0 1 200px' }}>
            <label className="photo-drop" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '20.8rem', cursor: 'pointer', overflow: 'hidden', border: '2px solid rgba(15, 12, 8, 0.95)', backgroundColor: '#f0dcae', backgroundSize: 'cover', backgroundPosition: 'center', backgroundBlendMode: 'multiply', boxShadow: '0 10px 22px rgba(30, 18, 10, 0.42), inset 0 0 25px rgba(77, 45, 22, 0.18)', transform: 'rotate(0.5deg)', position: 'relative', color: '#06050a' }}>
              {photoPreview ? (
                <img alt="Vista previa del retrato" src={photoPreview} style={{ height: '100%', width: '100%', objectFit: 'cover', filter: 'grayscale(1)' }} />
              ) : (
                <span style={{ color: '#1a1410', fontWeight: 900, fontSize: '0.9rem', letterSpacing: '0.18em', textAlign: 'center', textTransform: 'uppercase' }}>
                  Subir retrato
                  <small style={{ marginTop: '8px', display: 'block', fontSize: '10px', letterSpacing: 'normal' }}>PNG o JPG</small>
                </span>
              )}
              <input accept="image/png,image/jpeg" style={{ display: 'none' }} name="foto" onChange={handlePhoto} type="file" />
            </label>
            <button className="submit-stamp" type="submit" style={{ background: '#6b1414', border: '4px solid #6b1414', color: '#f8e9c2', cursor: 'pointer', fontFamily: "ui-monospace, 'Courier New', monospace", fontSize: '1.05rem', fontWeight: 900, letterSpacing: '0.16em', padding: '0.95rem 1rem', textTransform: 'uppercase', width: '100%', boxShadow: '0 4px 12px rgba(60, 10, 10, 0.4)' }}>
              Procesar Ingreso
            </button>
            <p style={{ background: 'rgba(255, 245, 215, 0.6)', border: '1.5px solid rgba(50, 35, 20, 0.55)', color: '#1a1410', fontFamily: "ui-monospace, 'Courier New', monospace", fontSize: '0.7rem', fontStyle: 'italic', fontWeight: 800, lineHeight: 1.7, padding: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
              NOTICE: BY SUBMITTING THIS DOCUMENT, YOU ACKNOWLEDGE THAT ALL RESOURCES PROVIDED ARE PROPERTY OF THE CAMP ADMINISTRATION.
            </p>
            {warning && <p style={{ border: '2px solid #17140f', background: 'rgba(216, 195, 151, 0.86)', fontFamily: "ui-monospace, 'Courier New', monospace", fontSize: '0.75rem', fontWeight: 900, padding: '0.75rem', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8f1d1d', margin: 0 }}>{warning}</p>}
            {sent && <p style={{ border: '2px solid #17140f', background: 'rgba(216, 195, 151, 0.86)', fontFamily: "ui-monospace, 'Courier New', monospace", fontSize: '0.75rem', fontWeight: 900, padding: '0.75rem', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#2d4a1e', margin: 0 }}>Expediente enviado.</p>}
          </aside>
        </form>
        {genderOpen && (
          <div className="modal-backdrop" onClick={() => setGenderOpen(false)} style={{ position: 'fixed', inset: 0, background: 'radial-gradient(circle at center, rgba(20, 12, 8, 0.55), rgba(8, 4, 2, 0.85))', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 80, padding: '1rem' } as any}>
            <div className="dropdown-panel" onClick={(event) => event.stopPropagation()} style={{ backgroundColor: '#f0dcae', backgroundSize: 'cover', backgroundPosition: 'center', backgroundBlendMode: 'multiply', border: '2px solid rgba(15, 12, 8, 0.95)', boxShadow: '0 25px 55px rgba(0, 0, 0, 0.7), inset 0 0 25px rgba(77, 45, 22, 0.18)', color: '#06050a', position: 'relative', zIndex: 81, padding: '0.6rem', minWidth: '260px' } as any}>
              <p style={{ fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', fontSize: '0.85rem', padding: '0.55rem 0.75rem 0.85rem', borderBottom: '2px solid rgba(15, 12, 8, 0.7)', marginBottom: '0.4rem', color: '#06050a' }}>Seleccionar género</p>
              {genderOptions.map((option) => (
                <button key={option} onClick={() => { updateFormValue('genero', option); setGenderOpen(false); }} type="button" style={{ border: 0, background: form.genero === option ? '#5a1414' : 'transparent', color: form.genero === option ? '#f8e9c2' : '#06050a', cursor: 'pointer', display: 'block', fontFamily: "ui-monospace, 'Courier New', monospace", fontWeight: 900, fontSize: '0.98rem', letterSpacing: '0.16em', padding: '0.75rem 0.85rem', textAlign: 'left', width: '100%' }}>
                  {option}
                </button>
              ))}
            </div>
          </div>
        )}
        {calendarOpen && (
          <div className="modal-backdrop" onClick={() => setCalendarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'radial-gradient(circle at center, rgba(20, 12, 8, 0.55), rgba(8, 4, 2, 0.85))', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 80, padding: '1rem' } as any}>
            <div className="calendar-popover" onClick={(event) => event.stopPropagation()} style={{ backgroundColor: '#f0dcae', backgroundSize: 'cover', backgroundPosition: 'center', backgroundBlendMode: 'multiply', border: '2px solid rgba(15, 12, 8, 0.95)', boxShadow: '0 25px 55px rgba(0, 0, 0, 0.7), inset 0 0 25px rgba(77, 45, 22, 0.18)', color: '#06050a', position: 'relative', zIndex: 81, padding: '1rem', width: 'min(360px, 96vw)' } as any}>
              <div style={{ alignItems: 'center', display: 'flex', fontFamily: "ui-monospace, 'Courier New', monospace", justifyContent: 'space-between', color: '#06050a', marginBottom: '1rem' }}>
                <strong style={{ fontSize: '1.05rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#06050a' }}>{monthNames[calendarDate.getMonth()]} de {calendarDate.getFullYear()}</strong>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button aria-label="Mes anterior" onClick={() => changeCalendarMonth(-1)} type="button" style={{ background: 'transparent', border: '1.5px solid rgba(15, 12, 8, 0.65)', color: '#5a1414', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 900, fontSize: '0.85rem', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>◄</button>
                  <button aria-label="Mes siguiente" onClick={() => changeCalendarMonth(1)} type="button" style={{ background: 'transparent', border: '1.5px solid rgba(15, 12, 8, 0.65)', color: '#5a1414', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 900, fontSize: '0.85rem', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>►</button>
                </div>
              </div>
              <div style={{ display: 'grid', gap: '0.3rem', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', marginTop: '1rem' }}>
                {weekDays.map((day) => (
                  <span key={day} style={{ color: '#1a1410', fontFamily: "ui-monospace, 'Courier New', monospace", fontSize: '0.82rem', fontWeight: 900, padding: '0.4rem 0', textAlign: 'center', letterSpacing: '0.08em', borderBottom: '1px solid rgba(15, 12, 8, 0.25)' }}>{day}</span>
                ))}
                {calendarDays.map((day) => (
                  <button key={day.value} onClick={() => selectCalendarDay(day)} type="button" style={{ aspectRatio: '1', background: day.inMonth ? 'rgba(255, 248, 220, 0.55)' : 'transparent', border: day.isSelected ? '2px solid #5a1414' : '1px solid transparent', color: day.inMonth ? '#06050a' : 'rgba(15, 12, 8, 0.32)', cursor: day.inMonth ? 'pointer' : 'default', fontFamily: "ui-monospace, 'Courier New', monospace", fontWeight: day.isSelected ? 900 : 800, fontSize: '0.95rem' }}>
                    {day.date.getDate()}
                  </button>
                ))}
              </div>
              <div style={{ marginTop: '0.7rem', borderTop: '1.5px solid rgba(15, 12, 8, 0.45)', paddingTop: '0.55rem', display: 'flex', gap: '8px' }}>
                <button onClick={() => { updateFormValue('nacimiento', ''); setCalendarOpen(false); }} type="button" style={{ background: 'transparent', border: 0, color: '#5a1414', cursor: 'pointer', fontFamily: "ui-monospace, 'Courier New', monospace", fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', fontSize: '0.88rem', padding: '0.4rem 0.6rem', flex: 1 }}>
                  Borrar
                </button>
                <button onClick={() => setCalendarOpen(false)} type="button" style={{ background: 'transparent', border: 0, color: '#5a1414', cursor: 'pointer', fontFamily: "ui-monospace, 'Courier New', monospace", fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', fontSize: '0.88rem', padding: '0.4rem 0.6rem', flex: 1 }}>
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  )
}
