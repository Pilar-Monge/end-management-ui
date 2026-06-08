import '../expeditionsUi.css'

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchCampResources, fetchCamps } from '../../camps/api/queries'
import type { Camp, CampResourceItem } from '../../camps/types'
import { fetchOccupations, fetchResourceTypes } from '../../catalogs/api/queries'
import type { Occupation, ResourceType } from '../../catalogs/types'
import { getServerTime } from '../../admin-dashboard/services/dashboard.service'
import { listExpeditions } from '../../admin-dashboard/services/expeditions.service'
import { listNotifications } from '../../admin-dashboard/services/notifications.service'
import type { AdminExpeditionRecord, AdminNotificationRecord } from '../../admin-dashboard/services/types'
import { fetchAuthMeProfile, fetchPersons, type AuthMeProfile } from '../../persons/api/queries'
import type { Person } from '../../persons/types'
import { WorldMap } from '../components/WorldMap'
import { createExpedition } from '../services/expeditionsUi.service'

type TabId = 'dashboard' | 'create' | 'list' | 'people' | 'resources'

interface SuggestedAdventure {
  id: string
  campKey: string
  name: string
  objective: string
  destination: string
  latitude: number
  longitude: number
  danger: 'Bajo' | 'Medio' | 'Alto' | 'Critico'
  resources: string[]
}

interface ExpeditionFormState {
  name: string
  objective: string
  destinationDescription: string
  destinationLatitude: string
  destinationLongitude: string
  plannedDepartureDate: string
  plannedReturnDate: string
  participantIds: number[]
}

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'create', label: 'Crear expedicion' },
  { id: 'list', label: 'Lista' },
  { id: 'people', label: 'Personas' },
  { id: 'resources', label: 'Recursos' },
]

const SUGGESTED_ADVENTURES: SuggestedAdventure[] = [
  {
    id: 'northern-pass',
    campKey: 'north',
    name: 'Paso Boreal',
    objective: 'Reconocer ruta helada y asegurar puntos de suministro.',
    destination: 'Paso montanoso al norte',
    latitude: 61.2,
    longitude: -149.9,
    danger: 'Alto',
    resources: ['Agua glaciar', 'Cuarcita', 'Refugios de piedra'],
  },
  {
    id: 'coastal-cache',
    campKey: 'coast',
    name: 'Costa de Salvamento',
    objective: 'Inspeccionar restos costeros y recuperar combustible util.',
    destination: 'Franja costera oriental',
    latitude: 9.9,
    longitude: -83.9,
    danger: 'Medio',
    resources: ['Combustible marino', 'Pescado', 'Madera salina'],
  },
  {
    id: 'andes-relay',
    campKey: 'south',
    name: 'Relevo Andino',
    objective: 'Abrir enlace con refugios altos y medir riesgo climatico.',
    destination: 'Cordillera sur',
    latitude: -33.4,
    longitude: -70.7,
    danger: 'Critico',
    resources: ['Litio', 'Sales raras', 'Cobre'],
  },
  {
    id: 'green-basin',
    campKey: 'central',
    name: 'Cuenca Verde',
    objective: 'Localizar fuentes de agua y plantas medicinales.',
    destination: 'Cuenca forestal cercana',
    latitude: 10.1,
    longitude: -84.2,
    danger: 'Bajo',
    resources: ['Agua filtrada', 'Flora medicinal', 'Fibras vegetales'],
  },
]

const STATUS_META: Record<string, { label: string; color: string }> = {
  PLANNED: { label: 'Planificada', color: '#67ACA9' },
  PROGRAMADA: { label: 'Programada', color: '#67ACA9' },
  IN_PROGRESS: { label: 'En curso', color: '#69BFB7' },
  ACTIVA: { label: 'Activa', color: '#69BFB7' },
  ACTIVE: { label: 'Activa', color: '#69BFB7' },
  DELAYED: { label: 'Retrasada', color: '#f59e0b' },
  COMPLETED: { label: 'Completada', color: '#4ade80' },
  COMPLETADA: { label: 'Completada', color: '#4ade80' },
  LOST: { label: 'Perdida', color: '#ef4444' },
  CANCELED: { label: 'Cancelada', color: '#ef4444' },
}

