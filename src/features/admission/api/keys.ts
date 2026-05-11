export const admissionKeys = {
  all: ['admissions'] as const,
  pending: (campId: number) =>
    [...admissionKeys.all, 'pending', campId] as const,
  detail: (id: number) =>
    [...admissionKeys.all, 'detail', id] as const,
}
