<script setup lang="ts">
  import { HackathonPhaseDTO } from '@/types/config'
  import { useI18n } from 'vue-i18n'

  const { t } = useI18n()

  // Props
  defineProps<{
    currentPhase: HackathonPhaseDTO
    action: 'begin' | 'end' | 'skip'
    isDisabled?: boolean
    skipPhase?: () => void
    endPhase?: () => void
    beginPhase?: () => void
  }>()
</script>

<template>
  <v-card class="my-6 pa-4 rounded-lg elevation-4">
    <v-row align="center" justify="space-between" no-gutters>
      <v-col cols="auto" class="d-flex align-center">
        <v-icon v-if="currentPhase.status === 'IN_PROGRESS'" color="primary" size="45" class="mr-3"
          >mdi-progress-clock</v-icon
        >
        <v-icon v-else color="secondary" size="45" class="mr-3">mdi-timer-sand</v-icon>

        <div>
          <div class="text-caption text-uppercase text-medium-emphasis">
            {{ t('hackathonManagement.currentPhase') }}
          </div>
          <div class="text-h4 font-weight-bold">
            {{ currentPhase.name || t(`hackathon.phases.${currentPhase.order}.defaultName`) }}
          </div>
        </div>
      </v-col>

      <v-col cols="auto" class="d-flex align-center">
        <v-btn
          v-if="currentPhase.optionalPhase && currentPhase.status === 'PENDING'"
          text
          color="secondary"
          size="large"
          class="mr-4"
          @click="skipPhase"
        >
          {{ t('hackathonManagement.actions.skip') }}
        </v-btn>
        <v-tooltip
          :text="t('hackathonManagement.actions.disabledReason')"
          :disabled="!isDisabled"
          location="top"
        >
          <template v-slot:activator="{ props: tooltipProps }">
            <div v-bind="tooltipProps">
              <v-btn
                v-if="currentPhase.status === 'PENDING' || currentPhase.status === 'IN_PROGRESS'"
                color="primary"
                size="large"
                @click="action === 'begin' ? beginPhase && beginPhase() : endPhase && endPhase()"
              >
                {{ t(`hackathonManagement.actions.${action}`) }}
              </v-btn>
            </div>
          </template>
        </v-tooltip>
      </v-col>
    </v-row>
  </v-card>
</template>
