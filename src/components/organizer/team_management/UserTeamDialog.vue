<script lang="ts" setup>
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { UserReducedDTO } from '@/types/user'
import { TeamDTO } from '@/types/team'

const { t } = useI18n()

const props = defineProps<{
  user: UserReducedDTO
  teams: TeamDTO[]
  type: 'assign' | 'withdraw'
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'confirm', userId: string, teamId: string ): void
  (e: 'cancel'): void
  (e: 'update:modelValue', value: boolean): void
}>()

const teamAvailable = computed(() => props.teams.length > 0)
const selectedTeamId = ref<string | null>(null)

watch(
  () => props.teams,
  (teams) => {
    if (teams.length === 1) {
      selectedTeamId.value = teams[0]?.id ?? null
    }
  },
  { immediate: true }
)

watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      if (props.teams.length === 1) {
        selectedTeamId.value = props.teams[0]?.id ?? null
      } else {
        selectedTeamId.value = null
      }
    }
  }
)

const selectedTeam = computed(() =>
  props.teams.find((t) => t.id === selectedTeamId.value) ?? null
)

const dialogTitle = computed(() =>
  props.type === 'assign'
    ? t('organizer.teamManagement.actions.assignTeamTo', {
        name: `${props.user.firstname} ${props.user.lastname}`,
      })
    : t('organizer.teamManagement.actions.withdrawTeamFrom', {
        name: `${props.user.firstname} ${props.user.lastname}`,
      })
)

const isConfirmDisabled = computed(
  () => !selectedTeam.value
)

const confirmAction = () => {
  if (selectedTeam.value) {
    emit('confirm', props.user.id, selectedTeam.value.id)
    emit('update:modelValue', false)
  }
}

const cancelAction = () => {
  emit('cancel')
  emit('update:modelValue', false)
}
</script>

<template>
  <v-dialog v-model="props.modelValue" persistent max-width="500">
    <v-card>
      <v-card-title class="text-lg font-semibold">
        {{ dialogTitle }}
      </v-card-title>

      <v-card-text>
        <template v-if="!teamAvailable">
          <p class="text-red-600 text-sm">
            {{ t('organizer.teamManagement.noTeamAvailable') }}
          </p>
        </template>



        <template v-else>
          <v-select
            v-model="selectedTeamId"
            :items="teams"
            item-title="name"
            item-value="id"
            :placeholder="t('organizer.teamManagement.actions.selectTeam')"
            outlined
            dense
          />
        </template>
      </v-card-text>

      <v-card-actions class="justify-end gap-2">
        <v-btn variant="text" color="secondary" @click="cancelAction">
          {{ t('common.cancel') }}
        </v-btn>

        <v-btn
          color="primary"
          :disabled="isConfirmDisabled || !teamAvailable"
          @click="confirmAction"
        >
          {{ type === 'assign'
            ? t('organizer.teamManagement.actions.assign')
            : t('organizer.teamManagement.actions.withdraw')
          }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
