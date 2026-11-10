import type { TeamDTO } from '@/types/team'
import type { TeamConstraintViolation } from '@/types/config'
import type { UserRole } from '@/types/roles'
import { UserReducedDTO } from '@/types/user'
import { SubmissionStatus } from '@/types/submission_status'
import { SubmissionDTO } from '@/types/submission'

export function filterTeams(
  teams: TeamDTO[],
  teamStatus: string,
  constraints: string,
  filterName: string,
  constraintsMap: Record<string, TeamConstraintViolation[]>,
) {
  const nameQuery = filterName.toLowerCase()

  return teams.filter(team => {
    // Name filter
    const matchesName =
      !filterName ||
      team.name.toLowerCase().includes(nameQuery) ||
      team.members.some(m => (m.firstname + ' ' + m.lastname).toLowerCase().includes(nameQuery))

    // Team status filter
    const matchesStatus = !teamStatus || team.status === teamStatus

    // Constraints filter
    const violations = constraintsMap[team.id] || []
    const matchesConstraints =
      !constraints ||
      (constraints === 'valid' && violations.length === 0) ||
      (constraints === 'invalid' && violations.length > 0)

    return matchesName && matchesStatus && matchesConstraints
  })
}

export function filterUsers(
  users: UserReducedDTO[],
  userTeamStatus: string,
  filterName: string,
  role?: UserRole | '',
  school?: string,
  teams?: TeamDTO[]
) {
  const nameQuery = filterName.toLowerCase()

  const hasTeam = (user: UserReducedDTO): boolean => {
    if (user.teamId || user.team) return true
    if (user.juryTeams && user.juryTeams.length > 0) return true
    if (user.mentorTeams && user.mentorTeams.length > 0) return true
    if (
      teams &&
      teams.some(
        (t) =>
          t.members?.some((m) => m.id === user.id) ||
          t.mentors?.some((m) => m.id === user.id) ||
          t.juries?.some((j) => j.id === user.id)
      )
    ) {
      return true
    }
    return false
  }

  return users.filter((user) => {
    // Name filter
    const matchesName =
      !filterName ||
      (user.firstname + ' ' + user.lastname).toLowerCase().includes(nameQuery)

    // Individual filters
    let matchesUserStatus = true
    if (userTeamStatus) {
      const userHasTeam = hasTeam(user)
      if (userTeamStatus === 'withTeam') matchesUserStatus = userHasTeam
      if (userTeamStatus === 'withoutTeam') matchesUserStatus = !userHasTeam
    }

    let matchesRole = true
    if (role) matchesRole = user.role === role

    let matchesSchool = true
    if (school) matchesSchool = user.school === school

    return matchesName && matchesUserStatus && matchesRole && matchesSchool
  })
}

export function filterSubmissions(
  submissions: SubmissionDTO[],
  filterName: string,
  submissionStatus: SubmissionStatus | '',
  selectedJuryId: string | '',
  selectedMentorId: string | ''
) {
  const nameQuery = filterName.toLowerCase()

  return submissions.filter(submission => {
    // Name filter
    const matchesName =
      !filterName ||
      submission.teamName.toLowerCase().includes(nameQuery)

    // Submission status filter
    const matchesStatus = !submissionStatus || submission.status === submissionStatus

    // Jury filter
    const matchesJury = !selectedJuryId || submission.juries?.some(jury => jury.id === selectedJuryId)

    // Mentor filter
    const matchesMentor = !selectedMentorId || submission.mentors?.some(mentor => mentor.id === selectedMentorId)

    return matchesName && matchesStatus && matchesJury && matchesMentor
  })
}