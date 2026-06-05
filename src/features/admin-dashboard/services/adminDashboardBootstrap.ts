import { fetchCamps } from '../../camps/api/queries'
import type { Camp } from '../../camps/types'
import { fetchOccupations } from '../../catalogs/api/queries'
import type { Occupation } from '../../catalogs/types'
import { fetchPersons } from '../../persons/api/queries'
import type { Person } from '../../persons/types'
import { ApiHttpError } from '../../../shared/services/httpClient'
import {
  extractNumberByHint,
  mapAdmissionFromApi,
  mapExpeditionFromApi,
  mapIntercampFromApi,
} from '../mappers/adminMappers'
import {
  type AdminAdmissionRequest,
  type AdminExpeditionRecord,
  type GeneralDashboardPayload,
  type InventoryDashboardPayload,
  type ExpeditionsDashboardPayload,
  type IntercampRecord,
} from './types'
import { listAdmissionRequests } from './admissionRequests.service'
import { getExpeditionsDashboard, getGeneralDashboard, getInventoryDashboard } from './dashboard.service'
import { listExpeditions } from './expeditions.service'
import { listIntercampRequests } from './intercamp.service'

export const ADMIN_DASHBOARD_BOOT_MIN_MS = 1400
export const ADMIN_DASHBOARD_BOOT_MAX_VISUAL_LEAD = 8

type AdminDashboardBootStep = 'persons' | 'admissions' | 'intercamp' | 'session'

const BOOT_STEP_WEIGHTS: Record<AdminDashboardBootStep, number> = {
  persons: 25,
  admissions: 25,
  intercamp: 25,
  session: 25,
}

export interface DashboardKpi {
  populationTotal: number
  criticalResources: number
  activeExpeditions: number
  pendingIntercamp: number
  activePopulation: number
  injuredPopulation: number
  sickPopulation: number
  outPopulation: number
}

export interface UiAdmission {
  id: number
  name: string
  profession: string
  score: number
  badge: string | null
  status: 'pending' | 'approved' | 'rejected'
  workflowStatus: 'PENDING_AI' | 'PENDING_ADMIN' | 'APPROVED' | 'REJECTED'
  skills: string[]
  reason: string
  suggestedOccupationId?: number
  finalOccupationId?: number
  rejectionReason?: string
}

export interface UiExpedition {
  id: number
  name: string
  day: number
  total: number
  participants: string[]
  status: 'EN CURSO' | 'PROGRAMADA' | 'REGRESANDO' | 'COMPLETADA'
  objective: string
  sector: string
}

export interface UiIntercampRequest {
  id: number
  from: string
  text: string
  time: string
  status: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'CONFIRMADO'
  urgent: boolean
  type: 'solicitud' | 'traslado' | 'oferta'
}

export interface AdminDashboardBootstrapData {
  persons: Person[]
  camps: Camp[]
  occupations: Occupation[]
  admissions: UiAdmission[]
  expeditions: UiExpedition[]
  intercampRequests: UiIntercampRequest[]
  dashboardKpi: DashboardKpi
  criticalFailedCount: number
  readOnlySkippedCount: number
}

export interface AdminDashboardBootProgress {
  progress: number
  phase: string
}

interface BootstrapOptions {
  onProgress?: (progress: AdminDashboardBootProgress) => void
}

export const INITIAL_DASHBOARD_KPI: DashboardKpi = {
  populationTotal: 0,
  criticalResources: 0,
  activeExpeditions: 0,
  pendingIntercamp: 0,
  activePopulation: 0,
  injuredPopulation: 0,
  sickPopulation: 0,
  outPopulation: 0,
}

