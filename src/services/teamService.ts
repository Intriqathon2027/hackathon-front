import axios from 'axios'
import { TeamDTO, TeamFormDTO } from '@/types/team'
import { getAuthHeaders } from '@/stores/auth'
import { TeamStatus } from '@/types/team_status'

import { ConstraintDTO } from '@/types/config'

export interface AutogenerateUserBasedDTO {
  teamSizeMin?: number
  teamSizeMax?: number
  maxTeamsPerSubject?: number
  ignoreConstraints?: boolean
  constraints?: ConstraintDTO[]
}

export interface AutogenerateResponseDTO {
  count: number
  teams?: Array<{
    id: string
    name: string
    subjectId?: string
    themeId?: string
    memberIds?: string[]
  }>
  unassignedUserIds?: string[]
}

const API_URL = `${import.meta.env.VITE_API_URL}/api/team`

export const teamService = {
  async create(dto: TeamFormDTO): Promise<TeamDTO> {
    const res = await axios.post(`${API_URL}`, dto, { headers: getAuthHeaders() })
    return res.data
  },

  async update(teamId: string, dto: TeamFormDTO): Promise<TeamDTO> {
    const res = await axios.put(`${API_URL}/${teamId}`, dto, { headers: getAuthHeaders() })
    return res.data
  },

  async getAll(): Promise<TeamDTO[]> {
    const res = await axios.get(`${API_URL}`, { headers: getAuthHeaders() })
    return res.data
  },

  async getById(teamId: string): Promise<TeamDTO> {
    const res = await axios.get(`${API_URL}/${teamId}`, { headers: getAuthHeaders() })
    return res.data
  },

  async delete(teamId: string): Promise<void> {
    await axios.delete(`${API_URL}/${teamId}`, { headers: getAuthHeaders() })
  },

  async updateStatus(teamId: string, status: TeamStatus): Promise<TeamDTO> {
    const res = await axios.patch(
      `${API_URL}/${teamId}/status`,
      { status },
      { headers: getAuthHeaders() }
    )
    return res.data
  },

  async toggleIgnoreConstraints(teamId: string, ignore: boolean): Promise<TeamDTO> {
    const res = await axios.patch(
      `${API_URL}/${teamId}/ignore-constraints`,
      { ignoreConstraints: ignore },
      { headers: getAuthHeaders() }
    )
    return res.data
  },

  async assignUserToTeam(teamId: string, userId: string, isParticipant = false): Promise<TeamDTO> {
    const res = await axios.post(
      `${API_URL}/${teamId}/users/${userId}?participant=${isParticipant}`,
      {},
      { headers: getAuthHeaders() }
    )
    return res.data
  },

  async withdrawUserFromTeam(teamId: string, userId: string, isParticipant = false): Promise<TeamDTO> {
    const res = await axios.delete(`${API_URL}/${teamId}/users/${userId}?participant=${isParticipant}`, {
      headers: getAuthHeaders(),
    })
    return res.data
  },

  async leaveTeam(): Promise<void> {
    await axios.post(`${API_URL}/leave`, {}, { headers: getAuthHeaders() })
  },

  async joinTeam(teamId: string): Promise<TeamDTO> {
    const res = await axios.post(`${API_URL}/${teamId}/join`, {}, { headers: getAuthHeaders() })
    return res.data
  },

  /**
   * New User-Based Matchmaking algorithm using Google OR-Tools CP-SAT
   * Endpoint: POST /api/team/autogenerate/user-based
   */
  async autogenerateUserBasedTeams(dto?: AutogenerateUserBasedDTO): Promise<AutogenerateResponseDTO> {
    const res = await axios.post<AutogenerateResponseDTO>(
      `${API_URL}/autogenerate/user-based`,
      dto || {},
      { headers: getAuthHeaders() }
    )
    return res.data
  },

  /**
   * Legacy Matchmaking algorithm
   * Endpoint: POST /api/team/autogenerate
   */
  async autogenerateLegacyTeams(): Promise<number> {
    const res = await axios.post(
      `${API_URL}/autogenerate`,
      {},
      { headers: getAuthHeaders() }
    )
    return res.data.count ?? res.data
  },

  /**
   * Autogenerate teams based on selected algorithm:
   * - 'new': calls /api/team/autogenerate/user-based with user-based matchmaking parameters
   * - 'legacy' / other: calls /api/team/autogenerate
   */
  async autogenerateTeams(algorithm?: string, dto?: AutogenerateUserBasedDTO): Promise<number> {
    if (algorithm === 'new') {
      const res = await this.autogenerateUserBasedTeams(dto)
      return res.count
    }
    return await this.autogenerateLegacyTeams()
  },
}
