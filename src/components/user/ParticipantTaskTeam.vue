<script setup lang="ts">
  import { useI18n } from 'vue-i18n'
  import { computed, onMounted, ref, watch } from 'vue'
  import AppSnackbar from '../common/AppSnackbar.vue'
  import { useAuthStore } from '@/stores/auth'
  import { storeToRefs } from 'pinia'
  import { TaskKey } from '@/types/hackathon_phase'
  import { useTeamStore } from '@/stores/teamStore'
  import TeamFormParticipant from './TeamFormParticipant.vue'
  import { TeamFormDTO, TeamDTO } from '@/types/team'
  import { ThemesDTO } from '@/types/config'
  import { useConfiguration } from '@/composables/useConfiguration'
  import { ConfigurationKey } from '@/utils/configuration/configurationKey'
  import { getEligibleTeamsForUser } from '@/utils/teamConstraints'
  import { UserReducedDTO } from '@/types/user'
  import { MatchmakingSettingsDTO } from '@/types/config'

  const { t, tm } = useI18n()

  // Snackbar
  const snackbar = ref(false)
  const text = ref('')
  const timeout = ref(1500)
  const error = ref(false)

  // --- Themes configration ---
  const { configuration: themesConfig, error: themesError } = useConfiguration(
    ConfigurationKey.THEMES
  )

  const themes = ref<ThemesDTO[]>([])

  watch(
    themesConfig,
    (newConfig) => {
      if (newConfig?.value?.themes && Array.isArray(newConfig.value.themes)) {
        themes.value = newConfig.value.themes as ThemesDTO[]
      } else {
        themes.value = []
      }

      if (themesError.value) {
        console.error('Error fetching themes from hook:', themesError.value)
      }
    },
    { immediate: true }
  )

  // --- Matchmaking configuration
  const { configuration: matchmakingConfig, error: matchmakingError } = useConfiguration(
    ConfigurationKey.MATCHMAKING
  )

  const matchmakingSettings = ref<MatchmakingSettingsDTO | null>(null)
  const loadingConfig = ref(true)

  watch(
    matchmakingConfig,
    (newConfig) => {
      if (newConfig && newConfig.value) {
        matchmakingSettings.value = newConfig.value as MatchmakingSettingsDTO
        loadingConfig.value = false
      }
    },
    { immediate: true }
  )

  // --- Search & Filter ---
  const searchQuery = ref('')
  const filteredTeams = computed(() =>
    eligibleTeams.value.filter((team) =>
      team.name.toLowerCase().includes(searchQuery.value.toLowerCase())
    )
  )

  // Team Store
  const teamStore = useTeamStore()
  const loadingTeams = computed(() => teamStore.loading)
  const teams = computed(() => teamStore.teams)

  const eligibleTeams = computed(() => {
    if (!matchmakingSettings.value || !user.value) {
      return []
    }
    const reducedUser = user.value as UserReducedDTO
    return getEligibleTeamsForUser(teams.value, reducedUser, matchmakingSettings.value)
  })

  const authStore = useAuthStore()
  const { user } = storeToRefs(authStore)
  const { updateUserFields } = authStore

  const taskData = computed(() => {
    return tm(`dashboard.participant.${TaskKey.TEAMS_FORMED}`) as
      | { title: string; description: string; [key: string]: any }
      | undefined
  })

  const isCompleted = computed<boolean>(() => {
    return user?.value?.teamId !== null && user?.value?.teamId !== undefined
  })

  // ----- TEAM FORM HANDLERS -----
  const showTeamForm = ref(false)
  const editMode = ref(false)
  const selectedTeam = ref<TeamDTO | null>(null)

  const onAddTeam = () => {
    showTeamForm.value = true
    editMode.value = false
  }

  // --- TEAM ACTIONS ---
  const joinTeam = async (teamId: string) => {
    const userId = user.value?.id as string
    try {
      // Assign user to team
      await teamStore.assignUserToTeam(teamId, userId, true)

      // Update auth store user fields
      await authStore.updateUserFields({ teamId })

      text.value = t('organizer.teamManagement.userAssignedToTeam')
      error.value = false
      snackbar.value = true
    } catch (err) {
      console.error('Error assigning user to team:', err)
      text.value = t('organizer.teamManagement.userAssignError')
      error.value = true
      snackbar.value = true
    }
  }

  const quitTeam = async (teamId: string) => {
    const userId = user.value?.id as string
    try {
      // Withdraw user from team
      await teamStore.withdrawUserFromTeam(teamId, userId, true)

      // Update auth store user fields
      await authStore.updateUserFields({ teamId: null })

      text.value = t('organizer.teamManagement.userWithdrawnFromTeam')
      error.value = false
      snackbar.value = true
    } catch (err) {
      console.error('Error withdrawing user from team:', err)
      text.value = t('organizer.teamManagement.userWithdrawError')
      error.value = true
      snackbar.value = true
    }
  }

  const onSaveTeam = async (teamId: string, team: TeamFormDTO) => {
    try {
      let finalTeamId = teamId
      if (editMode.value) {
        await teamStore.updateTeam(teamId, team)
        text.value = t('organizer.teamManagement.teamUpdated')
      } else {
        team.memberIds = [authStore.user?.id as string]
        const newTeam = await teamStore.createTeam(team)
        finalTeamId = newTeam.id
        text.value = t('organizer.teamManagement.teamCreated')
      }
      await updateUserFields({ teamId: finalTeamId })
      error.value = false
      snackbar.value = true
      showTeamForm.value = false
      selectedTeam.value = null

      await teamStore.fetchTeams()

      console.log('Teams after save:', teamStore.teams)
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

  onMounted(async () => {
    await teamStore.fetchTeams()
  })
</script>

<template>
  <div>
    <div class="mb-4 flex justify-between items-center">
      <h3 class="text-h6 d-flex align-center">
        <v-icon :color="isCompleted ? 'success' : 'warning'" class="mr-2">
          {{ isCompleted ? 'mdi-check-circle' : 'mdi-alert-circle' }}
        </v-icon>
        {{ taskData?.title || t('dashboard.participant.teams_formed.title') }}
      </h3>

      <v-chip label :color="isCompleted ? 'success' : 'warning'" class="mb-4">
        <v-icon size="small" class="mr-1">
          {{ isCompleted ? 'mdi-check' : 'mdi-clock-outline' }}
        </v-icon>
        {{ isCompleted ? t('common.completed') : t('common.pending') }}
      </v-chip>
    </div>

    <!-- Search + Add -->
    <div class="flex mb-4 gap-4 items-center">
      <v-text-field
        v-model="searchQuery"
        :placeholder="t('common.search')"
        variant="solo"
        hide-details
        density="comfortable"
        clearable
        class="flex-grow"
        @click:clear="searchQuery = ''"
      />
      <v-btn color="primary" class="h-full" @click="onAddTeam">
        {{ t('organizer.teamManagement.actions.add') }}
      </v-btn>
    </div>

    <div v-if="loadingTeams || loadingConfig" class="text-center py-12">
      <v-progress-circular indeterminate color="primary" size="48"></v-progress-circular>
    </div>

    <div v-if="filteredTeams.length === 0" class="text-center py-12 text-gray-600">
      {{ t('organizer.teamManagement.noTeamsAvailable') }}
    </div>

    <div v-else class="grid grid-cols-1 gap-4">
      <v-card v-for="team in filteredTeams" :key="team.id" variant="elevated" class="pa-4">
        <div class="d-flex justify-space-between align-center">
          <div>
            <div class="flex justify-between items-center gap-2 mb-2">
              <div class="text-subtitle-1 font-weight-bold">{{ team.name }}</div>
              <v-chip v-if="user?.teamId == team.id" color="success" size="small">{{
                t('dashboard.participant.teams_formed.myTeam')
              }}</v-chip>
            </div>
            <div class="text-caption text-grey">{{ team.description }}</div>
          </div>
          <v-btn
            v-if="user?.teamId !== team.id"
            :disabled="isCompleted"
            color="primary"
            size="small"
            @click="joinTeam(team.id)"
          >
            {{ t('dashboard.participant.teams_formed.joinTeam') }}
          </v-btn>
          <v-btn v-else color="error" size="small" @click="quitTeam(team.id)">
            {{ t('dashboard.participant.teams_formed.quitTeam') }}
          </v-btn>
        </div>
      </v-card>
    </div>
  </div>

  <TeamFormParticipant
    v-model="showTeamForm"
    @save="onSaveTeam"
    :edit-mode="editMode"
    :team="selectedTeam"
    :themes="themes"
    :subject-id="user?.favoriteSubjectIds?.[0] || null"
  />

  <div v-if="loadingTeams" class="text-center py-12">
    <v-progress-circular indeterminate color="primary" size="48"></v-progress-circular>
  </div>
  <AppSnackbar v-model="snackbar" :message="text" :timeout="timeout" :error="error" />
</template>
