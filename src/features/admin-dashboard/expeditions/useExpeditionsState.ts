import { useEffect, useMemo, useState } from 'react'
import { fetchCamps } from '../../camps/api/queries'
import { fetchPersons } from '../../persons/api/queries'
import { fetchOccupations } from '../../catalogs/api/queries'
import {
  assignExpeditionParticipants,
  createExpedition,
  listActiveExpeditions,
} from '../services'
import type { Camp } from '../../camps/types'
import type { Occupation } from '../../catalogs/types'
import type { Person } from '../../persons/types'
import type {
  ExpeditionDraft,
  ExpeditionParticipant,
  ExpeditionRecord,
  ExpeditionStatus,
  MappedCampPoint,
} from './types'

type UseExpeditionsStateArgs = {
  currentCampId: number
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

export function useExpeditionsState({ currentCampId }: UseExpeditionsStateArgs) {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [camps, setCamps] = useState<Camp[]>([])
  const [persons, setPersons] = useState<Person[]>([])
  const [occupations, setOccupations] = useState<Occupation[]>([])
  const [remoteExpeditions, setRemoteExpeditions] = useState<ExpeditionRecord[]>([])
  const [localExpeditions, setLocalExpeditions] = useState<ExpeditionRecord[]>([])

  useEffect(() => {
    let mounted = true

    const loadData = async () => {
      setIsLoading(true)
      setLoadError(null)
      try {
        const [campsResult, personsResult, occupationsResult, activeExpeditionsResult] = await Promise.allSettled([
          fetchCamps(),
          fetchPersons(),
          fetchOccupations(),
          listActiveExpeditions().catch(() => []),
        ])

        if (!mounted) return

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

        setLoadError(hasOfflineFallback ? 'Modo sin conexion: mostrando datos locales de respaldo.' : null)

        setCamps(campsData)
        setPersons(personsData)
        setOccupations(occupationsData)

        const mappedRemote = activeExpeditions.map((expedition) => {
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

        setRemoteExpeditions(mappedRemote.length > 0 ? mappedRemote : DEFAULT_EXPEDITIONS)
      } catch (error) {
        if (!mounted) return
        setLoadError('Modo sin conexion: mostrando datos locales de respaldo.')
        setCamps(DEFAULT_CAMPS)
        setPersons(DEFAULT_PERSONS)
        setOccupations(DEFAULT_OCCUPATIONS)
        setRemoteExpeditions(DEFAULT_EXPEDITIONS)
        console.error('Fallback expeditions mode', error)
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    void loadData()
    return () => {
      mounted = false
    }
  }, [currentCampId])

  const participantsCatalog = useMemo<ExpeditionParticipant[]>(() => {
    return persons.map((person) => ({
      id: person.id,
      fullName: toParticipantLabel(person),
      roleLabel: occupations.find((occupation) => occupation.id === person.occupationId)?.name ?? `Rol #${person.occupationId}`,
      status: person.status,
      age: person.age,
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

  const createLocalExpedition = (draft: ExpeditionDraft) => {
    const nextId = Date.now()
    const record: ExpeditionRecord = {
      id: nextId,
      name: draft.name,
      objective: draft.objective,
      sector: draft.sector,
      day: 0,
      total: draft.total,
      status: 'PROGRAMADA',
      campId: draft.campId,
      participantIds: draft.participantIds,
      createdLocally: true,
    }
    setLocalExpeditions((prev) => [record, ...prev])
    return record
  }

  const createExpeditionWithFallback = async (draft: ExpeditionDraft) => {
    setIsSaving(true)
    try {
      const remoteRecord = await createExpedition({
        name: draft.name,
        objective: draft.objective,
        sector: draft.sector,
        totalDays: draft.total,
        campId: draft.campId,
        participantIds: draft.participantIds,
      })

      const dayValue = Number(remoteRecord.day ?? remoteRecord.currentDay ?? 0)
      const totalValue = Number(remoteRecord.total ?? remoteRecord.totalDays ?? remoteRecord.durationDays ?? draft.total)

      const mappedRecord: ExpeditionRecord = {
        id: remoteRecord.id,
        name: remoteRecord.name ?? remoteRecord.title ?? draft.name,
        objective: remoteRecord.objective ?? remoteRecord.description ?? draft.objective,
        sector: remoteRecord.sector ?? remoteRecord.location ?? draft.sector,
        day: Number.isFinite(dayValue) ? dayValue : 0,
        total: Number.isFinite(totalValue) && totalValue > 0 ? totalValue : draft.total,
        status: mapExpeditionStatus(remoteRecord.status ?? remoteRecord.expeditionStatus),
        campId: draft.campId,
        participantIds: draft.participantIds,
        createdLocally: false,
      }

      let participantAssignmentWarning = false
      if (draft.participantIds.length > 0) {
        try {
          await assignExpeditionParticipants(remoteRecord.id, draft.participantIds)
        } catch {
          participantAssignmentWarning = true
        }
      }

      setRemoteExpeditions((prev) => [mappedRecord, ...prev])

      return {
        record: mappedRecord,
        source: 'remote' as const,
        participantAssignmentWarning,
      }
    } catch {
      const localRecord = createLocalExpedition(draft)
      return {
        record: localRecord,
        source: 'local' as const,
        participantAssignmentWarning: false,
      }
    } finally {
      setIsSaving(false)
    }
  }

  return {
    isLoading,
    isSaving,
    loadError,
    camps,
    mapPoints,
    participantsCatalog,
    activeParticipants,
    injuredParticipants,
    activeExpeditions,
    historyExpeditions,
    allExpeditions,
    createLocalExpedition,
    createExpeditionWithFallback,
  }
}
