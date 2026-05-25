export interface AdminAdmissionRequest {
  id: number
  status?: string
  name?: string
  lastName1?: string
  lastName2?: string
  nombre?: string
  primer_apellido?: string
  segundo_apellido?: string
  profession?: string
  ocupacion?: string
  score?: number
  ia_score?: number
  habilidades?: string[] | string
  skills?: string[] | string
  reason?: string
  rejectionReason?: string
  condicion?: string
  physicalCondition?: string
  salud?: string
  declaredHealthLevel?: string
  experiencia?: string
  declaredSkills?: string
  finalOccupationId?: number
  suggestedOccupationId?: number
  oficioFinalId?: number
  oficioSugeridoId?: number
  finalRole?: string
  rolFinal?: string
  sospechoso?: boolean
  suspicious?: boolean
}

export interface CampInventoryEntry {
  campId: number
  resourceTypeId: number
  quantity: number
  updatedAt?: string
}

export interface InventoryDashboardPayload {
  [key: string]: unknown
}

export interface AdminNotificationRecord {
  id: number
  title?: string
  body?: string
  message?: string
  description?: string
  level?: string
  severity?: string
  type?: string
  read?: boolean
  isRead?: boolean
  createdAt?: string
  updatedAt?: string
  createdDate?: string
  readDate?: string
}

export interface AdminExpeditionRecord {
  id: number
  name?: string
  title?: string
  objective?: string
  description?: string
  status?: string
  expeditionStatus?: string
  sector?: string
  location?: string
  day?: number
  currentDay?: number
  total?: number
  totalDays?: number
  durationDays?: number
  participants?: string[]
  members?: string[]
}

export interface GeneralDashboardPayload {
  [key: string]: unknown
}

export interface ExpeditionsDashboardPayload {
  [key: string]: unknown
}

export interface IntercampRecord {
  id: number
  originCampId?: number
  destinationCampId?: number
  description?: string
  createdDate?: string
  responseDate?: string
  fromCamp?: string
  from?: string
  toCamp?: string
  title?: string
  message?: string
  text?: string
  status?: string
  urgency?: string
  urgent?: boolean
  type?: string
  createdAt?: string
  updatedAt?: string
}

export interface InventoryMovementRecord {
  id: number
  resourceTypeId?: number
  resourceTypeName?: string
  resourceName?: string
  resource?: string
  quantity?: number
  amount?: number
  movementType?: string
  type?: string
  reason?: string
  description?: string
  createdAt?: string
  date?: string
}

export interface AuditRecord {
  id: number
  [key: string]: unknown
}
