import { useEffect, useMemo, useState } from 'react'
import { fetchCamps } from '../../camps/api/queries'
import { fetchPersons } from '../../persons/api/queries'
import { fetchOccupations } from '../../catalogs/api/queries'
import {
  assignExpeditionParticipants,
  listActiveExpeditions,
} from '../services'
import type { Camp } from '../../camps/types'
import type { Occupation } from '../../catalogs/types'
import type { Person } from '../../persons/types'
import type {
  ExpeditionParticipant,
  ExpeditionRecord,
  ExpeditionStatus,
  MappedCampPoint,
} from './types'

type UseExpeditionsStateArgs = {
  currentCampId: number
}

type ExpeditionsSnapshot = {
  camps: Camp[]
  persons: Person[]
  occupations: Occupation[]
  remoteExpeditions: ExpeditionRecord[]
  loadError: string | null
  fetchedAt: number
}

const NOW = new Date().toISOString()

const DEFAULT_CAMPS: Camp[] = [
  {
    id: 1,
    name: 'Campamento Alfa',
    description: 'Centro de mando principal',
    location: { latitude: 9.933, longitude: -84.083, zone: 'CR-Centro' },
    capacity: 240,
    currentPopulation: 189,
    status: 'ACTIVE',
    foundedAt: NOW,
    resources: [],
    defenseLevel: 7,
    commander: 1,
    watchers: 12,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 2,
    name: 'Campamento Boreal',
    description: 'Base avanzada norte',
    location: { latitude: 19.4326, longitude: -99.1332, zone: 'MX-Norte' },
    capacity: 120,
    currentPopulation: 87,
    status: 'ACTIVE',
    foundedAt: NOW,
    resources: [],
    defenseLevel: 6,
    commander: 2,
    watchers: 8,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 3,
    name: 'Campamento Delta',
    description: 'Punto de intercambio',
    location: { latitude: 40.4168, longitude: -3.7038, zone: 'EU-Oeste' },
    capacity: 140,
    currentPopulation: 103,
    status: 'COMPROMISED',
    foundedAt: NOW,
    resources: [],
    defenseLevel: 5,
    commander: 3,
    watchers: 7,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 4,
    name: 'Campamento Horizonte',
    description: 'Nodo logistico del sur',
    location: { latitude: -33.4489, longitude: -70.6693, zone: 'Sur-01' },
    capacity: 130,
    currentPopulation: 76,
    status: 'UNDER_CONSTRUCTION',
    foundedAt: NOW,
    resources: [],
    defenseLevel: 4,
    commander: 4,
    watchers: 5,
    createdAt: NOW,
    updatedAt: NOW,
  },
]

const DEFAULT_OCCUPATIONS: Occupation[] = [
  { id: 1, name: 'Explorador', description: 'Reconocimiento de campo', skills: ['navegacion'], minimumExperience: 1, createdAt: NOW, updatedAt: NOW },
  { id: 2, name: 'Medico de campo', description: 'Atencion de emergencia', skills: ['primeros auxilios'], minimumExperience: 2, createdAt: NOW, updatedAt: NOW },
  { id: 3, name: 'Operador logistico', description: 'Soporte de convoy', skills: ['inventario'], minimumExperience: 1, createdAt: NOW, updatedAt: NOW },
]

const DEFAULT_PERSONS: Person[] = [
  {
    id: 101,
    firstName: 'Mario',
    lastName: 'Hugo',
    alias: 'M.H',
    age: 31,
    status: 'ACTIVE',
    campId: 1,
    occupationId: 1,
    achievementIds: [],
    admissionDate: NOW,
    notes: 'Disponible',
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 102,
    firstName: 'Ana',
    lastName: 'Garcia',
    alias: 'A.G',
    age: 34,
    status: 'ACTIVE',
    campId: 1,
    occupationId: 2,
    achievementIds: [],
    admissionDate: NOW,
    notes: 'Disponible',
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 103,
    firstName: 'Luis',
    lastName: 'Soto',
    alias: 'L.S',
    age: 29,
    status: 'INJURED',
    campId: 2,
    occupationId: 1,
    achievementIds: [],
    admissionDate: NOW,
    notes: 'Lesion de rodilla',
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 104,
    firstName: 'Valeria',
    lastName: 'Mora',
    alias: 'V.M',
    age: 27,
    status: 'ACTIVE',
    campId: 3,
    occupationId: 3,
    achievementIds: [],
    admissionDate: NOW,
    notes: 'Disponible',
    createdAt: NOW,
    updatedAt: NOW,
  },
]

const DEFAULT_EXPEDITIONS: ExpeditionRecord[] = [
  {
    id: 9001,
    name: 'Expedicion Faro Norte',
    objective: 'Asegurar ruta de suministros medicos.',
    sector: 'Sector Boreal',
    day: 1,
    total: 4,
    status: 'EN CURSO',
    campId: 2,
    participantIds: [101, 102],
    createdLocally: false,
  },
]

const CACHE_TTL_MS = 2 * 60 * 1000
let expeditionsSnapshotCache: ExpeditionsSnapshot | null = null
let expeditionsLoadPromise: Promise<ExpeditionsSnapshot> | null = null

