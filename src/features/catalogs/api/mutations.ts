
import { useMutation, type UseMutationOptions, useQueryClient } from '@tanstack/react-query';
import type {
  ResourceType,
  CreateResourceTypeRequest,
  UpdateResourceTypeRequest,
  Occupation,
  CreateOccupationRequest,
  UpdateOccupationRequest,
  OccupationAssignmentCriteria,
  CreateOccupationAssignmentCriteriaRequest,
  UpdateOccupationAssignmentCriteriaRequest,
  Achievement,
  CreateAchievementRequest,
  UpdateAchievementRequest,
  ApiError,
} from '../types';
import { catalogsKeys, ENDPOINTS } from './keys';

const getToken = () => localStorage.getItem('token');

const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken()}`,
};
export async function createResourceType(data: CreateResourceTypeRequest): Promise<ResourceType> {
  const res = await fetch(ENDPOINTS.resourceTypes, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create resource type');
  return res.json();
}

export function useCreateResourceType(
  options?: Omit<UseMutationOptions<ResourceType, ApiError, CreateResourceTypeRequest>, 'mutationFn'>,
) {
  const queryClient = useQueryClient();
  return useMutation<ResourceType, ApiError, CreateResourceTypeRequest>({
    mutationFn: createResourceType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: catalogsKeys.resourceTypes() });
    },
    ...options,
  });
}

export async function updateResourceType(
  id: number,
  data: UpdateResourceTypeRequest,
): Promise<ResourceType> {
  const res = await fetch(`${ENDPOINTS.resourceTypes}/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update resource type');
  return res.json();
}

export function useUpdateResourceType(
  options?: Omit<
    UseMutationOptions<ResourceType, ApiError, { id: number; data: UpdateResourceTypeRequest }>,
    'mutationFn'
  >,
) {
  const queryClient = useQueryClient();
  return useMutation<ResourceType, ApiError, { id: number; data: UpdateResourceTypeRequest }>({
    mutationFn: (params: { id: number; data: UpdateResourceTypeRequest }) => updateResourceType(params.id, params.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: catalogsKeys.resourceTypes() });
    },
    ...options,
  });
}

export async function deleteResourceType(id: number): Promise<void> {
  const res = await fetch(`${ENDPOINTS.resourceTypes}/${id}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) throw new Error('Failed to delete resource type');
}

export function useDeleteResourceType(
  options?: Omit<UseMutationOptions<void, ApiError, number>, 'mutationFn'>,
) {
  const queryClient = useQueryClient();
  return useMutation<void, ApiError, number>({
    mutationFn: deleteResourceType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: catalogsKeys.resourceTypes() });
    },
    ...options,
  });
}
export async function createOccupation(data: CreateOccupationRequest): Promise<Occupation> {
  const res = await fetch(ENDPOINTS.occupations, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create occupation');
  return res.json();
}

export function useCreateOccupation(
  options?: Omit<UseMutationOptions<Occupation, ApiError, CreateOccupationRequest>, 'mutationFn'>,
) {
  const queryClient = useQueryClient();
  return useMutation<Occupation, ApiError, CreateOccupationRequest>({
    mutationFn: createOccupation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: catalogsKeys.occupations() });
    },
    ...options,
  });
}

export async function updateOccupation(
  id: number,
  data: UpdateOccupationRequest,
): Promise<Occupation> {
  const res = await fetch(`${ENDPOINTS.occupations}/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update occupation');
  return res.json();
}

export function useUpdateOccupation(
  options?: Omit<
    UseMutationOptions<Occupation, ApiError, { id: number; data: UpdateOccupationRequest }>,
    'mutationFn'
  >,
) {
  const queryClient = useQueryClient();
  return useMutation<Occupation, ApiError, { id: number; data: UpdateOccupationRequest }>({
    mutationFn: (params: { id: number; data: UpdateOccupationRequest }) => updateOccupation(params.id, params.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: catalogsKeys.occupations() });
    },
    ...options,
  });
}

