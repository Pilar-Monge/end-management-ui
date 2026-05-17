import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from '@tanstack/react-query'
import type {
  AdmissionRequest,
  ProcessAIPayload,
  ReviewAdmissionPayload,
} from '../types'
import {
  fetchPendingAdmissions,
  fetchAdmissionRequestById,
  processAdmissionWithAI,
  reviewAdmissionRequest,
  submitAdmission,
} from '../services/admissionApi'
import { admissionKeys } from './keys'

export function usePendingAdmissions(
  campId: number,
  options?: Omit<
    UseQueryOptions<AdmissionRequest[], Error>,
    'queryKey' | 'queryFn'
  >,
) {
  return useQuery<AdmissionRequest[], Error>({
    queryKey: admissionKeys.pending(campId),
    queryFn: () => fetchPendingAdmissions(campId),
    ...options,
  })
}

export function useAdmissionRequest(
  id: number,
  options?: Omit<
    UseQueryOptions<AdmissionRequest, Error>,
    'queryKey' | 'queryFn'
  >,
) {
  return useQuery<AdmissionRequest, Error>({
    queryKey: admissionKeys.detail(id),
    queryFn: () => fetchAdmissionRequestById(id),
    ...options,
  })
}


export function useCreateAdmissionRequest(
  options?: Omit<
    UseMutationOptions<AdmissionRequest, Error, FormData | Record<string, any>>,
    'mutationFn'
  >,
) {
  const queryClient = useQueryClient()
  return useMutation<AdmissionRequest, Error, FormData | Record<string, any>>({
    mutationFn: (payload) => submitAdmission(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: admissionKeys.all })
    },
    ...options,
  })
}

export function useProcessAIAdmission(
  options?: Omit<
    UseMutationOptions<
      AdmissionRequest,
      Error,
      { id: number; payload: ProcessAIPayload }
    >,
    'mutationFn'
  >,
) {
  const queryClient = useQueryClient()
  return useMutation<
    AdmissionRequest,
    Error,
    { id: number; payload: ProcessAIPayload }
  >({
    mutationFn: ({ id, payload }) =>
      processAdmissionWithAI(id, payload),
    onSuccess: (data) => {
      queryClient.setQueryData(
        admissionKeys.detail(data.id),
        data,
      )
      queryClient.invalidateQueries({
        queryKey: admissionKeys.all,
      })
    },
    ...options,
  })
}

export function useReviewAdmission(
  options?: Omit<
    UseMutationOptions<
      AdmissionRequest,
      Error,
      { id: number; payload: ReviewAdmissionPayload }
    >,
    'mutationFn'
  >,
) {
  const queryClient = useQueryClient()
  return useMutation<
    AdmissionRequest,
    Error,
    { id: number; payload: ReviewAdmissionPayload }
  >({
    mutationFn: ({ id, payload }) =>
      reviewAdmissionRequest(id, payload),
    onSuccess: (data) => {
      queryClient.setQueryData(
        admissionKeys.detail(data.id),
        data,
      )
      queryClient.invalidateQueries({
        queryKey: admissionKeys.all,
      })
    },
    ...options,
  })
}
