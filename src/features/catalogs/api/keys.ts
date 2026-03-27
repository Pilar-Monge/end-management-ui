

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';
export const catalogsKeys = {
  all: ['catalogs'] as const,
  resourceTypes: () => [...catalogsKeys.all, 'resource-types'] as const,
  resourceType: (id: number) => [...catalogsKeys.resourceTypes(), id] as const,
  occupations: () => [...catalogsKeys.all, 'occupations'] as const,
  occupation: (id: number) => [...catalogsKeys.occupations(), id] as const,
  criteria: () => [...catalogsKeys.all, 'occupation-criteria'] as const,
  criterion: (id: number) => [...catalogsKeys.criteria(), id] as const,
  achievements: () => [...catalogsKeys.all, 'achievements'] as const,
  achievement: (id: number) => [...catalogsKeys.achievements(), id] as const,
};
export const ENDPOINTS = {
  resourceTypes: `${BASE_URL}/resource-types`,
  occupations: `${BASE_URL}/occupations`,
  criteria: `${BASE_URL}/occupation-assignment-criteria`,
  achievements: `${BASE_URL}/achievements`,
};

export const getCatalogEndpoint = (resource: 'resource-types' | 'occupations' | 'occupation-assignment-criteria' | 'achievements', id?: number) => {
  const base = ENDPOINTS[resource as keyof typeof ENDPOINTS];
  return id ? `${base}/${id}` : base;
};
