import axios from 'axios'
import { TeamDTO, TeamFormDTO } from '@/types/team'
import { getAuthHeaders } from '@/stores/auth'
import { TeamStatus } from '@/types/team_status'

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

  async autogenerateTeams(algorithm?: string): Promise<number> {
    const res = await axios.post(
      `${API_URL}/autogenerate`,
      algorithm ? { algorithm } : {},
      { headers: getAuthHeaders() }
    )
    return res.data.count
  }
}
