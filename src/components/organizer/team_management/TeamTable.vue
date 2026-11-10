<script setup lang="ts">
  import { ThemesDTO } from '@/types/config'
  import { TeamDTO } from '@/types/team'
  import { TeamStatus } from '@/types/team_status'
  import { useI18n } from 'vue-i18n'
  import { TeamConstraintViolation } from '@/types/config'
  import { usePagination } from '@/composables/usePagination'
  import { toRef, computed } from 'vue'

  const { t } = useI18n()

  const props = withDefaults(
    defineProps<{
      teams: TeamDTO[]
      themes: ThemesDTO[]
      itemsPerPage?: number
      constraintsMap?: Record<string, TeamConstraintViolation[]>
      selectedTeamIds?: string[]
    }>(),
    {
      itemsPerPage: 10,
      selectedTeamIds: () => [],
    }
  )

  const teamsRef = toRef(props, 'teams')

  const emit = defineEmits<{
    (e: 'edit', team: TeamDTO): void
    (e: 'delete', teamId: string): void
    (e: 'toggle-lock', status: TeamStatus, teamId: string): void
    (e: 'toggle-constraints', ignoreConstraints: boolean, teamId: string): void
    (e: 'update:selectedTeamIds', ids: string[]): void
  }>()

  const { currentPage, totalPages, paginatedItems, goToPage } = usePagination(
    teamsRef,
    props.itemsPerPage || 10
  )

  // Selection logic
  const isAllSelected = computed(() => {
    return (
      props.teams.length > 0 &&
      props.teams.every((team) => props.selectedTeamIds.includes(team.id))
    )
  })

  const isIndeterminate = computed(() => {
    return (
      !isAllSelected.value &&
      props.teams.some((team) => props.selectedTeamIds.includes(team.id))
    )
  })

  const onToggleSelectAll = () => {
    if (isAllSelected.value) {
      const currentTeamIdSet = new Set(props.teams.map((t) => t.id))
      emit(
        'update:selectedTeamIds',
        props.selectedTeamIds.filter((id) => !currentTeamIdSet.has(id))
      )
    } else {
      const mergedIds = new Set([...props.selectedTeamIds, ...props.teams.map((t) => t.id)])
      emit('update:selectedTeamIds', Array.from(mergedIds))
    }
  }

  const onToggleSelectTeam = (teamId: string, selected: boolean) => {
    if (selected) {
      if (!props.selectedTeamIds.includes(teamId)) {
        emit('update:selectedTeamIds', [...props.selectedTeamIds, teamId])
      }
    } else {
      emit(
        'update:selectedTeamIds',
        props.selectedTeamIds.filter((id) => id !== teamId)
      )
    }
  }

  const isTeamSelected = (teamId: string) => {
    return props.selectedTeamIds.includes(teamId)
  }

  const formatViolationMessage = (violation: TeamConstraintViolation) => {
    const message = t(`matchmakingViolations.${violation.type}`, {
      count: violation.count,
      school: violation.schools,
      schools: violation.schools,
    })
    return message.replace(/:\s*/g, ':\n')
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

  const getChipPadding = (text: string) => {
    return text.length > 40 ? 'mb-2 py-6' : 'mb-2 py-3'
  }

  const emitToggleLock = (team: TeamDTO) => {
    const newStatus = team.status === TeamStatus.LOCKED ? TeamStatus.UNLOCKED : TeamStatus.LOCKED
    emit('toggle-lock', newStatus, team.id)
  }

  const emitToggleIgnoreConstraints = (team: TeamDTO) => {
    emit('toggle-constraints', !team.ignoreConstraints, team.id)
  }
</script>

<template>
  <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-x-auto shadow-xs">
    <table class="min-w-full text-sm">
      <thead>
        <tr class="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <th class="px-3 py-2 w-12 text-center">
            <div class="flex justify-center items-center">
              <v-checkbox
                :model-value="isAllSelected"
                :indeterminate="isIndeterminate"
                hide-details
                density="compact"
                @update:model-value="onToggleSelectAll"
                :title="t('organizer.teamManagement.actions.selectAll')"
              />
            </div>
          </th>
          <th class="px-4 py-2 text-left font-semibold">
            {{ t('organizer.teamManagement.name') }}
          </th>
          <th class="px-4 py-2 text-left font-semibold">
            {{ t('organizer.teamManagement.members') }}
          </th>
          <th class="px-4 py-2 text-left font-semibold">
            {{ t('organizer.teamManagement.themeAndSubject') }}
          </th>
          <th class="px-4 py-2 text-center font-semibold min-w-[250px]">
            {{ t('organizer.teamManagement.constraints.label') }}
          </th>
          <th class="px-4 py-2 text-center font-semibold">
            {{ t('organizer.teamManagement.status.label') }}
          </th>
          <th class="px-4 py-2 text-center font-semibold">
            {{ t('organizer.teamManagement.actions.label') }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="team in paginatedItems"
          :key="team.id"
          class="border-b border-slate-200 dark:border-slate-800 transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
          :class="{ 'bg-blue-50/50 dark:bg-blue-950/20': isTeamSelected(team.id) }"
        >
          <td class="px-3 py-2 text-center" @click.stop>
            <div class="flex justify-center items-center">
              <v-checkbox
                :model-value="isTeamSelected(team.id)"
                hide-details
                density="compact"
                @update:model-value="(val) => onToggleSelectTeam(team.id, !!val)"
              />
            </div>
          </td>
          <td class="px-4 py-2 font-medium">{{ team.name }}</td>
          <td class="px-4 py-2">
            <div v-for="member in team.members" :key="member.id">
              {{ member.firstname }} {{ member.lastname }}
            </div>
            <div v-for="mentor in team.mentors" :key="mentor.id">
              {{ mentor.firstname }} {{ mentor.lastname }} ({{ t('roles.mentor') }})
            </div>
            <div v-for="jury in team.juries" :key="jury.id">
              {{ jury.firstname }} {{ jury.lastname }} ({{ t('roles.jury') }})
            </div>
          </td>
          <td class="px-4 py-2">
            <div class="font-medium">
              {{ getTheme(team.subjectId) }}
            </div>
            <div class="text-sm text-gray-600 dark:text-gray-400">
              {{ getSubject(team.subjectId) }}
            </div>
          </td>

          <td class="px-4 py-2 text-center">
            <div v-if="constraintsMap?.[team.id]?.length">
              <div v-for="(violation, index) in constraintsMap[team.id]" :key="index">
                <v-chip
                  :key="violation.type"
                  :class="[getChipPadding(formatViolationMessage(violation))]"
                  variant="flat"
                  color="warning"
                  small
                >
                  <span class="block whitespace-pre-line leading-snug">
                    {{ formatViolationMessage(violation) }}
                  </span>
                </v-chip>
              </div>
            </div>
            <div v-else-if="team.ignoreConstraints">
              <v-chip variant="flat" color="grey">
                {{ t('organizer.teamManagement.constraints.ignored') }}
              </v-chip>
            </div>
            <div v-else>
              <v-chip variant="flat" color="green">
                {{ t('organizer.teamManagement.constraints.valid') }}
              </v-chip>
            </div>
          </td>

          <td class="px-4 py-2 text-center">
            {{ t(`organizer.teamManagement.status.${team.status}`) }}
          </td>
          <td class="px-4 py-2 text-center">
            <div class="flex flex-row flex-wrap justify-center items-center gap-1.5">
              <!-- Lock / Unlock -->
              <v-btn
                icon
                size="small"
                :color="team.status === TeamStatus.LOCKED ? 'red' : 'primary'"
                @click="emitToggleLock(team)"
                :title="
                  team.status === TeamStatus.LOCKED
                    ? t('organizer.teamManagement.actions.unlock')
                    : t('organizer.teamManagement.actions.lock')
                "
              >
                <v-icon>
                  {{ team.status === TeamStatus.LOCKED ? 'mdi-lock' : 'mdi-lock-open-outline' }}
                </v-icon>
              </v-btn>

              <!-- Edit -->
              <v-btn
                icon
                size="small"
                color="info"
                @click="emit('edit', team)"
                :title="t('common.edit')"
                v-if="team.status === TeamStatus.UNLOCKED"
              >
                <v-icon>mdi-pencil-outline</v-icon>
              </v-btn>

              <!-- Delete single team -->
              <v-btn
                icon
                size="small"
                color="error"
                @click="emit('delete', team.id)"
                :title="t('organizer.teamManagement.actions.deleteTeam')"
                v-if="team.status === TeamStatus.UNLOCKED"
              >
                <v-icon>mdi-delete-outline</v-icon>
              </v-btn>

              <!-- Ignore Constraints -->
              <v-btn
                icon
                size="small"
                :color="team.ignoreConstraints ? 'green' : 'orange'"
                @click="emitToggleIgnoreConstraints(team)"
                :title="
                  team.ignoreConstraints
                    ? t('organizer.teamManagement.actions.considerConstraints')
                    : t('organizer.teamManagement.actions.ignoreConstraints')
                "
                v-if="team.status === TeamStatus.UNLOCKED"
              >
                <v-icon>
                  {{
                    team.ignoreConstraints ? 'mdi-shield-check-outline' : 'mdi-shield-off-outline'
                  }}
                </v-icon>
              </v-btn>
            </div>
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
</template>

<style scoped>
:deep(.v-selection-control) {
  min-height: unset;
}
:deep(.v-selection-control__wrapper) {
  width: 24px;
  height: 24px;
}
</style>
