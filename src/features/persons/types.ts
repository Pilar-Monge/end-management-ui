export type PersonStatus =
  | 'ACTIVE'
  | 'SICK'
  | 'INJURED'
  | 'ON_EXPEDITION'
  | 'OUTSIDE_CAMP'
  | 'INACTIVE'

export type AccountStatus = 'ACTIVE' | 'BLOCKED' | 'INACTIVE'
export type Gender = 'MALE' | 'FEMALE' | 'OTHER'
export type SystemRole = 'WORKER' | 'RESOURCE_MANAGEMENT' | 'TRAVEL_MANAGER' | 'SYSTEM_ADMIN'
export type SystemUserStatus = 'ACTIVE' | 'BLOCKED' | 'INACTIVE'

export interface Person {
  id: number
  userId?: number | null
  systemUserId?: number | null
  accountId?: number | null
  username?: string | null
  name?: string
  lastName1?: string | null
  lastName2?: string | null
  identificationNumber?: string
  birthDate?: string
  gender?: Gender
  firstName: string
  lastName: string
  photoUrl?: string | null
  profileImage?: string | null
  avatar?: string | null
  photo?: string | null
  imageUrl?: string | null
  imageSignedUrl?: string | null
  alias?: string
  age: number
  status: PersonStatus
  currentStatus?: PersonStatus
  campId: number
  occupationId: number | null
  occupation?: {
    id: number
    name: string
    description?: string | null
  } | null
  character?: number
  achievementIds: number[]
  admissionDate: string
  notes?: string
  createdAt: string
  updatedAt: string
  accountStatus?: AccountStatus
  accountRole?: SystemRole
}

export interface PersonWithStats extends Person {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  performanceScore: number
}

export interface SystemUser {
  id: number
  personId: number | null
  requestId?: number | null
  username: string
  email?: string
  status: SystemUserStatus
  role: SystemRole
  campId: number
  createdAt?: string
  updatedAt?: string
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

export interface UpdatePersonRequest {
  name?: string
  lastName1?: string
  lastName2?: string | null
  identificationNumber?: string
  birthDate?: string
  gender?: Gender
  occupationId?: number | null
  currentStatus?: PersonStatus
  character?: number
}

export interface UpdateSystemUserRequest {
  role?: SystemRole
  status?: SystemUserStatus
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
