<script setup lang="ts">
  import { useI18n } from 'vue-i18n'
  import { useUser } from '@/composables/useUser'
  import { computed, ref, watch } from 'vue'
  import { UserRole } from '@/types/roles'
  import { ThemesDTO } from '@/types/config'
  import { ConfigurationKey } from '@/utils/configuration/configurationKey'
  import { useConfiguration } from '@/composables/useConfiguration'
  import type { ConfigurationResponse } from '@/types/config'

  const { t } = useI18n()

  defineProps<{
    phaseName: string
  }>()

  const emit = defineEmits(['update:topicSelection'])

  // ---- COLORS ----
  const chartColors = [
    'blue-darken-2',
    'purple-darken-1',
    'green-darken-2',
    'orange-darken-2',
    'teal-darken-1',
    'red-darken-1',
    'indigo-darken-1',
    'brown-darken-1',
    'pink-darken-1',
  ]

  const subjectColors = ref<Map<string, string>>(new Map())

  const getRandomColor = (): string => {
    const randomIndex = Math.floor(Math.random() * chartColors.length)
    return chartColors[randomIndex]
  }

  // ---- DATA AND COMPUTED PROPERTIES ----

  const { users } = useUser()

  const { configuration: themesConfiguration } = useConfiguration(ConfigurationKey.THEMES)

  const themes = computed<ThemesDTO[]>(() => {
    const config = themesConfiguration.value as ConfigurationResponse | null

    if (config?.value?.themes && Array.isArray(config.value.themes)) {
      return config.value.themes as ThemesDTO[]
    }
    return []
  })

  const topicSelectedCount = computed(() => {
    return users.value.filter(
      (user) => user.role === UserRole.PARTICIPANT && (user.favoriteSubjectIds?.length ?? 0) > 0
    ).length
  })

  const totalCount = computed(
    () => users.value.filter((user) => user.role === UserRole.PARTICIPANT).length
  )

  const completionPercentage = computed(() => {
    if (totalCount.value === 0) {
      return 0
    }
    return Math.round((topicSelectedCount.value / totalCount.value) * 100)
  })

  const isTopicSelectionCompleteCondition = computed(() => {
    return completionPercentage.value === 100
  })

  watch(
    isTopicSelectionCompleteCondition,
    (newValue) => {
      emit('update:topicSelection', newValue)
    },
    { immediate: true }
  )

  // ---- SUBJECT DISTRIBUTION ----

  const subjectMap = computed(() => {
    const map = new Map<string, string>()
    themes.value.forEach((theme) => {
      theme.subjects.forEach((subject) => {
        map.set(subject.id, subject.name)
      })
    })
    return map
  })

  const subjectDistribution = computed(() => {
    const counts = new Map<string, number>()

    users.value.forEach((user) => {
      // Only the favorite subject (first of the ranking) is counted
      const subjectId = user.favoriteSubjectIds?.[0]
      if (subjectId) {
        counts.set(subjectId, (counts.get(subjectId) || 0) + 1)
      }
    })

    const distribution: { name: string; count: number; percentage: number; color: string }[] = []

    subjectMap.value.forEach((name, id) => {
      const count = counts.get(id) || 0
      const percentage =
        topicSelectedCount.value === 0 ? 0 : (count / topicSelectedCount.value) * 100

      let color = subjectColors.value.get(id)
      if (!color) {
        color = getRandomColor()
        subjectColors.value.set(id, color)
      }

      distribution.push({
        name,
        count,
        percentage: Math.round(percentage),
        color: color,
      })
    })

    return distribution.sort((a, b) => b.count - a.count)
  })
</script>

<template>
  <v-card variant="flat">
    <v-card-title class="text-title-2 pb-0">
      {{ phaseName }}
    </v-card-title>

    <v-card-text>
      <div>
        <div class="text-subtitle-1 font-weight-bold mb-2">
          {{ t('hackathonManagement.stats.topicChoice') }}
        </div>
        <div class="d-flex align-baseline text-h4 font-weight-bold mb-4">
          <span class="mr-2 text-green-darken-2">{{ completionPercentage }}%</span>
          <span class="text-subtitle-1 font-weight-regular text-medium-emphasis">
            ({{ topicSelectedCount }} / {{ totalCount }})
          </span>
        </div>

        <v-progress-linear
          :model-value="completionPercentage"
          height="10"
          rounded
          color="green-darken-2"
          class="mb-2"
        ></v-progress-linear>
      </div>

      <v-divider class="mb-6"></v-divider>

      <div>
        <div class="text-subtitle-1 font-weight-bold mb-2">
          {{ t('hackathonManagement.stats.topicDistribution') }}
        </div>

        <div v-if="topicSelectedCount === 0" class="text-caption text-medium-emphasis">
          {{ t('hackathonManagement.stats.noTopicsSelected') }}
        </div>

        <div v-else class="subject-distribution">
          <div v-for="item in subjectDistribution" :key="item.name" class="mb-3">
            <div class="text-caption font-weight-medium mb-1">{{ item.name }}</div>

            <div class="d-flex align-center">
              <v-progress-linear
                :model-value="item.percentage"
                :color="item.color"
                height="10"
                rounded
                class="mr-3"
              ></v-progress-linear>
              <span class="text-caption font-weight-bold" :class="`text-${item.color}`">
                {{ item.count }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>
