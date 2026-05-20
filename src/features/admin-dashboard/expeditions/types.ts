import type { Camp } from '../../camps/types'
import type { Person } from '../../persons/types'

export type ExpeditionStatus = 'PROGRAMADA' | 'EN CURSO' | 'REGRESANDO' | 'COMPLETADA'

export type ExpeditionMode =
  | 'map'
  | 'create'
  | 'participants'
  | 'activeOps'
  | 'history'
  | 'resources'

export interface ExpeditionParticipant {
  id: number
  fullName: string
  roleLabel: string
  status: Person['status']
  age: number
}

export interface ExpeditionRecord {
  id: number
  name: string
  objective: string
  sector: string
  day: number
  total: number
  status: ExpeditionStatus
  campId: number
  participantIds: number[]
  createdLocally: boolean
}

export interface ExpeditionDraft {
  name: string
  objective: string
  sector: string
  total: number
  campId: number
  participantIds: number[]
}

export interface MappedCampPoint {
  id: number
  name: string
  latitude: number
  longitude: number
  status: Camp['status']
  currentPopulation: number
  capacity: number
}
