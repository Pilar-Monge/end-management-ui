export type FormState = {
  nombre: string
  primerApellido: string
  segundoApellido: string
  email: string
  usuario: string
  genero: string
  nacimiento: string
  salud: string
  experiencia: string
  condicion: string
  habilidades: string
  campId?: number
}

export type CalendarDay = {
  date: Date
  inMonth: boolean
  isSelected: boolean
  isToday: boolean
  value: string
}

export type AdmissionRequestStatus = 'PENDING_AI' | 'PENDING_ADMIN' | 'APPROVED' | 'REJECTED'

export interface AdmissionRequest {
  id: number
  name: string
  lastName1: string
  lastName2: string | null
  email: string
  desiredUsername: string
  birthDate: string
  gender: 'MALE' | 'FEMALE' | 'OTHER'
  photoUrl: string | null
  declaredHealthLevel: string | null
  previousExperience: string | null
  physicalCondition: string | null
  declaredSkills: string | null
  healthLevelScore: number | null
  physicalConditionScore: number | null
  experienceYears: number | null
  skillsScore: number | null
  campId: number
  status: AdmissionRequestStatus
  suggestedOccupationId: number | null
  finalOccupationId: number | null
  occupationModified: boolean
  reviewedBy: number | null
  reviewDate: string | null
  rejectionReason: string | null
  createdAt: string
  updatedAt: string
  aiReport?: AiAdmissionReport
}

export interface CreateAdmissionRequestInput {
  name: string
  lastName1: string
  lastName2?: string | null
  email: string
  desiredUsername: string
  gender: 'MALE' | 'FEMALE' | 'OTHER'
  birthDate: string
  declaredHealthLevel?: string | null
  previousExperience?: string | null
  physicalCondition?: string | null
  declaredSkills?: string | null
  campId: number
}

export interface AiAdmissionReport {
  prediction: 'ACCEPT' | 'REJECT'
  rules: string
  admissionSummary: string
  admissionReason: string
  suggestedRole: string
  mappedOccupationName: string
}

export interface ProcessAIPayload {
  oficioSugeridoId: number
  decision: 'ACCEPT' | 'REJECT'
}

export interface ReviewAdmissionPayload {
  adminUserId: number
  approved: boolean
  rejectionReason?: string
}
