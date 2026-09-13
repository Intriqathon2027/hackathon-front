import { isAccessor } from 'typescript'

export interface HackathonGeneralInfoDTO {
  name: string
  slogan: string
  description: string
}

export type PhaseStatus = 'NOT_STARTED' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED' 

export interface HackathonPhaseDTO {
  order: number
  name: string
  status: PhaseStatus
  optionalPhase: boolean
  startDate: string | null
  endDate: string | null
}

export interface HackathonPhase extends HackathonPhaseDTO {
  startDateObj: Date | null
  endDateObj: Date | null
}

// ---- PARTNERS ------
export interface PartnersDTO {
  id: string
  name: string
  logoId: string
  logoKey: string
  websiteUrl: string
  isParticipatingSchool: boolean
}

export interface PartnersSettingsDTO {
  partners: PartnersDTO[]
}

export interface CreatePartnersDTO {
  name: string
  logoId: string
  logoKey: string
  websiteUrl: string
  isParticipatingSchool: boolean
}

export type UpdatePartnersDTO = Partial<CreatePartnersDTO>

// ---- TEXTS & MEDIA -----
export interface HackathonTextDTO {
  hackathonName: string
  slogan?: string
  hackathonDescription: string
  location?: string
  startDate?: string
  endDate?: string
}

export interface HackathonMediaDTO {
  bannerPictureId: string | null
  hackathonLogoId: string | null
  evaluationGridPath: string | null
  instagram: string | null
  linkedin: string | null
  facebook: string | null
  x: string | null
  youtube: string | null
}

// ---- CONFIGURATIONS -----
export interface ConfigurationResponse {
  id: string
  key: string
  value: any
  createdAt: string
  updatedAt: string
}

export interface CreateConfigurationDTO {
  key: string
  value: any
}

export interface UpdateConfigurationDTO {
  key?: string
  value?: any
}

// ---- MATCHMAKING -----

export interface ConstraintDTO {
  rule: 'MIN' | 'MAX' | 'EQUAL'
  schools: string[]
  value: number
  multiple: boolean
}

export type MatchmakingAlgorithm = 'manual' | 'legacy' | 'new'

export interface MatchmakingSettingsDTO {
  isActive: boolean
  teamSizeMin: number
  teamSizeMax: number
  maxTeamsPerSubject: number
  maxTeamsPerTopic?: number
  constraints: ConstraintDTO[]
  algorithm?: MatchmakingAlgorithm
}

export interface TeamConstraintViolation {
  type: TeamConstraintType
  count?: number
  schools?: string
}

// ---- THEMES & SUBJECTS -----
export interface SubjectDTO {
  id: string
  name: string
  description: string
}

export interface ThemesDTO {
  id: string
  name: string
  description: string
  subjects: SubjectDTO[]
}

export interface ThemesSettingsDTO {
  themes: ThemesDTO[]
}