export async function deleteOccupation(id: number): Promise<void> {
  const res = await fetch(`${ENDPOINTS.occupations}/${id}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) throw new Error('Failed to delete occupation');
}

export function useDeleteOccupation(
  options?: Omit<UseMutationOptions<void, ApiError, number>, 'mutationFn'>,
) {
  const queryClient = useQueryClient();
  return useMutation<void, ApiError, number>({
    mutationFn: deleteOccupation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: catalogsKeys.occupations() });
    },
    ...options,
  });
}
export async function createOccupationCriteria(
  data: CreateOccupationAssignmentCriteriaRequest,
): Promise<OccupationAssignmentCriteria> {
  const res = await fetch(ENDPOINTS.criteria, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create criteria');
  return res.json();
}

export function useCreateOccupationCriteria(
  options?: Omit<
    UseMutationOptions<OccupationAssignmentCriteria, ApiError, CreateOccupationAssignmentCriteriaRequest>,
    'mutationFn'
  >,
) {
  const queryClient = useQueryClient();
  return useMutation<OccupationAssignmentCriteria, ApiError, CreateOccupationAssignmentCriteriaRequest>({
    mutationFn: createOccupationCriteria,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: catalogsKeys.criteria() });
    },
    ...options,
  });
}

export async function updateOccupationCriteria(
  id: number,
  data: UpdateOccupationAssignmentCriteriaRequest,
): Promise<OccupationAssignmentCriteria> {
  const res = await fetch(`${ENDPOINTS.criteria}/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update criteria');
  return res.json();
}

export function useUpdateOccupationCriteria(
  options?: Omit<
    UseMutationOptions<
      OccupationAssignmentCriteria,
      ApiError,
      { id: number; data: UpdateOccupationAssignmentCriteriaRequest }
    >,
    'mutationFn'
  >,
) {
  const queryClient = useQueryClient();
  return useMutation<
    OccupationAssignmentCriteria,
    ApiError,
    { id: number; data: UpdateOccupationAssignmentCriteriaRequest }
  >({
    mutationFn: (params: { id: number; data: UpdateOccupationAssignmentCriteriaRequest }) => updateOccupationCriteria(params.id, params.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: catalogsKeys.criteria() });
    },
    ...options,
  });
}

export async function deleteOccupationCriteria(id: number): Promise<void> {
  const res = await fetch(`${ENDPOINTS.criteria}/${id}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) throw new Error('Failed to delete criteria');
}

export function useDeleteOccupationCriteria(
  options?: Omit<UseMutationOptions<void, ApiError, number>, 'mutationFn'>,
) {
  const queryClient = useQueryClient();
  return useMutation<void, ApiError, number>({
    mutationFn: deleteOccupationCriteria,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: catalogsKeys.criteria() });
    },
    ...options,
  });
}
export async function createAchievement(data: CreateAchievementRequest): Promise<Achievement> {
  const res = await fetch(ENDPOINTS.achievements, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create achievement');
  return res.json();
}

export function useCreateAchievement(
  options?: Omit<UseMutationOptions<Achievement, ApiError, CreateAchievementRequest>, 'mutationFn'>,
) {
  const queryClient = useQueryClient();
  return useMutation<Achievement, ApiError, CreateAchievementRequest>({
    mutationFn: createAchievement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: catalogsKeys.achievements() });
    },
    ...options,
  });
}

export async function updateAchievement(
  id: number,
  data: UpdateAchievementRequest,
): Promise<Achievement> {
  const res = await fetch(`${ENDPOINTS.achievements}/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update achievement');
  return res.json();
}

export function useUpdateAchievement(
  options?: Omit<
    UseMutationOptions<Achievement, ApiError, { id: number; data: UpdateAchievementRequest }>,
    'mutationFn'
  >,
) {
  const queryClient = useQueryClient();
  return useMutation<Achievement, ApiError, { id: number; data: UpdateAchievementRequest }>({
    mutationFn: (params: { id: number; data: UpdateAchievementRequest }) => updateAchievement(params.id, params.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: catalogsKeys.achievements() });
    },
    ...options,
  });
}

export async function deleteAchievement(id: number): Promise<void> {
  const res = await fetch(`${ENDPOINTS.achievements}/${id}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) throw new Error('Failed to delete achievement');
}

export function useDeleteAchievement(
  options?: Omit<UseMutationOptions<void, ApiError, number>, 'mutationFn'>,
) {
  const queryClient = useQueryClient();
  return useMutation<void, ApiError, number>({
    mutationFn: deleteAchievement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: catalogsKeys.achievements() });
    },
    ...options,
  });
}