function mapExpeditionStatus(raw?: string): ExpeditionStatus {
  const normalized = (raw ?? '').toLowerCase()
  if (normalized.includes('complete') || normalized.includes('done')) return 'COMPLETADA'
  if (normalized.includes('return') || normalized.includes('regres')) return 'REGRESANDO'
  if (normalized.includes('plan') || normalized.includes('schedule') || normalized.includes('pending')) return 'PROGRAMADA'
  return 'EN CURSO'
}

function toParticipantLabel(person: Person): string {
  const fallback = person.alias && person.alias.trim().length > 0 ? person.alias : `Persona #${person.id}`
  const fullName = `${person.firstName ?? ''} ${person.lastName ?? ''}`.trim()
  return fullName.length > 0 ? fullName : fallback
}

function hasValidSnapshot(snapshot: ExpeditionsSnapshot | null) {
  if (!snapshot) return false
  return Date.now() - snapshot.fetchedAt < CACHE_TTL_MS
}

function mapRemoteExpeditions(records: any[], currentCampId: number): ExpeditionRecord[] {
  return records.map((expedition) => {
    const dayValue = Number(expedition.day ?? expedition.currentDay ?? 0)
    const totalValue = Number(expedition.total ?? expedition.totalDays ?? expedition.durationDays ?? 1)
    return {
      id: expedition.id,
      name: expedition.name ?? expedition.title ?? `EXPEDICION #${expedition.id}`,
      objective: expedition.objective ?? expedition.description ?? 'Objetivo sin detalle',
      sector: expedition.sector ?? expedition.location ?? 'Sector no definido',
      day: Number.isFinite(dayValue) ? dayValue : 0,
      total: Number.isFinite(totalValue) && totalValue > 0 ? totalValue : 1,
      status: mapExpeditionStatus(expedition.status ?? expedition.expeditionStatus),
      campId: currentCampId,
      participantIds: [],
      createdLocally: false,
    }
  })
}

async function fetchExpeditionsSnapshot(currentCampId: number): Promise<ExpeditionsSnapshot> {
  const [campsResult, personsResult, occupationsResult, activeExpeditionsResult] = await Promise.allSettled([
    fetchCamps(),
    fetchPersons(),
    fetchOccupations(),
    listActiveExpeditions().catch(() => []),
  ])

  const campsData =
    campsResult.status === 'fulfilled' && campsResult.value.length > 0
      ? campsResult.value
      : DEFAULT_CAMPS
  const personsData =
    personsResult.status === 'fulfilled' && personsResult.value.length > 0
      ? personsResult.value
      : DEFAULT_PERSONS
  const occupationsData =
    occupationsResult.status === 'fulfilled' && occupationsResult.value.length > 0
      ? occupationsResult.value
      : DEFAULT_OCCUPATIONS

  const activeExpeditions =
    activeExpeditionsResult.status === 'fulfilled' ? activeExpeditionsResult.value : []

  const hasOfflineFallback =
    campsResult.status !== 'fulfilled' ||
    personsResult.status !== 'fulfilled' ||
    occupationsResult.status !== 'fulfilled' ||
    activeExpeditionsResult.status !== 'fulfilled'

  const remoteExpeditions = mapRemoteExpeditions(activeExpeditions, currentCampId)

  const snapshot: ExpeditionsSnapshot = {
    camps: campsData,
    persons: personsData,
    occupations: occupationsData,
    remoteExpeditions: remoteExpeditions.length > 0 ? remoteExpeditions : DEFAULT_EXPEDITIONS,
    loadError: hasOfflineFallback ? 'Modo sin conexion: mostrando datos locales de respaldo.' : null,
    fetchedAt: Date.now(),
  }

  expeditionsSnapshotCache = snapshot
  return snapshot
}

export async function prefetchExpeditionsData(currentCampId: number): Promise<void> {
  if (hasValidSnapshot(expeditionsSnapshotCache)) return
  if (!expeditionsLoadPromise) {
    expeditionsLoadPromise = fetchExpeditionsSnapshot(currentCampId)
  }

  try {
    await expeditionsLoadPromise
  } finally {
    expeditionsLoadPromise = null
  }
}

