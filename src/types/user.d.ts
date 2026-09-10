import { UserRole } from '@/types/roles'
import { TeamDTO } from './team'

export interface UserDTO {
  id: string
  firstname: string
  lastname: string
  email: string
  role: UserRole
  school?: string
  invitationSent?: boolean
  bio?: string
  interests?: string[]
  linkedin?: string
  github?: SocialMediaDTO
  discord?: SocialMediaDTO 
  profilePicturePath?: string | null
  teamId: string | null
  favoriteSubjectIds?: string[]
}

export interface UserReducedDTO {
  id: string
  firstname: string
  lastname: string
  email: string
  role: Role
  school?: string | null
  favoriteSubjectIds?: string[]
  teamId?: string | null
  team ? : {
    id: string
    name: string
  } | null
  juryTeams? : Array<{
    id: string
    name: string
  }> | null
  mentorTeams? : Array<{
    id: string
    name: string
  }> | null
}

export interface SocialMediaDTO {
  id: string
  username: string
}

export interface UserReducedDTO {
  id: string
  firstname: string
  lastname: string
  email: string
  role: Role
  school?: string | null
  favoriteSubjectIds?: string[]
  teamId?: string | null
}

export interface SocialMediaDTO {
  id: string
  username: string
}

export interface ExpertTeamsResponse {
  juryTeams: TeamDTO[]
  mentorTeams: TeamDTO[]
}