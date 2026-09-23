<script setup lang="ts">
  import { HackathonPhaseDTO } from '@/types/config'
  import { useI18n } from 'vue-i18n'

  const { t } = useI18n()

  defineProps<{
    phases: HackathonPhaseDTO[]
  }>()

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
      case 'SKIPPED':
      case 'IN_PROGRESS':
        return 'success'
      case 'PENDING':
        return 'warning'
      case 'NOT_STARTED':
      default:
        return 'grey-lighten-1'
    }
  }
</script>

<template>
  <v-card class="my-6 pa-4 rounded-lg elevation-2">
    <v-card-title>
      <v-icon class="mr-2">mdi-timeline-clock-outline</v-icon>
      {{ t('hackathonManagement.progress.title') }}
    </v-card-title>
    <v-card-text>
      <v-list density="compact" class="py-0">
        <v-list-item
          v-for="(phase, index) in phases"
          :key="phase.order"
          class="phase-item py-2"
          :class="{ 'last-item': index === phases.length - 1 }"
        >
          <template v-slot:prepend>
            <div class="status-indicator">
              <v-avatar :color="getStatusColor(phase.status)" size="25" class="mr-2"> </v-avatar>
            </div>
          </template>

          <v-list-item-title
            class="text-lg d-flex align-center"
            :class="{
              'text-decoration-line-through text-medium-emphasis': phase.status === 'SKIPPED',
              'font-weight-bold': phase.status === 'IN_PROGRESS',
            }"
          >
            {{ phase.name || t(`hackathon.phases.${phase.order}.defaultName`) }}

            <v-chip
              v-if="phase.status === 'SKIPPED'"
              size="small"
              color="grey-darken-1"
              variant="text"
              class="ml-2"
            >
              {{ t('hackathonManagement.progress.skipped') }}
            </v-chip>
            <v-chip
              v-if="phase.status === 'IN_PROGRESS'"
              size="small"
              color="success"
              variant="text"
              class="ml-2 font-weight-bold"
            >
              {{ t('hackathonManagement.progress.inProgress') }}
            </v-chip>
          </v-list-item-title>
        </v-list-item>
      </v-list>
    </v-card-text>
  </v-card>
</template>
