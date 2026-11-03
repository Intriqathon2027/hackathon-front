<script lang="ts" setup>
  import { computed } from 'vue'
  import { UserReducedDTO } from '@/types/user'
  import { UserRole } from '@/types/roles'
  import { useI18n } from 'vue-i18n'

  const { t } = useI18n()

  const props = defineProps<{
    user: UserReducedDTO
    teamAvailable: boolean
  }>()

  const emit = defineEmits(['assign', 'withdraw'])

  const hasTeam = computed(() => !!props.user.teamId || !!props.user.team)

  const showAssign = computed(() => {
    switch (props.user.role) {
      case UserRole.PARTICIPANT:
        return !hasTeam.value
      case UserRole.MENTOR:
      case UserRole.JURY:
        return true
      default:
        return false
    }
  })

  const showWithdraw = computed(() => {
    switch (props.user.role) {
      case UserRole.PARTICIPANT:
        return hasTeam.value
      case UserRole.MENTOR:
        return props.user.mentorTeams?.length! > 0
      case UserRole.JURY:
        return props.user.juryTeams?.length! > 0
      default:
        return false
    }
  })
</script>

<template>
  <div class="flex flex-col justify-center items-center gap-2">
    <v-tooltip v-if="showAssign" :disabled="teamAvailable" location="top">
      <template v-slot:activator="{ props: tooltipProps }">
        <div v-bind="tooltipProps" class="inline-block">
          <v-btn
            color="primary"
            variant="outlined"
            :disabled="!teamAvailable"
            small
            @click="$emit('assign', user)"
          >
            {{ t('organizer.teamManagement.actions.assignTeam') }}
          </v-btn>
        </div>
      </template>
      <span>{{ t('organizer.teamManagement.noTeams') }}</span>
    </v-tooltip>

    <v-btn
      v-if="showWithdraw"
      color="error"
      variant="outlined"
      small
      @click="$emit('withdraw', user)"
    >
      {{ t('organizer.teamManagement.actions.withdrawTeam') }}
    </v-btn>
  </div>
</template>