const ROLE_LABELS: Record<string, string> = {
  SYSTEM_ADMIN: 'Administrador del sistema',
  RESOURCE_MANAGEMENT: 'Gestion de recursos',
  TRAVEL_MANAGER: 'Encargado de viajes',
  WORKER: 'Trabajador',
}

function nextIsoDate(hoursFromNow: number) {
  return new Date(Date.now() + hoursFromNow * 60 * 60 * 1000).toISOString().slice(0, 16)
}

function initialFormState(): ExpeditionFormState {
  return {
    name: '',
    objective: '',
    destinationDescription: '',
    destinationLatitude: '',
    destinationLongitude: '',
    plannedDepartureDate: nextIsoDate(1),
    plannedReturnDate: nextIsoDate(25),
    participantIds: [],
  }
}

function numberValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function fullName(person: Person) {
  return `${person.firstName ?? person.name ?? ''} ${person.lastName ?? ''}`.trim() || person.alias || `Persona #${person.id}`
}

function normalizeStatus(status: unknown) {
  return String(status ?? 'PLANNED').toUpperCase()
}

function getExpeditionTitle(expedition: AdminExpeditionRecord) {
  return expedition.name ?? expedition.title ?? `Expedicion #${expedition.id}`
}

function getExpeditionObjective(expedition: AdminExpeditionRecord) {
  return expedition.objective ?? expedition.description ?? 'Objetivo pendiente de registrar.'
}

function getExpeditionCampIds(expedition: AdminExpeditionRecord) {
  return [
    expedition.campId,
    expedition.originCampId,
    expedition.startCampId,
    expedition.baseCampId,
    expedition.destinationCampId,
    expedition.endCampId,
    expedition.targetCampId,
  ].filter((item): item is number => Number.isFinite(item))
}

function isExpeditionForCamp(expedition: AdminExpeditionRecord, campId: number) {
  const campIds = getExpeditionCampIds(expedition)
  return campIds.length === 0 || campIds.includes(campId)
}

function expeditionDestination(expedition: AdminExpeditionRecord) {
  const source = readRecord(expedition.destination ?? expedition.targetLocation ?? expedition.coordinates)
  const route = readRecord(expedition.route ?? expedition.plannedRoute)
  const routeEnd = readRecord(route.end ?? route.destination)
  const lat =
    numberValue(expedition.destinationLatitude) ??
    numberValue(source.latitude ?? source.lat) ??
    numberValue(routeEnd.latitude ?? routeEnd.lat)
  const lng =
    numberValue(expedition.destinationLongitude) ??
    numberValue(source.longitude ?? source.lng) ??
    numberValue(routeEnd.longitude ?? routeEnd.lng)
  const label =
    expedition.destinationDescription ??
    expedition.sector ??
    expedition.location ??
    (typeof source.label === 'string' ? source.label : undefined) ??
    'Destino sin coordenadas'

  return { lat, lng, label }
}

function resolveActiveCamp(profile: AuthMeProfile | null, camps: Camp[]) {
  const campId = profile?.user.campId ?? profile?.person?.campId
  if (!campId) return null
  return camps.find((camp) => camp.id === campId) ?? null
}

function campAdventureKey(camp: Camp | null) {
  if (!camp) return 'central'
  const name = camp.name.toLowerCase()
  if (name.includes('norte') || name.includes('boreal')) return 'north'
  if (name.includes('costa') || name.includes('este')) return 'coast'
  if (name.includes('sur') || name.includes('and')) return 'south'
  return 'central'
}

