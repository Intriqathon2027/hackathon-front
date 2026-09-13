import { defineStore } from 'pinia'
import {
  TeamDTO,
  TeamFormDTO,
} from '@/types/team'
import { TeamStatus } from '@/types/team_status'
import { teamService } from '@/services/teamService'

interface TeamState {
  teams: TeamDTO[]
  loading: boolean
}

export const useTeamStore = defineStore('team', {
  state: (): TeamState => ({
    teams: [],
    loading: false,
  }),

  getters: {
    getTeamById: (state) => (id: string) => {
      return state.teams.find((team) => team.id === id)
    },
    sortedTeams: (state) => {
      return [...state.teams].sort((a, b) => a.name.localeCompare(b.name))
    },
  },

  actions: {
    /**
     * Fetches all teams from the API and updates the state.
     */
    async fetchTeams(): Promise<void> {
      this.loading = true
      try {
        const response = await teamService.getAll()
        if (response) {
          this.teams = response
        }
      } catch (error) {
        console.error('Error fetching teams:', error)
        throw new Error('Could not fetch teams')
      } finally {
        this.loading = false
      }
    },

    /**
     * Create a new team and adds it to the state.
     */
    async createTeam(team: TeamFormDTO): Promise<TeamDTO> {
      const newTeam = await teamService.create(team)
      this.teams.push(newTeam)
      return newTeam
    },

    /**
     * Update an existing team and updates the state.
     */
    async updateTeam(teamId: string, team: TeamFormDTO): Promise<TeamDTO> {
      const updatedTeam = await teamService.update(teamId, team)
      const index = this.teams.findIndex((t) => t.id === teamId)
      if (index !== -1) {
        this.teams.splice(index, 1, updatedTeam)
      }
      return updatedTeam
    },

    /**
     * Delete a team by its ID and removes it from the state.
     */
    async deleteTeam(teamId: string): Promise<void> {
      await teamService.delete(teamId)
      this.teams = this.teams.filter((t: TeamDTO) => t.id !== teamId)
    },

    /**
     * Assign a user to a team.
     */
    async assignUserToTeam(teamId: string, userId: string, isParticipant = false): Promise<void> {
      await teamService.assignUserToTeam(teamId, userId, isParticipant)
      await this.fetchUpdatedTeam(teamId)
    },

    /**
     * Withdraw a user from a team.
     */
    async withdrawUserFromTeam(teamId: string, userId: string, isParticipant = false): Promise<void> {
      await teamService.withdrawUserFromTeam(teamId, userId, isParticipant)
      await this.fetchUpdatedTeam(teamId)
    },

    /**
     * Toggle the ignore constraints setting for a team.
     */
    async toggleIgnoreConstraints(teamId: string, ignoreConstraints: boolean): Promise<void> {
      await teamService.toggleIgnoreConstraints(teamId, ignoreConstraints)
      await this.fetchUpdatedTeam(teamId)
    },

    /**
     * Update the status of a team.
     */
    async updateTeamStatus(teamId: string, status: TeamStatus): Promise<void> {
      await teamService.updateStatus(teamId, status)
      await this.fetchUpdatedTeam(teamId)
    },

    /**
     * Autogenerate teams based on unassigned users.
     */
    async autogenerateTeams(algorithm?: string): Promise<number> {
      const res = await teamService.autogenerateTeams(algorithm)
      await this.fetchTeams()
      return res
    },

    /**
     * Fetches and updates a single team in the state.
     */
    async fetchUpdatedTeam(teamId: string): Promise<void> {
      const updatedTeam = await teamService.getById(teamId)
      if (updatedTeam) {
        const index = this.teams.findIndex((t) => t.id === teamId)
        if (index !== -1) {
          this.teams.splice(index, 1, updatedTeam)
        } else {
          this.teams.push(updatedTeam)
        }
      }
    },
  },
})