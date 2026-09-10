<script lang="ts" setup>
  import { UserReducedDTO } from '@/types/user'
  import { MatchmakingSettingsDTO, ThemesDTO } from '@/types/config'
  import { useI18n } from 'vue-i18n'
  import { ref, toRef } from 'vue'
  import { TeamDTO } from '@/types/team'
  import UserTeamActions from './UserTeamActions.vue'
  import UserTeamDialog from './UserTeamDialog.vue'
  import { getEligibleTeamsForUser } from '@/utils/teamConstraints'
  import { UserRole } from '@/types/roles'
  import { usePagination } from '@/composables/usePagination'
import { TeamStatus } from '@/types/team_status'

  const { t } = useI18n()

  const props = defineProps<{
    users: UserReducedDTO[]
    themes: ThemesDTO[]
    teams: TeamDTO[]
    config: MatchmakingSettingsDTO | null
    itemsPerPage?: number
  }>()

  const users = toRef(props, 'users')

  const emit = defineEmits(['assign-team', 'withdraw-team'])

  const { currentPage, totalPages, paginatedItems, goToPage } = usePagination(
    users,
    props.itemsPerPage || 10
  )

  const selectedUserId = ref<string>()

  const showAssignTeamDialog = ref(false)
  const showWithdrawTeamDialog = ref(false)

  const handleAssignTeam = (userId: string, teamId: string) => {
    emit('assign-team', { userId, teamId })
    showAssignTeamDialog.value = false
  }

  const handleWithdrawTeam = (userId: string, teamId: string) => {
    console.log('withdrawing', userId, teamId)
    emit('withdraw-team', { userId, teamId })
    showWithdrawTeamDialog.value = false
  }

  const getSubject = (subjectId: string) => {
    for (const theme of props.themes) {
      const subject = theme.subjects.find((subj) => subj.id === subjectId)
      if (subject) {
        return subject.name
      }
    }
    return ''
  }

  const getTheme = (subjectId: string) => {
    for (const theme of props.themes) {
      const subject = theme.subjects.find((subj) => subj.id === subjectId)
      if (subject) {
        return theme.name
      }
    }
    return ''
  }

  const getEligibleTeamsToAssign = () => {
    if (!selectedUserId.value || !props.config) return []
    const user = props.users.find((u) => u.id === selectedUserId.value)
    if (user?.role) {
      switch (user.role) {
        case UserRole.PARTICIPANT:
          return getEligibleTeamsForUser(props.teams, user, props.config)
        case UserRole.MENTOR:
          return props.teams.filter((t) => !user.mentorTeams?.some((ut) => ut.id === t.id) && t.status === TeamStatus.UNLOCKED)
        case UserRole.JURY:
          return props.teams.filter((t) => !user.juryTeams?.some((ut) => ut.id === t.id) && t.status === TeamStatus.UNLOCKED)
        default:
          return []
      }
    }
    return []
  }

  const getEligibleTeamsToWithdraw = () => {
    if (!selectedUserId.value) return []
    const user = props.users.find((u) => u.id === selectedUserId.value)
    if (user?.role) {
      switch (user.role) {
        case UserRole.PARTICIPANT:
          return props.teams.filter((t) => t.id === user.teamId)
        case UserRole.MENTOR:
          return props.teams.filter((t) => user.mentorTeams?.some((ut) => ut.id === t.id))
        case UserRole.JURY:
          return props.teams.filter((t) => user.juryTeams?.some((ut) => ut.id === t.id))
        default:
          return []
      }
    }
    return []
  }
</script>

<template>
  <div class="bg-white border rounded-lg overflow-x-auto">
    <table class="min-w-full text-sm">
      <thead>
        <tr class="border-b">
          <th class="px-4 py-2 text-left font-semibold">
            {{ t('organizer.teamManagement.name') }}
          </th>
          <th class="px-4 py-2 text-left font-semibold">
            {{ t('organizer.teamManagement.role') }}
          </th>
          <th class="px-4 py-2 text-center font-semibold">
            {{ t('organizer.teamManagement.school') }}
          </th>
          <th class="px-4 py-2 text-center font-semibold">
            {{ t('organizer.teamManagement.team') }}
          </th>
          <th class="px-4 py-2 text-center font-semibold">
            <span>{{ t('organizer.teamManagement.themeAndSubject') }}</span>
          </th>
          <th class="px-4 py-2 text-center font-semibold">
            {{ t('organizer.teamManagement.actions.label') }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="user in paginatedItems" :key="user.id" class="border-b">
          <td class="px-4 py-2">{{ user.firstname }} {{ user.lastname }}</td>
          <td class="px-4 py-2">{{ t(`roles.${user.role.toLowerCase()}`) }}</td>
          <td class="px-4 py-2 text-center">{{ user.school ?? '-' }}</td>
          <td class="px-4 py-2 text-center">
            <span v-if="user.teamId">{{ user.team?.name }}</span>
            <div v-else-if="user.juryTeams && user.juryTeams.length > 0">
              <div v-for="team in user.juryTeams" :key="team.id">
                {{ team.name }}
              </div>
            </div>
            <div v-else-if="user.mentorTeams && user.mentorTeams.length > 0">
              <div v-for="team in user.mentorTeams" :key="team.id">
                {{ team.name }}
              </div>
            </div>
            <v-icon
              v-else
              color="warning"
              icon="mdi-alert"
              variant="text"
              size="large"
              :title="t('organizer.teamManagement.noTeamAssigned')"
            ></v-icon>
          </td>
          <td class="px-4 py-2 text-center">
            <div v-if="user.favoriteSubjectIds?.length">
              <div class="font-medium">
                {{ getTheme(user.favoriteSubjectIds[0]) }}
              </div>
              <div class="text-sm text-gray-600">
                {{ getSubject(user.favoriteSubjectIds[0]) }}
              </div>
            </div>
            <div v-else>-</div>
          </td>
          <td class="px-4 py-2 text-center">
            <UserTeamActions
              :user="user"
              :team-available="props.teams.length > 0"
              @assign="
                showAssignTeamDialog = true;
                selectedUserId = user.id
              "
              @withdraw="
                showWithdrawTeamDialog = true;
                selectedUserId = user.id
              "
            />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
  <div v-if="totalPages > 1" class="flex justify-center items-center gap-2 mt-6">
    <v-btn
      icon="mdi-chevron-left"
      :disabled="currentPage === 1"
      @click="goToPage(currentPage - 1)"
    ></v-btn>
    <v-btn
      v-for="n in totalPages"
      :key="n"
      :variant="n === currentPage ? 'flat' : 'text'"
      color="primary"
      @click="goToPage(n)"
    >
      {{ n }}
    </v-btn>
    <v-btn
      icon="mdi-chevron-right"
      :disabled="currentPage === totalPages"
      @click="goToPage(currentPage + 1)"
    ></v-btn>
  </div>
  <UserTeamDialog
    v-model="showAssignTeamDialog"
    v-if="showAssignTeamDialog"
    :user="users.find((u) => u.id === selectedUserId)!"
    :teams="getEligibleTeamsToAssign()"
    type="assign"
    @confirm="handleAssignTeam"
    @cancel="showAssignTeamDialog = false"
  />

  <UserTeamDialog
    v-model="showWithdrawTeamDialog"
    v-if="showWithdrawTeamDialog"
    :user="users.find((u) => u.id === selectedUserId)!"
    :teams="getEligibleTeamsToWithdraw()"
    type="withdraw"
    @confirm="handleWithdrawTeam"
    @cancel="showWithdrawTeamDialog = false"
  />
</template>
