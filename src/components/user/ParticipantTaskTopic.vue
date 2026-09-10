<script setup lang="ts">
  import { useI18n } from 'vue-i18n'
  import { TaskKey } from '@/types/hackathon_phase'
  import { useAuthStore } from '@/stores/auth'
  import { storeToRefs } from 'pinia'
  import { computed, onMounted } from 'vue'
  import { useRouter } from 'vue-router'
  import { useConfiguration } from '@/composables/useConfiguration'
  import { ConfigurationKey } from '@/utils/configuration/configurationKey'
  import { ThemesDTO } from '@/types/config'
  import type { ConfigurationResponse } from '@/types/config'
  import { userService } from '@/services/userService'

  const { t, tm } = useI18n()
  const router = useRouter()

  const authStore = useAuthStore()
  const { user } = storeToRefs(authStore)
  const { updateUserFields } = authStore

  const taskData = computed(() => {
    return tm(`dashboard.participant.${TaskKey.TOPIC_SELECTION}`) as
      | { title: string; description: string; [key: string]: any }
      | undefined
  })

  // The ranking may have been updated from another device, refresh it on mount.
  onMounted(async () => {
    if (!user.value?.id) return
    try {
      const freshUser = await userService.getById(user.value.id)
      updateUserFields(freshUser)
    } catch (err) {
      console.error('Error loading user:', err)
    }
  })

  const rankedSubjectIds = computed<string[]>(() => user.value?.favoriteSubjectIds ?? [])

  const isCompleted = computed<boolean>(() => rankedSubjectIds.value.length > 0)

  const { configuration: themesConfiguration } = useConfiguration(ConfigurationKey.THEMES)

  const themes = computed<ThemesDTO[]>(() => {
    const config = themesConfiguration.value as ConfigurationResponse | null

    if (config?.value?.themes && Array.isArray(config.value.themes)) {
      return config.value.themes.filter(
        (theme: ThemesDTO) => theme.subjects && theme.subjects.length > 0
      )
    }
    return []
  })

  const subjectNamesById = computed<Map<string, string>>(() => {
    const names = new Map<string, string>()
    themes.value.forEach((theme) => {
      theme.subjects.forEach((subject) => names.set(subject.id, subject.name))
    })
    return names
  })

  /** Ranked subject names, ordered by decreasing preference. */
  const rankedSubjectNames = computed<string[]>(() =>
    rankedSubjectIds.value
      .map((id) => subjectNamesById.value.get(id))
      .filter((name): name is string => name !== undefined)
  )

  const goToRanking = () => {
    router.push({ name: 'SubjectRankingPage' })
  }
</script>

<template>
  <div>
    <div class="mb-4 flex justify-between items-center">
      <h3 class="text-h6 d-flex align-center">
        <v-icon :color="isCompleted ? 'success' : 'warning'" class="mr-2">
          {{ isCompleted ? 'mdi-check-circle' : 'mdi-alert-circle' }}
        </v-icon>
        {{ taskData?.title || t('dashboard.participant.topic_selection.title') }}
      </h3>

      <v-chip label :color="isCompleted ? 'success' : 'warning'" class="mb-4">
        <v-icon size="small" class="mr-1">
          {{ isCompleted ? 'mdi-check' : 'mdi-clock-outline' }}
        </v-icon>
        {{ isCompleted ? t('common.completed') : t('common.pending') }}
      </v-chip>
    </div>

    <p class="text-medium-emphasis mb-4">
      {{ taskData?.description || '' }}
    </p>

    <div v-if="isCompleted && rankedSubjectNames.length > 0">
      <p class="mb-2">
        {{ t('dashboard.participant.topic_selection.favoriteTopicLabel') }}
        <strong>{{ rankedSubjectNames[0] }}</strong>
      </p>

      <p class="text-subtitle-2 font-weight-bold mb-1">
        {{ t('dashboard.participant.topic_selection.rankingLabel') }}
      </p>
      <ol class="list-decimal pl-6 text-medium-emphasis">
        <li v-for="name in rankedSubjectNames" :key="name">{{ name }}</li>
      </ol>
    </div>

    <div class="mt-6 d-flex justify-end">
      <v-btn color="primary" @click="goToRanking">
        {{
          isCompleted
            ? t('dashboard.participant.topic_selection.updateRanking')
            : t('dashboard.participant.topic_selection.goToRanking')
        }}
      </v-btn>
    </div>
  </div>
</template>
