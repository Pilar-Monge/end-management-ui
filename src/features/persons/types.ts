export type PersonStatus =
  | 'ACTIVE'
  | 'SICK'
  | 'INJURED'
  | 'ON_EXPEDITION'
  | 'OUTSIDE_CAMP'
  | 'INACTIVE'

export type AccountStatus = 'ACTIVE' | 'BLOCKED' | 'INACTIVE'

export interface Person {
  id: number
  userId?: number | null
  systemUserId?: number | null
  accountId?: number | null
  username?: string | null
  firstName: string
  lastName: string
  photoUrl?: string | null
  profileImage?: string | null
  avatar?: string | null
  photo?: string | null
  imageUrl?: string | null
  alias?: string
  age: number
  status: PersonStatus
  currentStatus?: PersonStatus
  campId: number
  occupationId: number
  achievementIds: number[]
  admissionDate: string
  notes?: string
  createdAt: string
  updatedAt: string
  accountStatus?: AccountStatus
}

export interface PersonWithStats extends Person {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  performanceScore: number
}

export interface PersonsStats {
  totalPersons: number
  activePersons: number
  injuredPersons: number
  missingPersons: number
  deceasedPersons: number
}

export interface CreatePersonRequest {
  firstName: string
  lastName: string
  alias?: string
  age: number
  campId: number
  occupationId: number
  achievementIds?: number[]
  notes?: string
}

export interface UpdatePersonRequest extends Partial<CreatePersonRequest> {
  status?: PersonStatus
  currentStatus?: PersonStatus
  accountStatus?: AccountStatus
}

export interface PersonStatusUpdateRequest {
  status: PersonStatus
  reason?: string
}

export interface ApiError {
  statusCode: number
  message: string
  field?: string
}
