<script setup lang="ts">
  import { useI18n } from 'vue-i18n'
  import MatchmakingConfig from '@/components/organizer/matchmaking/MatchmakingConfig.vue'

  const { t } = useI18n()
</script>

<template>
  <v-container class="py-6 max-w-7xl mx-auto">
    <h1 class="text-3xl font-bold mb-6">{{ t('matchmakingSettings.title') }}</h1>
    <MatchmakingConfig :bordered="false" hide-title />
  </v-container>
</template>