function formatTime(date: Date | null) {
  if (!date) return '--:--:--'
  return date.toLocaleTimeString('es-CR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

function formatDateTime(value?: string | number | null) {
  if (!value) return 'Sin fecha'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return String(value)
  return parsed.toLocaleString('es-CR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function roleName(profile: AuthMeProfile | null) {
  const role = String(profile?.user.role ?? profile?.user.rol ?? '').toUpperCase()
  return ROLE_LABELS[role] ?? (role || 'Rol no sincronizado')
}

function currentUserName(profile: AuthMeProfile | null) {
  return profile?.person ? fullName(profile.person) : (profile?.user.username ?? 'Usuario')
}

export default function ExpeditionsUiPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabId>('dashboard')
  const [profile, setProfile] = useState<AuthMeProfile | null>(null)
  const [camps, setCamps] = useState<Camp[]>([])
  const [expeditions, setExpeditions] = useState<AdminExpeditionRecord[]>([])
  const [persons, setPersons] = useState<Person[]>([])
  const [occupations, setOccupations] = useState<Occupation[]>([])
  const [resourceTypes, setResourceTypes] = useState<ResourceType[]>([])
  const [campResources, setCampResources] = useState<CampResourceItem[]>([])
  const [notifications, setNotifications] = useState<AdminNotificationRecord[]>([])
  const [serverBaseTime, setServerBaseTime] = useState<Date | null>(null)
  const [serverSyncedAt, setServerSyncedAt] = useState<number>(Date.now())
  const [nowTick, setNowTick] = useState(Date.now())
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [form, setForm] = useState<ExpeditionFormState>(() => initialFormState())
  const [selectedExpeditionId, setSelectedExpeditionId] = useState<number | null>(null)
  const [submitState, setSubmitState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  useEffect(() => {
    const timer = window.setInterval(() => setNowTick(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    let mounted = true

    async function load() {
      setIsLoading(true)
      setLoadError(null)
      try {
        const [
          profileResult,
          campsResult,
          expeditionsResult,
          personsResult,
          occupationsResult,
          resourceTypesResult,
          notificationsResult,
          serverTimeResult,
        ] = await Promise.all([
          fetchAuthMeProfile(),
          fetchCamps(),
          listExpeditions(),
          fetchPersons(),
          fetchOccupations(),
          fetchResourceTypes(),
          listNotifications(),
          getServerTime(),
        ])

        if (!mounted) return
        setProfile(profileResult)
        setCamps(campsResult)
        setExpeditions(expeditionsResult)
        setPersons(personsResult)
        setOccupations(occupationsResult)
        setResourceTypes(resourceTypesResult)
        setNotifications(notificationsResult)
        setServerBaseTime(new Date(serverTimeResult.serverTime))
        setServerSyncedAt(Date.now())
      } catch (error) {
        if (!mounted) return
        setLoadError(error instanceof Error ? error.message : 'No se pudo sincronizar expediciones.')
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    void load()
    return () => {
      mounted = false
    }
  }, [])

  const activeCamp = useMemo(() => resolveActiveCamp(profile, camps), [profile, camps])

  useEffect(() => {
    let mounted = true
    if (!activeCamp) {
      setCampResources([])
      return
    }

    fetchCampResources(activeCamp.id)
      .then((items) => {
        if (mounted) setCampResources(items)
      })
      .catch(() => {
        if (mounted) setCampResources([])
      })

    return () => {
      mounted = false
    }
  }, [activeCamp])

  const serverNow = useMemo(() => {
    if (!serverBaseTime) return null
    const elapsed = nowTick - serverSyncedAt
    return new Date(serverBaseTime.getTime() + Math.max(0, elapsed))
  }, [nowTick, serverBaseTime, serverSyncedAt])

  const campExpeditions = useMemo(() => {
    if (!activeCamp) return []
    return expeditions.filter((item) => isExpeditionForCamp(item, activeCamp.id))
  }, [activeCamp, expeditions])

  const activeCampPersons = useMemo(() => {
    if (!activeCamp) return []
    return persons.filter((person) => person.campId === activeCamp.id)
  }, [activeCamp, persons])

  const occupationById = useMemo(
    () => new Map(occupations.map((occupation) => [occupation.id, occupation.name])),
    [occupations],
  )

  const resourceTypeById = useMemo(
    () => new Map(resourceTypes.map((resource) => [resource.id, resource])),
    [resourceTypes],
  )

  const suggestedAdventures = useMemo(() => {
    const key = campAdventureKey(activeCamp)
    const filtered = SUGGESTED_ADVENTURES.filter((item) => item.campKey === key)
    return filtered.length > 0 ? filtered : SUGGESTED_ADVENTURES.filter((item) => item.campKey === 'central')
  }, [activeCamp])

  const selectedExpedition = useMemo(
    () => campExpeditions.find((item) => item.id === selectedExpeditionId) ?? campExpeditions[0] ?? null,
    [campExpeditions, selectedExpeditionId],
  )

  const mapDots = useMemo(() => {
    if (!activeCamp) return []
    return campExpeditions
      .map((item) => {
        const destination = expeditionDestination(item)
        if (destination.lat === null || destination.lng === null) return null
        return {
          expedition: item,
          dot: {
            start: {
              lat: activeCamp.location.latitude,
              lng: activeCamp.location.longitude,
              label: activeCamp.name,
            },
            end: {
              lat: destination.lat,
              lng: destination.lng,
              label: destination.label,
            },
            status: normalizeStatus(item.status ?? item.expeditionStatus),
          },
        }
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
  }, [activeCamp, campExpeditions])

  const unreadNotifications = useMemo(
    () => notifications.filter((item) => !(item.read ?? item.isRead)),
    [notifications],
  )

  const stats = useMemo(() => {
    const counts = campExpeditions.reduce(
      (acc, item) => {
        const status = normalizeStatus(item.status ?? item.expeditionStatus)
        if (status.includes('COMPLETE') || status.includes('COMPLET')) acc.completed += 1
        else if (status.includes('DELAY')) acc.delayed += 1
        else if (status.includes('PLAN') || status.includes('PENDING')) acc.planned += 1
        else acc.active += 1
        return acc
      },
      { active: 0, planned: 0, delayed: 0, completed: 0 },
    )
    return counts
  }, [campExpeditions])

  const applyAdventure = (adventure: SuggestedAdventure) => {
    setForm((current) => ({
      ...current,
      name: adventure.name,
      objective: adventure.objective,
      destinationDescription: adventure.destination,
      destinationLatitude: String(adventure.latitude),
      destinationLongitude: String(adventure.longitude),
    }))
    setActiveTab('create')
  }

  const toggleParticipant = (personId: number) => {
    setForm((current) => ({
      ...current,
      participantIds: current.participantIds.includes(personId)
        ? current.participantIds.filter((id) => id !== personId)
        : [...current.participantIds, personId],
    }))
  }

  const handleSubmit = async () => {
    if (!activeCamp || !form.name.trim() || !form.objective.trim() || !form.destinationDescription.trim()) {
      setSubmitState('error')
      return
    }

    setSubmitState('saving')
    try {
      const created = await createExpedition({
        name: form.name.trim(),
        objective: form.objective.trim(),
        campId: activeCamp.id,
        destinationDescription: form.destinationDescription.trim(),
        destinationLatitude: numberValue(form.destinationLatitude) ?? undefined,
        destinationLongitude: numberValue(form.destinationLongitude) ?? undefined,
        plannedDepartureDate: new Date(form.plannedDepartureDate).toISOString(),
        plannedReturnDate: new Date(form.plannedReturnDate).toISOString(),
        participantIds: form.participantIds,
      })
      setExpeditions((current) => [created, ...current])
      setForm(initialFormState())
      setSelectedExpeditionId(created.id)
      setActiveTab('list')
      setSubmitState('saved')
    } catch {
      setSubmitState('error')
    }
  }

  const logout = () => {
    localStorage.removeItem('user')
    localStorage.removeItem('token')
    localStorage.removeItem('accessToken')
    navigate('/main-homepage', { replace: true, state: { initialAppState: 'login' } })
  }

  return (
    <div className="game-screen-layout xui-root text-[#A4C2C5]">
      <div className="holo-grid" />
      <header className="xui-hud">
        <button className="xui-hud-button" type="button" onClick={() => navigate('/main-homepage', { state: { initialAppState: 'global-map', skipIntro: true } })}>
          VOLVER
        </button>
        <div className="xui-hud-center">
          <span>{formatTime(serverNow)}</span>
          <span>{activeCamp?.name ?? 'Campamento no asignado'}</span>
          <span>{unreadNotifications.length} alertas</span>
        </div>
        <div className="xui-hud-user">
          <span>{currentUserName(profile)}</span>
          <small>{roleName(profile)}</small>
          <button type="button" onClick={logout}>Cerrar sesion</button>
        </div>
      </header>

      <main className="xui-shell">
        <aside className="xui-side">
          <div className="xui-brand">
            <span>END MANAGEMENT</span>
            <strong>EXPEDICIONES</strong>
          </div>
          <nav className="xui-tabs" aria-label="Secciones de expediciones">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                className={activeTab === tab.id ? 'is-active' : ''}
                type="button"
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>
          <div className="xui-side-card">
            <small>Campamento activo</small>
            <strong>{activeCamp?.name ?? 'Sin campamento'}</strong>
            <span>{activeCamp ? `${activeCamp.currentPopulation}/${activeCamp.capacity} personas` : 'Sin dato del backend'}</span>
          </div>
          <div className="xui-side-card">
            <small>Notificaciones</small>
            {unreadNotifications.slice(0, 3).map((item) => (
              <span key={item.id}>{item.title ?? item.message ?? item.body ?? `Alerta #${item.id}`}</span>
            ))}
            {unreadNotifications.length === 0 && <span>Sin alertas pendientes</span>}
          </div>
        </aside>

        <section className="xui-content">
          {isLoading && <StatePanel title="Sincronizando backend" message="Cargando expediciones, personas, recursos y hora del servidor." />}
          {!isLoading && loadError && <StatePanel title="Error de sincronizacion" message={loadError} />}
          {!isLoading && !loadError && !activeCamp && (
            <StatePanel title="Campamento activo no disponible" message="El backend no devolvio un campamento para el usuario autenticado." />
          )}
          {!isLoading && !loadError && activeCamp && (
            <>
              {activeTab === 'dashboard' && (
                <DashboardView
                  activeCamp={activeCamp}
                  campExpeditions={campExpeditions}
                  mapDots={mapDots}
                  selectedExpedition={selectedExpedition}
                  stats={stats}
                  suggestedAdventures={suggestedAdventures}
                  onSelectExpedition={setSelectedExpeditionId}
                  onUseAdventure={applyAdventure}
                />
              )}
              {activeTab === 'create' && (
                <CreateView
                  form={form}
                  people={activeCampPersons}
                  occupationById={occupationById}
                  submitState={submitState}
                  suggestedAdventures={suggestedAdventures}
                  onChange={setForm}
                  onSubmit={handleSubmit}
                  onToggleParticipant={toggleParticipant}
                  onUseAdventure={applyAdventure}
                />
              )}
              {activeTab === 'list' && (
                <ListView
                  expeditions={campExpeditions}
                  selectedId={selectedExpedition?.id ?? null}
                  onSelect={setSelectedExpeditionId}
                />
              )}
              {activeTab === 'people' && (
                <PeopleView people={activeCampPersons} occupationById={occupationById} />
              )}
              {activeTab === 'resources' && (
                <ResourcesView resources={campResources} resourceTypeById={resourceTypeById} />
              )}
            </>
          )}
        </section>
      </main>
    </div>
  )
}

function StatePanel({ title, message }: { title: string; message: string }) {
  return (
    <div className="xui-state">
      <span>TACTICAL LINK</span>
      <h1>{title}</h1>
      <p>{message}</p>
    </div>
  )
}

function DashboardView({
  activeCamp,
  campExpeditions,
  mapDots,
  selectedExpedition,
  stats,
  suggestedAdventures,
  onSelectExpedition,
  onUseAdventure,
}: {
  activeCamp: Camp
  campExpeditions: AdminExpeditionRecord[]
  mapDots: Array<{ expedition: AdminExpeditionRecord; dot: Parameters<typeof WorldMap>[0]['dots'] extends Array<infer D> ? D : never }>
  selectedExpedition: AdminExpeditionRecord | null
  stats: { active: number; planned: number; delayed: number; completed: number }
  suggestedAdventures: SuggestedAdventure[]
  onSelectExpedition: (id: number) => void
  onUseAdventure: (adventure: SuggestedAdventure) => void
}) {
  return (
    <div className="xui-grid">
      <section className="xui-panel xui-map-panel">
        <PanelTitle kicker="Mapa operativo" title="Rutas del campamento" />
        <div className="xui-map-wrap">
          <WorldMap
            dots={mapDots.map((item) => item.dot)}
            lowMotion
            onZoneClick={(dot) => {
              const match = mapDots.find((item) => item.dot.end.lat === dot.end.lat && item.dot.end.lng === dot.end.lng)
              if (match) onSelectExpedition(match.expedition.id)
            }}
          />
        </div>
      </section>

      <section className="xui-panel">
        <PanelTitle kicker="Resumen" title={activeCamp.name} />
        <div className="xui-kpis">
          <Kpi label="Activas" value={stats.active} />
          <Kpi label="Planificadas" value={stats.planned} />
          <Kpi label="Retrasadas" value={stats.delayed} />
          <Kpi label="Completadas" value={stats.completed} />
        </div>
        <div className="xui-detail-card">
          <small>Expedicion seleccionada</small>
          {selectedExpedition ? (
            <>
              <strong>{getExpeditionTitle(selectedExpedition)}</strong>
              <p>{getExpeditionObjective(selectedExpedition)}</p>
              <StatusBadge status={normalizeStatus(selectedExpedition.status ?? selectedExpedition.expeditionStatus)} />
            </>
          ) : (
            <p>No hay expediciones con coordenadas registradas para este campamento.</p>
          )}
        </div>
      </section>

      <section className="xui-panel xui-wide">
        <PanelTitle kicker="Destinos sugeridos" title="Aventuras predefinidas" />
        <div className="xui-adventures">
          {suggestedAdventures.map((adventure) => (
            <button key={adventure.id} type="button" onClick={() => onUseAdventure(adventure)}>
              <span>{adventure.danger}</span>
              <strong>{adventure.name}</strong>
              <small>{adventure.destination}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="xui-panel xui-wide">
        <PanelTitle kicker="Ultimos registros" title="Expediciones del backend" />
        <ExpeditionTable expeditions={campExpeditions.slice(0, 6)} onSelect={onSelectExpedition} />
      </section>
    </div>
  )
}

function CreateView({
  form,
  people,
  occupationById,
  submitState,
  suggestedAdventures,
  onChange,
  onSubmit,
  onToggleParticipant,
  onUseAdventure,
}: {
  form: ExpeditionFormState
  people: Person[]
  occupationById: Map<number, string>
  submitState: 'idle' | 'saving' | 'saved' | 'error'
  suggestedAdventures: SuggestedAdventure[]
  onChange: (state: ExpeditionFormState) => void
  onSubmit: () => void
  onToggleParticipant: (personId: number) => void
  onUseAdventure: (adventure: SuggestedAdventure) => void
}) {
  return (
    <div className="xui-grid">
      <section className="xui-panel">
        <PanelTitle kicker="Prefill tactico" title="Aventuras" />
        <div className="xui-adventures is-column">
          {suggestedAdventures.map((adventure) => (
            <button key={adventure.id} type="button" onClick={() => onUseAdventure(adventure)}>
              <span>{adventure.danger}</span>
              <strong>{adventure.name}</strong>
              <small>{adventure.resources.join(' / ')}</small>
            </button>
          ))}
        </div>
      </section>
      <section className="xui-panel xui-wide">
        <PanelTitle kicker="Nueva operacion" title="Crear expedicion" />
        <div className="xui-form-grid">
          <TextInput label="Nombre" value={form.name} onChange={(name) => onChange({ ...form, name })} />
          <TextInput label="Destino" value={form.destinationDescription} onChange={(destinationDescription) => onChange({ ...form, destinationDescription })} />
          <TextInput label="Latitud" value={form.destinationLatitude} onChange={(destinationLatitude) => onChange({ ...form, destinationLatitude })} />
          <TextInput label="Longitud" value={form.destinationLongitude} onChange={(destinationLongitude) => onChange({ ...form, destinationLongitude })} />
          <TextInput label="Salida planificada" type="datetime-local" value={form.plannedDepartureDate} onChange={(plannedDepartureDate) => onChange({ ...form, plannedDepartureDate })} />
          <TextInput label="Retorno planificado" type="datetime-local" value={form.plannedReturnDate} onChange={(plannedReturnDate) => onChange({ ...form, plannedReturnDate })} />
          <label className="xui-field xui-field-full">
            <span>Objetivo</span>
            <textarea value={form.objective} onChange={(event) => onChange({ ...form, objective: event.target.value })} rows={4} />
          </label>
        </div>
        <div className="xui-person-picks">
          {people.map((person) => (
            <button
              key={person.id}
              className={form.participantIds.includes(person.id) ? 'is-active' : ''}
              type="button"
              onClick={() => onToggleParticipant(person.id)}
            >
              <strong>{fullName(person)}</strong>
              <span>{person.occupationId ? occupationById.get(person.occupationId) : person.occupation?.name ?? 'Sin ocupacion'}</span>
            </button>
          ))}
        </div>
        <div className="xui-actions">
          <button type="button" onClick={onSubmit} disabled={submitState === 'saving'}>
            {submitState === 'saving' ? 'CREANDO...' : 'CREAR EXPEDICION'}
          </button>
          {submitState === 'error' && <span>Revise los datos requeridos o la respuesta del backend.</span>}
          {submitState === 'saved' && <span>Expedicion sincronizada.</span>}
        </div>
      </section>
    </div>
  )
}

function ListView({
  expeditions,
  selectedId,
  onSelect,
}: {
  expeditions: AdminExpeditionRecord[]
  selectedId: number | null
  onSelect: (id: number) => void
}) {
  return (
    <section className="xui-panel xui-full">
      <PanelTitle kicker="Registro real" title="Lista de expediciones" />
      <ExpeditionTable expeditions={expeditions} onSelect={onSelect} selectedId={selectedId} />
    </section>
  )
}

function PeopleView({
  people,
  occupationById,
}: {
  people: Person[]
  occupationById: Map<number, string>
}) {
  return (
    <section className="xui-panel xui-full">
      <PanelTitle kicker="Personal del campamento" title="Personas disponibles" />
      <div className="xui-person-grid">
        {people.map((person) => (
          <article key={person.id}>
            <img src={person.photoUrl ?? person.profileImage ?? person.avatar ?? ''} alt="" />
            <div>
              <strong>{fullName(person)}</strong>
              <span>{person.occupationId ? occupationById.get(person.occupationId) : person.occupation?.name ?? 'Sin ocupacion'}</span>
              <small>{person.status}</small>
            </div>
          </article>
        ))}
        {people.length === 0 && <p>No hay personas asociadas al campamento activo.</p>}
      </div>
    </section>
  )
}

function ResourcesView({
  resources,
  resourceTypeById,
}: {
  resources: CampResourceItem[]
  resourceTypeById: Map<number, ResourceType>
}) {
  return (
    <section className="xui-panel xui-full">
      <PanelTitle kicker="Inventario conectado" title="Recursos del campamento" />
      <div className="xui-resource-grid">
        {resources.map((item) => {
          const type = resourceTypeById.get(item.resourceTypeId)
          return (
            <article key={`${item.campId}-${item.resourceTypeId}`}>
              <small>{type?.category ?? 'RECURSO'}</small>
              <strong>{type?.name ?? `Tipo #${item.resourceTypeId}`}</strong>
              <span>
                {item.quantity} {type?.unit ?? ''}
              </span>
            </article>
          )
        })}
        {resources.length === 0 && <p>No hay inventario registrado para el campamento activo.</p>}
      </div>
    </section>
  )
}

function PanelTitle({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div className="xui-panel-title">
      <span>{kicker}</span>
      <h2>{title}</h2>
    </div>
  )
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="xui-kpi">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}

function TextInput({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
}) {
  return (
    <label className="xui-field">
      <span>{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? { label: status, color: '#A4C2C5' }
  return (
    <span className="xui-status" style={{ borderColor: meta.color, color: meta.color }}>
      {meta.label}
    </span>
  )
}

function ExpeditionTable({
  expeditions,
  onSelect,
  selectedId,
}: {
  expeditions: AdminExpeditionRecord[]
  onSelect: (id: number) => void
  selectedId?: number | null
}) {
  return (
    <div className="xui-table-wrap">
      <table className="xui-table">
        <thead>
          <tr>
            <th>Operacion</th>
            <th>Estado</th>
            <th>Destino</th>
            <th>Salida</th>
            <th>Equipo</th>
          </tr>
        </thead>
        <tbody>
          {expeditions.map((item) => {
            const record = readRecord(item)
            const destination = expeditionDestination(item)
            const participantCount = Array.isArray(item.participants)
              ? item.participants.length
              : Array.isArray(item.members)
                ? item.members.length
                : numberValue(record.participantsCount ?? record.participantCount) ?? 0
            return (
              <tr
                key={item.id}
                className={selectedId === item.id ? 'is-selected' : ''}
                onClick={() => onSelect(item.id)}
              >
                <td>
                  <strong>{getExpeditionTitle(item)}</strong>
                  <small>{getExpeditionObjective(item)}</small>
                </td>
                <td><StatusBadge status={normalizeStatus(item.status ?? item.expeditionStatus)} /></td>
                <td>{destination.label}</td>
                <td>{formatDateTime(record.plannedDepartureDate as string | undefined ?? record.departureDate as string | undefined ?? record.createdAt as string | undefined)}</td>
                <td>{participantCount}</td>
              </tr>
            )
          })}
          {expeditions.length === 0 && (
            <tr>
              <td colSpan={5}>No hay expediciones reales asociadas al campamento activo.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
