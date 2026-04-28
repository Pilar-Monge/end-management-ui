export interface ResourceType {
  id: number
  name: string
  description: string
  category: 'CONSUMABLE' | 'EQUIPMENT' | 'TOOL' | 'MEDICINE' | 'FOOD' | 'OTHER'
  unit: string
  createdAt: string
  updatedAt: string
}

export interface CreateResourceTypeRequest {
  name: string
  description: string
  category: ResourceType['category']
  unit: string
}

export interface UpdateResourceTypeRequest extends Partial<CreateResourceTypeRequest> {}
export interface Occupation {
  id: number
  name: string
  description: string
  skills: string[]
  minimumExperience: number
  createdAt: string
  updatedAt: string
}

export interface CreateOccupationRequest {
  name: string
  description: string
  skills: string[]
  minimumExperience: number
}

export interface UpdateOccupationRequest extends Partial<CreateOccupationRequest> {}
export interface OccupationAssignmentCriteria {
  id: number
  occupationId: number
  criteriaName: string
  description: string
  weight: number
  evaluationType: 'MANDATORY' | 'OPTIONAL' | 'PREFERRED'
  createdAt: string
  updatedAt: string
}

export interface CreateOccupationAssignmentCriteriaRequest {
  occupationId: number
  criteriaName: string
  description: string
  weight: number
  evaluationType: OccupationAssignmentCriteria['evaluationType']
}

export interface UpdateOccupationAssignmentCriteriaRequest extends Partial<CreateOccupationAssignmentCriteriaRequest> {}
export type CreateOccupationCriteriaRequest = CreateOccupationAssignmentCriteriaRequest
export type UpdateOccupationCriteriaRequest = UpdateOccupationAssignmentCriteriaRequest
export interface Achievement {
  id: number
  name: string
  description: string
  icon: string
  points: number
  category: 'COMBAT' | 'EXPLORATION' | 'SURVIVAL' | 'LEADERSHIP' | 'INNOVATION' | 'TEAM'
  createdAt: string
  updatedAt: string
}

export interface CreateAchievementRequest {
  name: string
  description: string
  icon: string
  points: number
  category: Achievement['category']
}

export interface UpdateAchievementRequest extends Partial<CreateAchievementRequest> {}
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

export interface ApiError {
  statusCode: number
  message: string
  field?: string
}
export type CatalogState = 'loading' | 'empty' | 'error' | 'success'