function buildDashboardKpi({
  personsData,
  expeditionsData,
  intercampData,
  generalDashboard,
  inventoryDashboard,
  expeditionsDashboard,
}: {
  personsData: Person[]
  expeditionsData: AdminExpeditionRecord[]
  intercampData: IntercampRecord[]
  generalDashboard: GeneralDashboardPayload
  inventoryDashboard: InventoryDashboardPayload
  expeditionsDashboard: ExpeditionsDashboardPayload
}): DashboardKpi {
  return {
    populationTotal: extractNumberByHint(generalDashboard, ['population', 'persons', 'totalpeople', 'total'], personsData.length),
    criticalResources: extractNumberByHint(inventoryDashboard, ['critical', 'alert', 'low'], 0),
    activeExpeditions: extractNumberByHint(expeditionsDashboard, ['active', 'ongoing'], expeditionsData.length),
    pendingIntercamp: extractNumberByHint(generalDashboard, ['intercamp', 'transfer', 'pending'], intercampData.length),
    activePopulation: extractNumberByHint(
      generalDashboard,
      ['active', 'healthy'],
      personsData.filter((person) => person.status === 'ACTIVE').length,
    ),
    injuredPopulation: extractNumberByHint(
      generalDashboard,
      ['injured'],
      personsData.filter((person) => person.status === 'INJURED').length,
    ),
    sickPopulation: extractNumberByHint(generalDashboard, ['sick', 'ill'], 0),
    outPopulation: extractNumberByHint(
      generalDashboard,
      ['missing', 'outside', 'out'],
      personsData.filter((person) => person.status === 'OUTSIDE_CAMP' || person.status === 'ON_EXPEDITION').length,
    ),
  }
}

export async function bootstrapAdminDashboard(options: BootstrapOptions = {}): Promise<AdminDashboardBootstrapData> {
  let progressAccumulator = 0
  let criticalFailedCount = 0
  let readOnlySkippedCount = 0

  const completeBootStep = (step: AdminDashboardBootStep, phase: string) => {
    progressAccumulator = Math.min(100, progressAccumulator + BOOT_STEP_WEIGHTS[step])
    options.onProgress?.({ progress: progressAccumulator, phase })
  }

  const safeRunCritical = async <T,>(runner: () => Promise<T>, fallback: T): Promise<T> => {
    try {
      return await runner()
    } catch {
      criticalFailedCount += 1
      return fallback
    }
  }

  const safeRunReadOnly = async <T,>(runner: () => Promise<T>, fallback: T): Promise<T> => {
    try {
      return await runner()
    } catch (error) {
      if (error instanceof ApiHttpError && (error.statusCode === 401 || error.statusCode === 403 || error.statusCode === 404)) {
        readOnlySkippedCount += 1
        return fallback
      }
      throw error
    }
  }

  options.onProgress?.({ progress: 0, phase: 'Inicializando consola tactica...' })

  const [
    personsData,
    campsData,
    occupationsData,
    admissionsData,
    expeditionsData,
    intercampData,
    generalDashboard,
    inventoryDashboard,
    expeditionsDashboard,
  ] = await Promise.all([
    safeRunCritical(async () => {
      const value = await fetchPersons()
      completeBootStep('persons', 'Sincronizando poblacion...')
      return value
    }, [] as Awaited<ReturnType<typeof fetchPersons>>),
    safeRunCritical(fetchCamps, [] as Awaited<ReturnType<typeof fetchCamps>>),
    safeRunCritical(fetchOccupations, [] as Awaited<ReturnType<typeof fetchOccupations>>),
    safeRunCritical(async () => {
      const value = await listAdmissionRequests()
      completeBootStep('admissions', 'Procesando admisiones IA...')
      return value
    }, [] as AdminAdmissionRequest[]),
    safeRunReadOnly(listExpeditions, [] as AdminExpeditionRecord[]),
    safeRunReadOnly(async () => {
      const value = await listIntercampRequests()
      completeBootStep('intercamp', 'Conectando inter-campamentos...')
      return value
    }, [] as IntercampRecord[]),
    safeRunCritical(getGeneralDashboard, {} as GeneralDashboardPayload),
    safeRunCritical(getInventoryDashboard, {} as InventoryDashboardPayload),
    safeRunCritical(getExpeditionsDashboard, {} as ExpeditionsDashboardPayload),
  ])

  const dashboardKpi = buildDashboardKpi({
    personsData,
    expeditionsData,
    intercampData,
    generalDashboard,
    inventoryDashboard,
    expeditionsDashboard,
  })

  completeBootStep('session', 'Validando sesion y perfil...')

  return {
    persons: personsData,
    camps: campsData,
    occupations: occupationsData,
    admissions: admissionsData.map((item) => mapAdmissionFromApi(item)),
    expeditions: expeditionsData.map((item) => mapExpeditionFromApi(item)),
    intercampRequests: intercampData.map((item) => mapIntercampFromApi(item)),
    dashboardKpi,
    criticalFailedCount,
    readOnlySkippedCount,
  }
}
