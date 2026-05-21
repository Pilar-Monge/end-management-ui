import type { Camp } from '../../camps/types'
import type { Person } from '../../persons/types'

export type ExpeditionStatus = 'PROGRAMADA' | 'EN CURSO' | 'REGRESANDO' | 'COMPLETADA'

export type ExpeditionMode =
  | 'map'
  | 'activeOps'
  | 'history'
  | 'resources'

export interface ExpeditionParticipant {
  id: number
  fullName: string
  roleLabel: string
  status: Person['status']
  age: number
  profileImage: string
  description: string
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

export interface MappedCampPoint {
  id: number
  name: string
  latitude: number
  longitude: number
  status: Camp['status']
  currentPopulation: number
  capacity: number
}
