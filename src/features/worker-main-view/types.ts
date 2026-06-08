export interface WorkerAuthenticatedUser {
  id: number
  username: string
  role: string
  campId: number | null
}

export type ExpeditionStatus =
  | 'PLANNED'
  | 'IN_PROGRESS'
  | 'DELAYED'
  | 'COMPLETED'
  | 'LOST'
  | 'RETURNED_AFTER_LOST'
  | 'CANCELED'

export interface CurrentUserProfile {
  id: number
  username: string
  email: string
  role: 'WORKER' | 'RESOURCE_MANAGEMENT' | 'TRAVEL_MANAGER' | 'SYSTEM_ADMIN'
  status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED'
  campId: number
}

export interface WorkerNotification {
  id: number
  campId: number
  userId: number | null
  targetRole: 'WORKER' | 'RESOURCE_MANAGEMENT' | 'TRAVEL_MANAGER' | 'SYSTEM_ADMIN' | null
  type: string
  title: string
  message: string
  read: boolean
  createdDate: string
  readDate: string | null
  sourceType: string | null
  sourceId: number | null
}

export interface PaginationInfo {
  page: number
  limit: number
  total: number
  pages: number
}

export interface WorkerOccupation {
  id: number
  name: string
  description: string | null
  collectsResources: boolean
  participatesInExpeditions: boolean
  resourceTypeId: number | null
  dailyAmountProduced: string
  dailyRationConsumed: string
  minimumRequiredWorkers: number
  preferredWorkers: number | null
  criticalThresholdPercent: string
  createdAt: string
}

export interface WorkerDailyCollectionRecord {
  id: number
  campId: number
  personId: number
  resourceTypeId: number
  date: string
  expectedAmount: string
  actualAmount: string
  differenceReason: string | null
  recordedBy: number
  movementId: number | null
}

export interface WorkerOccupationCoverage {
  occupationId: number
  occupationName: string
  minimumRequiredWorkers: number
  preferredWorkers: number | null
  criticalThresholdPercent: string
  availableWorkers: number
  activeWorkers: number
  coveragePercent: number
  isCritical: boolean
  isAtRisk: boolean
  deficit: number
  surplus: number
  campId: number
}

export interface WorkerOccupationAtRisk {
  occupationId: number
  occupationName: string
  campId: number
  availableWorkers: number
  minimumRequired: number
  coveragePercent: number
  suggestedReplacements: WorkerReplacementSuggestion[]
}

export interface WorkerReplacementSuggestion {
  personId: number
  personName: string
  currentOccupationId: number
  currentOccupationName: string
  targetOccupationId: number
  targetOccupationName: string
  reason: string
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
}

export interface WorkerAutoAssignmentResult {
  success: boolean
  message: string
  assignedPerson?: {
    id: number
    name: string
    fromOccupation: string
    toOccupation: string
  }
}