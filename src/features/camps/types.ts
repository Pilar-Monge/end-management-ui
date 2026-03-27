export interface Camp {
  id: number;
  name: string;
  description: string;
  location: LocationCoords;
  capacity: number;
  currentPopulation: number;
  status: 'ACTIVE' | 'ABANDONED' | 'COMPROMISED' | 'UNDER_CONSTRUCTION';
  foundedAt: string;
  resources: CampResource[];
  defenseLevel: number;
  commander: number;
  watchers: number;
  createdAt: string;
  updatedAt: string;
}

export interface LocationCoords {
  latitude: number;
  longitude: number;
  altitude?: number;
  zone?: string;
}

export interface CampResource {
  resourceTypeId: number;
  quantity: number;
  lastUpdated: string;
}
export interface CreateCampRequest {
  name: string;
  description: string;
  location: LocationCoords;
  capacity: number;
  defenseLevel?: number;
  watchers?: number;
}

export interface UpdateCampRequest extends Partial<CreateCampRequest> {}
export interface CampResourceRequest {
  campId: number;
  resourceTypeId: number;
  quantity: number;
}

export interface UpdateCampResourceRequest {
  resourceTypeId: number;
  quantity: number;
}
export interface CampStatusUpdateRequest {
  status: Camp['status'];
  reason?: string;
}
export interface CampAssignmentRequest {
  campId: number;
  personId: number;
  roleInCamp?: string;
}
export interface CampWithStats extends Camp {
  totalResources: number;
  resourceTypes: number;
  utilizationPercent: number;
  threatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface ApiError {
  statusCode: number;
  message: string;
  field?: string;
}
export type CampState = 'loading' | 'empty' | 'error' | 'success';
