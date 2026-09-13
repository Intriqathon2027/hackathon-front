<script setup lang="ts">
  import { watch, ref, computed, onMounted } from 'vue'
  import { useI18n } from 'vue-i18n'
  import type { TeamDTO, TeamFormDTO } from '@/types/team'
  import TeamForm from '@/components/organizer/team_management/TeamForm.vue'
  import { UserRole } from '@/types/roles'
  import { UserReducedDTO } from '@/types/user'
  import { userService } from '@/services/userService'
  import { MatchmakingAlgorithm, MatchmakingSettingsDTO, PartnersDTO, ThemesDTO } from '@/types/config'
import MatchmakingConfig from '@/components/organizer/matchmaking/MatchmakingConfig.vue'
  import { configurationService } from '@/services/configurationService'
  import { ConfigurationKey } from '@/utils/configuration/configurationKey'
  import TeamTable from '@/components/organizer/team_management/TeamTable.vue'
  import UsersTable from '@/components/organizer/team_management/UsersTable.vue'
  import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
  import { calculateAllTeamsConstraints } from '@/utils/teamConstraints'
  import { TeamConstraintViolation } from '@/types/config'
  import AppSnackbar from '@/components/common/AppSnackbar.vue'
  import TeamFilters from '../../components/organizer/team_management/TeamFilters.vue'
  import { filterTeams, filterUsers } from '@/utils/filterUtils'
  import { TeamStatus } from '@/types/team_status'
  import { useTeamStore } from '@/stores/teamStore'
  import { githubService } from '@/services/githubService'
  import type { AutogenerateUserBasedDTO } from '@/services/teamService'

  const { t, locale } = useI18n({ useScope: 'global' })

  // ---- PINIA STORE ----
  const teamStore = useTeamStore()
  const loadingTeams = computed(() => teamStore.loading)

  // ----- MODALS -----
  const showRepoConfirmModal = ref(false)

  const unassignedUsersCount = computed(
    () =>
      members.value.filter(
        (member) => !teamStore.teams.some((team) => team.members.some((m) => m.id === member.id))
      ).length
  )

  const teamsWithViolationsCount = computed(
    () => teams.value.filter((team) => teamConstraintsMap.value[team.id]?.length > 0).length
  )

  const confirmInitializeRepos = () => {
    showRepoConfirmModal.value = true
  }

  const handleConfirmRepos = () => {
    showRepoConfirmModal.value = false
    initializeRepos()
  }

  const repoWarningMessage = computed(() => {
    const warnings: string[] = []

    if (unassignedUsersCount.value > 0) {
      warnings.push(
        t('organizer.teamManagement.confirmRepoDialog.unassignedWarning', {
          count: unassignedUsersCount.value,
        })
      )
    }
    if (teamsWithViolationsCount.value > 0) {
      warnings.push(
        t('organizer.teamManagement.confirmRepoDialog.violationsWarning', {
          count: teamsWithViolationsCount.value,
        })
      )
    }
    return warnings
  })

  // Snackbar
  const snackbar = ref(false)
  const text = ref('')
  const timeout = ref(2500)
  const error = ref<boolean>(false)

  // View state
  const showTeamForm = ref(false)
  const viewMode = ref<'team' | 'individual'>('team')
  const selectedTeam = ref<TeamDTO | null>(null)
  const editMode = ref(false)

  // Filters
  const selectedTeamStatus = ref<string>('')
  const selectedConstraints = ref<string>('')
  const selectedUserTeamStatus = ref<string>('')
  const selectedRole = ref<UserRole | ''>('')
  const filterName = ref('')
  const selectedSchool = ref<string>('')

  // Data
  const members = ref<UserReducedDTO[]>([])
  const juries = ref<UserReducedDTO[]>([])
  const mentors = ref<UserReducedDTO[]>([])
  const themes = ref<ThemesDTO[]>([])
  const teams = computed(() => teamStore.teams)

  const teamsCreated = ref<number>(0)
  const autogenerating = ref(false)
  const showAutogenerateResult = ref(false)

  // ----- TEAM FORM HANDLERS -----
  const onAddTeam = () => {
    showTeamForm.value = true
    editMode.value = false
  }

  const onEditTeam = (team: TeamDTO) => {
    selectedTeam.value = team
    showTeamForm.value = true
    editMode.value = true
  }

  const onSaveTeam = async (teamId: string, team: TeamFormDTO) => {
    try {
      if (editMode.value) {
        await teamStore.updateTeam(teamId, team)
        text.value = t('organizer.teamManagement.teamUpdated')
      } else {
        await teamStore.createTeam(team)
        text.value = t('organizer.teamManagement.teamCreated')
      }
      error.value = false
      snackbar.value = true

      await teamStore.fetchTeams()
      await fetchUsers()

      showTeamForm.value = false
      selectedTeam.value = null
    } catch (err) {
      console.error('Error saving team:', err)
      text.value = t(
        editMode.value
          ? 'organizer.teamManagement.teamUpdateError'
          : 'organizer.teamManagement.teamCreateError'
      )
      error.value = true
      snackbar.value = true
    }
  }

  const deleteTeam = async (teamId: string) => {
    try {
      await teamStore.deleteTeam(teamId)
      text.value = t('organizer.teamManagement.teamDeleted')
      error.value = false
      snackbar.value = true
      await fetchUsers()
    } catch (err) {
      console.error('Error deleting team:', err)
      text.value = t('organizer.teamManagement.teamDeleteError')
      error.value = true
      snackbar.value = true
    } finally {
      showTeamForm.value = false
      selectedTeam.value = null
    }
  }

  const assignToTeam = async (payload: { userId: string; teamId: string }) => {
    const { userId, teamId } = payload
    try {
      await teamStore.assignUserToTeam(teamId, userId)
      text.value = t('organizer.teamManagement.userAssignedToTeam')
      error.value = false
      snackbar.value = true
      await fetchUsers()
    } catch (err) {
      console.error('Error assigning user to team:', err)
      text.value = t('organizer.teamManagement.userAssignError')
      error.value = true
      snackbar.value = true
    }
  }

  const withdrawFromTeam = async (payload: { userId: string; teamId: string }) => {
    const { userId, teamId } = payload
    try {
      await teamStore.withdrawUserFromTeam(teamId, userId)
      text.value = t('organizer.teamManagement.userWithdrawnFromTeam')
      error.value = false
      snackbar.value = true
      await fetchUsers()
    } catch (err) {
      console.error('Error withdrawing user from team:', err)
      text.value = t('organizer.teamManagement.userWithdrawError')
      error.value = true
      snackbar.value = true
    }
  }

  const toggleConstraints = async (ignoreConstraints: boolean, teamId: string) => {
    try {
      await teamStore.toggleIgnoreConstraints(teamId, ignoreConstraints)
    } catch (err) {
      console.error('Error toggling team constraints:', err)
      text.value = t('common.error')
      error.value = true
      snackbar.value = true
    }
  }

  const updateLockStatus = async (status: TeamStatus, teamId: string) => {
    const teamConstraints = teamConstraintsMap.value[teamId]
    if (status === TeamStatus.LOCKED && teamConstraints && teamConstraints.length > 0) {
      text.value = t('organizer.teamManagement.lockImpossible')
      error.value = true
      snackbar.value = true
      return
    }
    try {
      await teamStore.updateTeamStatus(teamId, status)
    } catch (err) {
      console.error('Error updating team lock status:', err)
      text.value = t('organizer.teamManagement.teamLockStatusUpdateError')
      error.value = true
      snackbar.value = true
    }
  }

  // ------ CONSTRAINTS & MATCHMAKING ------
  const matchmakingConfig = ref<MatchmakingSettingsDTO | null>(null)
  const teamConstraintsMap = ref<Record<string, TeamConstraintViolation[]>>({})
  const selectedAlgorithm = ref<MatchmakingAlgorithm>('legacy')

  const algorithmOptions = computed(() => {
    // Explicitly track locale to update options when language changes
    const _locale = locale.value
    return [
      {
        value: 'manual' as MatchmakingAlgorithm,
        title: t('organizer.teamManagement.modes.manual.title'),
        description: t('organizer.teamManagement.modes.manual.description'),
        icon: 'mdi-account-edit-outline',
        color: 'amber',
      },
      {
        value: 'legacy' as MatchmakingAlgorithm,
        title: t('organizer.teamManagement.modes.legacy.title'),
        description: t('organizer.teamManagement.modes.legacy.description'),
        icon: 'mdi-history',
        color: 'blue',
      },
      {
        value: 'new' as MatchmakingAlgorithm,
        title: t('organizer.teamManagement.modes.new.title'),
        description: t('organizer.teamManagement.modes.new.description'),
        icon: 'mdi-creation-outline',
        color: 'purple',
      },
    ]
  })

  const currentAlgorithm = computed(
    () =>
      algorithmOptions.value.find((opt) => opt.value === selectedAlgorithm.value) ||
      algorithmOptions.value[1]
  )

  const schools = ref<string[]>([])

  const updateConstraints = () => {
    if (matchmakingConfig.value) {
      const result = calculateAllTeamsConstraints(teams.value, { ...matchmakingConfig.value, isActive: true })
      teamConstraintsMap.value = result.reduce(
        (acc, r) => ((acc[r.teamId] = r.violations), acc),
        {} as Record<string, TeamConstraintViolation[]>
      )
    } else {
      teamConstraintsMap.value = {}
    }
  }

  const onMatchmakingConfigSaved = (updatedConfig: MatchmakingSettingsDTO) => {
    matchmakingConfig.value = updatedConfig
    if (updatedConfig.algorithm) {
      selectedAlgorithm.value = updatedConfig.algorithm
    }
    updateConstraints()
  }

  watch([teams, matchmakingConfig], updateConstraints, { deep: true, immediate: true })

  // ----- FETCH DATA -----

  const fetchUsers = async () => {
    const response = await userService.getAllReduced()
    if (response) {
      members.value = response.filter((u) => u.role === UserRole.PARTICIPANT)
      mentors.value = response.filter((u) => u.role === UserRole.MENTOR)
      juries.value = response.filter((u) => u.role === UserRole.JURY)
    }
  }

  const fetchThemes = async () => {
    try {
      const response = await configurationService.findOne(ConfigurationKey.THEMES)
      if (response?.value?.themes && Array.isArray(response.value.themes)) {
        themes.value = response.value.themes as ThemesDTO[]
      } else {
        themes.value = []
      }
    } catch (error) {
      console.error('Error fetching themes:', error)
      themes.value = []
    }
  }

  const fetchMatchmakingConfig = async () => {
    try {
      const response = await configurationService.findOne(ConfigurationKey.MATCHMAKING)
      if (response?.value) {
        matchmakingConfig.value = response.value
        if (response.value.algorithm) {
          selectedAlgorithm.value = response.value.algorithm
        }
        return
      }
    } catch (e) {
      // Backend offline or error
    }

    if (import.meta.env.DEV) {
      const local = localStorage.getItem(`config_${ConfigurationKey.MATCHMAKING}`)
      if (local) {
        try {
          const val = JSON.parse(local)
          matchmakingConfig.value = val
          if (val.algorithm) {
            selectedAlgorithm.value = val.algorithm
          }
        } catch (e) {}
      }
    }
  }

  const fetchSchools = async () => {
    try {
      const response = await configurationService.findOne(ConfigurationKey.PARTNERS)
      if (response?.value?.partners && Array.isArray(response.value.partners)) {
        const partners: PartnersDTO[] = response.value.partners
        schools.value = partners.filter((p) => p.isParticipatingSchool).map((p) => p.name)
      } else {
        schools.value = []
      }
    } catch (error) {
      console.error('Error fetching schools:', error)
      schools.value = []
    }
  }

  const autogenerateTeams = async () => {
    autogenerating.value = true
    showAutogenerateResult.value = false
    teamsCreated.value = 0
    try {
      // Build DTO for the new User-Based algorithm from the current matchmaking configuration
      let dto: AutogenerateUserBasedDTO | undefined
      if (selectedAlgorithm.value === 'new' && matchmakingConfig.value) {
        dto = {
          teamSizeMin: Number(matchmakingConfig.value.teamSizeMin) || 1,
          teamSizeMax: Number(matchmakingConfig.value.teamSizeMax) || 4,
          maxTeamsPerSubject: Number(matchmakingConfig.value.maxTeamsPerSubject) || 2,
          constraints: matchmakingConfig.value.constraints?.map((c) => ({
            ...c,
            value: Number(c.value),
          })),
        }
      }

      const res = await teamStore.autogenerateTeams(selectedAlgorithm.value, dto)
      teamsCreated.value = res

      text.value = t('organizer.teamManagement.teamAutogenerateSuccess', { count: res })
      error.value = false
      snackbar.value = true

      await fetchUsers()
    } catch (err) {
      console.error('Error autogenerating teams:', err)
      text.value = t('organizer.teamManagement.teamAutogenerateError')
      error.value = true
      snackbar.value = true
    } finally {
      autogenerating.value = false
      showAutogenerateResult.value = true
    }
  }

  const handleCreateTeams = () => {
    if (selectedAlgorithm.value === 'manual') {
      onAddTeam()
    } else {
      autogenerateTeams()
    }
  }

  const closeAutogenerateResult = () => {
    showAutogenerateResult.value = false
  }

  const isInitializingRepos = ref(false)

  const initializeRepos = async () => {
    isInitializingRepos.value = true
    try {
      const results = await githubService.initializeOrganization()
      const successCount = results.filter((r: any) => r.status === 'success').length

      text.value = t('organizer.teamManagement.reposCreated', { count: successCount })
      error.value = false
      snackbar.value = true
    } catch (err: any) {
      console.error('Error initializing repos:', err)
      const errorMessage = err.response?.data?.message || ''
      
      const orgNotFoundMatch = errorMessage.match(/Organization '(.+?)' does not exist on GitHub/)
      
      if (err.response?.status === 403) {
        text.value = t('organizer.teamManagement.githubPermissionsError')
      } else if (orgNotFoundMatch) {
        text.value = t('organizer.teamManagement.githubOrgNotFoundError', { orgName: orgNotFoundMatch[1] })
      } else {
        text.value = errorMessage || t('organizer.teamManagement.reposCreationError') || 'Error creating repositories'
      }
      error.value = true
      snackbar.value = true
    } finally {
      isInitializingRepos.value = false
    }
  }

  onMounted(async () => {
    try {
      await fetchUsers()
    } catch (e) {
      console.warn('Error fetching users:', e)
    }
    try {
      await fetchThemes()
    } catch (e) {
      console.warn('Error fetching themes:', e)
    }
    try {
      await fetchMatchmakingConfig()
    } catch (e) {
      console.warn('Error fetching matchmaking config:', e)
    }
    try {
      await fetchSchools()
    } catch (e) {
      console.warn('Error fetching schools:', e)
    }
    try {
      await teamStore.fetchTeams()
    } catch (e) {
      console.warn('Error fetching teams:', e)
    }
  })

  // FILTERED TEAMS OR USERS
  const filteredTeams = computed(() =>
    filterTeams(
      teams.value.sort((a: TeamDTO, b: TeamDTO) => a.name.localeCompare(b.name)),
      selectedTeamStatus.value,
      selectedConstraints.value,
      filterName.value,
      teamConstraintsMap.value
    )
  )

  const filteredUsers = computed(() =>
    filterUsers(
      members.value
        .concat(mentors.value)
        .concat(juries.value)
        .sort((a: UserReducedDTO, b: UserReducedDTO) => a.lastname.localeCompare(b.lastname)),
      selectedUserTeamStatus.value,
      filterName.value,
      selectedRole.value,
      selectedSchool.value
    )
  )
