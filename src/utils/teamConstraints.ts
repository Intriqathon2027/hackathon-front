import { TeamDTO, UserPreviewDTO } from '@/types/team'
import { MatchmakingSettingsDTO, TeamConstraintViolation } from '@/types/config'
import { checkTeamConstraints as originalCheckTeamConstraints } from '@/services/matchmakingService'
import { UserReducedDTO } from '@/types/user'
import { TeamConstraintType } from '@/types/constraintType'
import { TeamStatus } from '@/types/team_status'

export function calculateTeamConstraints(
  team: TeamDTO,
  config: MatchmakingSettingsDTO
): TeamConstraintViolation[] {
  return originalCheckTeamConstraints(team, config)
}

export function calculateAllTeamsConstraints(teams: TeamDTO[], config: MatchmakingSettingsDTO) {
  return teams.map((team) => ({
    teamId: team.id,
    violations: calculateTeamConstraints(team, config),
  }))
}

/**
 * Filters the given teams to return only those eligible for the given user.
 * Only the favorite subject of the user (the first one of their ranking) is
 * taken into account. If the user has not ranked the subjects yet, they are
 * eligible for all teams (subject to constraint checks).
 * * @param teams
 * @param user
 * @param config
 * @returns
 */
export function getEligibleTeamsForUser(
  teams: TeamDTO[],
  user: UserReducedDTO,
  config: MatchmakingSettingsDTO
): TeamDTO[] {
  const simulatedMember: UserPreviewDTO = {
    id: user.id,
    firstname: user.firstname,
    lastname: user.lastname,
    school: user.school || '',
    role: user.role,
  }

  const filteredTeams = teams.filter((team) => team.status === TeamStatus.UNLOCKED)
  console.log(`Filtered teams to ${filteredTeams.length} unlocked teams.`)

  if (config.isActive === false) {
    return filteredTeams
  }

  const favoriteSubjectId = user.favoriteSubjectIds?.[0]
  const teamsBySubject = favoriteSubjectId
    ? filteredTeams.filter((team) => team.subjectId === favoriteSubjectId)
    : filteredTeams

  return teamsBySubject.filter((team: TeamDTO) => {
    const simulatedTeam: TeamDTO = {
      ...team,
      members: [...team.members, simulatedMember],
    }

    const violations = calculateTeamConstraints(simulatedTeam, config)

    const hasBlockingViolation = violations.some((v) => {
      if (v.type === TeamConstraintType.TEAM_SIZE_MAX) return true

      if (v.schools?.includes(user.school ?? '')) {
        const blockingTypes = [
          TeamConstraintType.SCHOOL_MAX,
          TeamConstraintType.SCHOOLS_MAX,
          TeamConstraintType.SCHOOL_EQUAL_TOO_MANY,
          TeamConstraintType.SCHOOLS_EQUAL_TOO_MANY,
        ]

        if (blockingTypes.includes(v.type as TeamConstraintType)) {
          console.log('Blocking violation found for user school:', user.school)
          return true
        }
      }

      return false
    })

    return !hasBlockingViolation
  })
}