export function useExpeditionsState({ currentCampId }: UseExpeditionsStateArgs) {
  const [isLoading, setIsLoading] = useState(!hasValidSnapshot(expeditionsSnapshotCache))
  const [isUpdatingParticipants, setIsUpdatingParticipants] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(expeditionsSnapshotCache?.loadError ?? null)
  const [camps, setCamps] = useState<Camp[]>(expeditionsSnapshotCache?.camps ?? [])
  const [persons, setPersons] = useState<Person[]>(expeditionsSnapshotCache?.persons ?? [])
  const [occupations, setOccupations] = useState<Occupation[]>(expeditionsSnapshotCache?.occupations ?? [])
  const [remoteExpeditions, setRemoteExpeditions] = useState<ExpeditionRecord[]>(
    expeditionsSnapshotCache?.remoteExpeditions ?? [],
  )
  const [localExpeditions, setLocalExpeditions] = useState<ExpeditionRecord[]>([])

  useEffect(() => {
    let mounted = true

    if (hasValidSnapshot(expeditionsSnapshotCache)) {
      setCamps(expeditionsSnapshotCache?.camps ?? [])
      setPersons(expeditionsSnapshotCache?.persons ?? [])
      setOccupations(expeditionsSnapshotCache?.occupations ?? [])
      setRemoteExpeditions(expeditionsSnapshotCache?.remoteExpeditions ?? [])
      setLoadError(expeditionsSnapshotCache?.loadError ?? null)
      setIsLoading(false)
    }

    const loadData = async () => {
      try {
        if (!hasValidSnapshot(expeditionsSnapshotCache)) {
          setIsLoading(true)
        }

        if (!expeditionsLoadPromise) {
          expeditionsLoadPromise = fetchExpeditionsSnapshot(currentCampId)
        }
        const snapshot = await expeditionsLoadPromise

        if (!mounted) return

        setCamps(snapshot.camps)
        setPersons(snapshot.persons)
        setOccupations(snapshot.occupations)
        setRemoteExpeditions(snapshot.remoteExpeditions)
        setLoadError(snapshot.loadError)
      } catch (error) {
        if (!mounted) return
        setLoadError('Modo sin conexion: mostrando datos locales de respaldo.')
        setCamps(DEFAULT_CAMPS)
        setPersons(DEFAULT_PERSONS)
        setOccupations(DEFAULT_OCCUPATIONS)
        setRemoteExpeditions(DEFAULT_EXPEDITIONS)
        console.error('Fallback expeditions mode', error)
      } finally {
        expeditionsLoadPromise = null
        if (mounted) setIsLoading(false)
      }
    }

    void loadData()
    return () => {
      mounted = false
    }
  }, [currentCampId])

  const participantsCatalog = useMemo<ExpeditionParticipant[]>(() => {
    const occupationsById = new Map(occupations.map((occupation) => [occupation.id, occupation.name]))
    return persons.map((person) => ({
      id: person.id,
      fullName: toParticipantLabel(person),
      roleLabel: occupationsById.get(person.occupationId) ?? `Rol #${person.occupationId}`,
      status: person.status,
      age: person.age,
      profileImage: `https://i.pravatar.cc/96?img=${(person.id % 69) + 1}`,
      description: person.notes?.trim() || 'Sin descripcion registrada.',
    }))
  }, [occupations, persons])

  const activeParticipants = useMemo(
    () => participantsCatalog.filter((person) => person.status === 'ACTIVE'),
    [participantsCatalog],
  )

  const injuredParticipants = useMemo(
    () => participantsCatalog.filter((person) => person.status === 'INJURED'),
    [participantsCatalog],
  )

  const mapPoints = useMemo<MappedCampPoint[]>(() => {
    return camps
      .filter((camp) => Number.isFinite(camp.location?.latitude) && Number.isFinite(camp.location?.longitude))
      .map((camp) => ({
        id: camp.id,
        name: camp.name,
        latitude: camp.location.latitude,
        longitude: camp.location.longitude,
        status: camp.status,
        currentPopulation: camp.currentPopulation,
        capacity: camp.capacity,
      }))
  }, [camps])

  const allExpeditions = useMemo(
    () => [...localExpeditions, ...remoteExpeditions],
    [localExpeditions, remoteExpeditions],
  )

  const activeExpeditions = useMemo(
    () => allExpeditions.filter((expedition) => expedition.status !== 'COMPLETADA'),
    [allExpeditions],
  )

  const historyExpeditions = useMemo(
    () => allExpeditions.filter((expedition) => expedition.status === 'COMPLETADA'),
    [allExpeditions],
  )

  const updateExpeditionParticipants = async (expeditionId: number, participantIds: number[]) => {
    const normalizedIds = Array.from(new Set(participantIds))

    const existsInLocal = localExpeditions.some((record) => record.id === expeditionId)
    if (existsInLocal) {
      setLocalExpeditions((prev) =>
        prev.map((record) =>
          record.id === expeditionId
            ? {
                ...record,
                participantIds: normalizedIds,
              }
            : record,
        ),
      )
      return { source: 'local' as const }
    }

    const existsInRemote = remoteExpeditions.some((record) => record.id === expeditionId)
    if (!existsInRemote) {
      return { source: 'missing' as const }
    }

    setRemoteExpeditions((prev) =>
      prev.map((record) =>
        record.id === expeditionId
          ? {
              ...record,
              participantIds: normalizedIds,
            }
          : record,
      ),
    )

    setIsUpdatingParticipants(true)
    try {
      await assignExpeditionParticipants(expeditionId, normalizedIds)
      return { source: 'remote' as const }
    } catch {
      return { source: 'local' as const }
    } finally {
      setIsUpdatingParticipants(false)
    }
  }

  return {
    isLoading,
    isUpdatingParticipants,
    loadError,
    camps,
    mapPoints,
    participantsCatalog,
    activeParticipants,
    injuredParticipants,
    activeExpeditions,
    historyExpeditions,
    allExpeditions,
    updateExpeditionParticipants,
  }
}