</script>

<template>
  <v-container class="py-8 max-w-7xl mx-auto">
    <div class="px-2 sm:px-4">
      <!-- 1. Main Title -->
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          {{ t('organizer.teamManagement.title') }}
        </h1>
      </div>

      <!-- 2. Algorithm Description (Left) & Mode Dropdown (Right) -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8 items-stretch">
        <!-- Left: Algorithm Description -->
        <div class="lg:col-span-8 bg-white dark:bg-slate-800 rounded-xl p-6 border-2 border-slate-300 dark:border-slate-700 shadow-xs flex flex-col justify-center">
          <div class="flex items-center gap-3 mb-3">
            <v-avatar :color="currentAlgorithm.color + '-lighten-5'" size="42" class="border">
              <v-icon :color="currentAlgorithm.color + '-darken-2'" size="24">{{ currentAlgorithm.icon }}</v-icon>
            </v-avatar>
            <div>
              <span class="text-xs uppercase tracking-wider font-semibold text-slate-400">{{ t('organizer.teamManagement.activeAlgorithm') }}</span>
              <h3 class="text-lg font-bold text-slate-800 dark:text-white leading-tight">
                {{ currentAlgorithm.title }}
              </h3>
            </div>
          </div>
          <p class="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
            {{ currentAlgorithm.description }}
          </p>
        </div>

        <!-- Right: Mode Dropdown Selector -->
        <div class="lg:col-span-4 bg-white dark:bg-slate-800 rounded-xl p-6 border-2 border-slate-300 dark:border-slate-700 shadow-xs flex flex-col justify-center">
          <label class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            {{ t('organizer.teamManagement.modes.label') }}
          </label>
          <v-select
            v-model="selectedAlgorithm"
            :items="algorithmOptions"
            item-value="value"
            item-title="title"
            variant="outlined"
            density="comfortable"
            hide-details
          >
            <template #selection="{ item }">
              <div class="flex items-center gap-2">
                <v-icon :color="item.raw.color" size="20">{{ item.raw.icon }}</v-icon>
                <span class="font-medium text-slate-800 dark:text-white">{{ item.raw.title }}</span>
              </div>
            </template>
            <template #item="{ item, props: itemProps }">
              <v-list-item v-bind="itemProps" :title="undefined">
                <template #prepend>
                  <v-icon :color="item.raw.color" size="20" class="mr-2">{{ item.raw.icon }}</v-icon>
                </template>
                <v-list-item-title class="font-medium text-sm">
                  {{ item.raw.title }}
                </v-list-item-title>
              </v-list-item>
            </template>
          </v-select>
        </div>
      </div>

      <!-- 3. Configuration of Selected Mode (Matchmaking) -->
      <div class="mb-8">
        <MatchmakingConfig
          :algorithm-mode="selectedAlgorithm"
          @update:algorithm-mode="(mode) => (selectedAlgorithm = mode)"
          @saved="onMatchmakingConfigSaved"
        />
      </div>

      <!-- 4. In-line Action Buttons: Create repos & Create Team(s) -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <!-- Button 1: Create repos -->
        <v-btn
          color="black"
          size="large"
          class="h-12 text-base font-semibold"
          @click="confirmInitializeRepos"
          :loading="isInitializingRepos"
          :disabled="loadingTeams"
        >
          <v-icon start size="22">mdi-github</v-icon>
          {{ t('organizer.teamManagement.actions.createRepos') }}
        </v-btn>

        <!-- Button 2: Create Team(s) -->
        <div class="flex gap-2">
          <v-btn
            color="primary"
            size="large"
            class="h-12 text-base font-semibold flex-1"
            @click="handleCreateTeams"
            :loading="autogenerating"
            :disabled="loadingTeams"
          >
            <v-icon start size="22">{{ selectedAlgorithm === 'manual' ? 'mdi-account-plus' : 'mdi-auto-fix' }}</v-icon>
            {{ selectedAlgorithm === 'manual' ? t('organizer.teamManagement.actions.add') : t('organizer.teamManagement.actions.createTeams') }}
          </v-btn>

          <!-- Secondary manual add button in auto mode so organizer is never blocked -->
          <v-btn
            v-if="selectedAlgorithm !== 'manual'"
            color="primary"
            variant="tonal"
            size="large"
            class="h-12 px-3"
            @click="onAddTeam"
            :title="t('organizer.teamManagement.actions.createTeamManual')"
          >
            <v-icon>mdi-plus</v-icon>
          </v-btn>
        </div>
      </div>

      <!-- 5. Teams (liste) -->
      <div class="border-t border-slate-200 dark:border-slate-800 pt-6">
        <TeamFilters
          v-model:view-mode="viewMode"
          v-model:selectedTeamStatus="selectedTeamStatus"
          v-model:selectedConstraints="selectedConstraints"
          v-model:selectedUserTeamStatus="selectedUserTeamStatus"
          v-model:selectedRole="selectedRole"
          v-model:filterName="filterName"
          v-model:selectedSchool="selectedSchool"
          :schools="schools"
        />

        <div class="mt-6">
          <TeamTable
            v-if="viewMode === 'team' && !loadingTeams && filteredTeams.length > 0"
            :teams="filteredTeams"
            :themes="themes"
            :constraints-map="teamConstraintsMap"
            @edit="onEditTeam"
            @toggle-constraints="toggleConstraints"
            @toggle-lock="updateLockStatus"
          />

          <div v-else-if="viewMode === 'team' && loadingTeams" class="text-center py-12">
            <v-progress-circular indeterminate color="primary" size="48"></v-progress-circular>
          </div>

          <div
            v-else-if="viewMode === 'team' && !loadingTeams && filteredTeams.length === 0"
            class="text-center py-12"
          >
            {{ t('organizer.teamManagement.noTeams') }}
          </div>

          <UsersTable
            v-if="viewMode === 'individual'"
            :users="filteredUsers"
            :themes="themes"
            :teams="teams"
            :config="matchmakingConfig"
            @assign-team="assignToTeam"
            @withdraw-team="withdrawFromTeam"
          />
        </div>
      </div>

      <!-- Modals and Dialogs -->
      <ConfirmDialog
        v-model="showRepoConfirmModal"
        :title="t('organizer.teamManagement.confirmRepoDialog.title')"
        :text="t('organizer.teamManagement.confirmRepoDialog.message')"
        :secondary-text="repoWarningMessage"
        :confirm-label="t('organizer.teamManagement.confirmRepoDialog.confirm')"
        :cancel-label="t('common.cancel')"
        @confirm="handleConfirmRepos"
      />

      <TeamForm
        v-model="showTeamForm"
        @save="onSaveTeam"
        @delete="deleteTeam"
        :edit-mode="editMode"
        :team="selectedTeam"
        :members="members"
        :mentors="mentors"
        :juries="juries"
        :themes="themes"
      />
    </div>

    <AppSnackbar v-model="snackbar" :message="text" :timeout="timeout" :error="error" />

    <!-- AUTOGENERATE DIALOGS -->
    <v-dialog v-model="autogenerating" persistent width="auto">
      <v-card>
        <v-card-title class="text-h6">{{
          t('organizer.teamManagement.autogenerate.inProgressTitle')
        }}</v-card-title>
        <v-card-text>
          {{ t('organizer.teamManagement.autogenerate.inProgressText') }}
          <v-progress-linear color="blue-darken-2" indeterminate class="mt-3"></v-progress-linear>
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showAutogenerateResult" persistent width="auto">
      <v-card>
        <v-card-title class="text-h6">{{
          t('organizer.teamManagement.autogenerate.resultTitle')
        }}</v-card-title>
        <v-card-text>
          <p v-if="teamsCreated > 0">
            {{ t('organizer.teamManagement.autogenerate.resultSuccess', { count: teamsCreated }) }}
          </p>
          <p v-else>
            {{ t('organizer.teamManagement.autogenerate.resultNoChange') }}
          </p>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" @click="closeAutogenerateResult">
            {{ t('common.close') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>
