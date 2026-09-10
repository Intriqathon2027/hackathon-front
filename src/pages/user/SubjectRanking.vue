<script setup lang="ts">
  import { computed, onMounted, ref } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { storeToRefs } from 'pinia'

  import { useAuthStore } from '@/stores/auth'
  import { useConfiguration } from '@/composables/useConfiguration'
  import { ConfigurationKey } from '@/utils/configuration/configurationKey'
  import { userService } from '@/services/userService'
  import type { ConfigurationResponse, ThemesDTO } from '@/types/config'
  import AppSnackbar from '@/components/common/AppSnackbar.vue'

  interface RankedSubject {
    id: string
    name: string
    description: string
    themeName: string
  }

  const { t } = useI18n()

  const authStore = useAuthStore()
  const { user } = storeToRefs(authStore)
  const { updateUserFields } = authStore

  // Snackbar
  const snackbar = ref(false)
  const text = ref('')
  const timeout = ref(1500)
  const error = ref(false)

  const isEditing = ref(false)
  const isSaving = ref(false)
  const isLoadingRanking = ref(true)

  /** Ranking currently displayed, ordered by decreasing preference. */
  const rankedSubjectIds = ref<string[]>([])
  /** Ranking as saved on the server, used to restore the list on cancel. */
  const savedSubjectIds = ref<string[]>([])

  const { configuration: themesConfiguration, loading: isThemesLoading } = useConfiguration(
    ConfigurationKey.THEMES
  )

  const themes = computed<ThemesDTO[]>(() => {
    const config = themesConfiguration.value as ConfigurationResponse | null

    if (config?.value?.themes && Array.isArray(config.value.themes)) {
      return config.value.themes.filter(
        (theme: ThemesDTO) => theme.subjects && theme.subjects.length > 0
      )
    }
    return []
  })

  /** Every available subject, in the order defined by the organizers. */
  const availableSubjects = computed<RankedSubject[]>(() =>
    themes.value.flatMap((theme) =>
      theme.subjects.map((subject) => ({
        id: subject.id,
        name: subject.name,
        description: subject.description,
        themeName: theme.name,
      }))
    )
  )

  /**
   * Subjects sorted according to the current ranking. Subjects that are not
   * ranked yet (newly created ones) are appended at the end of the list.
   */
  const orderedSubjects = computed<RankedSubject[]>(() => {
    const subjectsById = new Map(availableSubjects.value.map((subject) => [subject.id, subject]))

    const ranked = rankedSubjectIds.value
      .map((id) => subjectsById.get(id))
      .filter((subject): subject is RankedSubject => subject !== undefined)

    const rankedIds = new Set(ranked.map((subject) => subject.id))
    const unranked = availableSubjects.value.filter((subject) => !rankedIds.has(subject.id))

    return [...ranked, ...unranked]
  })

  const isRankingChanged = computed<boolean>(() => {
    const current = orderedSubjects.value.map((subject) => subject.id)
    return (
      current.length !== savedSubjectIds.value.length ||
      current.some((id, index) => id !== savedSubjectIds.value[index])
    )
  })

  /**
   * The saved ranking is only up to date when it covers every available
   * subject, which is not the case anymore once a subject has been added.
   */
  const isRankingSaved = computed<boolean>(
    () => savedSubjectIds.value.length > 0 && !isRankingChanged.value
  )

  const loadRanking = async () => {
    if (!user.value?.id) {
      isLoadingRanking.value = false
      return
    }

    try {
      const freshUser = await userService.getById(user.value.id)
      updateUserFields(freshUser)
      savedSubjectIds.value = freshUser.favoriteSubjectIds ?? []
      rankedSubjectIds.value = [...savedSubjectIds.value]
    } catch (e) {
      console.error('Error loading the subject ranking:', e)
      text.value = t('participant.subjectRanking.loadError')
      error.value = true
      snackbar.value = true
    } finally {
      isLoadingRanking.value = false
    }
  }

  onMounted(loadRanking)

  // ---- RANKING EDITION ----

  const startEditing = () => {
    // Freeze the currently displayed order so newly added subjects keep their place.
    rankedSubjectIds.value = orderedSubjects.value.map((subject) => subject.id)
    isEditing.value = true
  }

  const cancelEditing = () => {
    rankedSubjectIds.value = [...savedSubjectIds.value]
    isEditing.value = false
    draggedIndex.value = null
    dragOverIndex.value = null
  }

  const moveSubject = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return

    const ids = orderedSubjects.value.map((subject) => subject.id)
    if (toIndex < 0 || toIndex >= ids.length) return

    const [movedId] = ids.splice(fromIndex, 1)
    ids.splice(toIndex, 0, movedId)
    rankedSubjectIds.value = ids
  }

  const confirmRanking = async () => {
    if (!user.value?.id) return

    isSaving.value = true
    try {
      const favoriteSubjectIds = orderedSubjects.value.map((subject) => subject.id)
      const savedUser = await userService.update(user.value.id, { favoriteSubjectIds })

      updateUserFields(savedUser)
      savedSubjectIds.value = savedUser.favoriteSubjectIds ?? favoriteSubjectIds
      rankedSubjectIds.value = [...savedSubjectIds.value]
      isEditing.value = false

      text.value = t('common.changesSaved')
      error.value = false
      snackbar.value = true
    } catch (e) {
      console.error('Error saving the subject ranking:', e)
      text.value = t('participant.subjectRanking.saveError')
      error.value = true
      snackbar.value = true
    } finally {
      isSaving.value = false
    }
  }

  // ---- DRAG & DROP ----

  const draggedIndex = ref<number | null>(null)
  const dragOverIndex = ref<number | null>(null)

  const onDragStart = (index: number, event: DragEvent) => {
    if (!isEditing.value) return
    draggedIndex.value = index
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move'
      // Required by Firefox to actually start the drag.
      event.dataTransfer.setData('text/plain', String(index))
    }
  }

  const onDragOver = (index: number, event: DragEvent) => {
    if (!isEditing.value || draggedIndex.value === null) return
    event.preventDefault()
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
    dragOverIndex.value = index
  }

  const onDrop = (index: number) => {
    if (!isEditing.value || draggedIndex.value === null) return
    moveSubject(draggedIndex.value, index)
    draggedIndex.value = null
    dragOverIndex.value = null
  }

  const onDragEnd = () => {
    draggedIndex.value = null
    dragOverIndex.value = null
  }
</script>

<template>
  <v-container>
    <v-row justify="center" class="mt-8">
      <div class="w-full md:w-10/12 lg:w-8/12 px-4">
        <h1 class="text-3xl font-bold">{{ t('participant.subjectRanking.title') }}</h1>

        <p class="text-gray-600 text-lg mt-4">
          {{ t('participant.subjectRanking.description') }}
        </p>
        <v-alert type="info" variant="tonal" density="comfortable" class="mt-4">
          {{ t('participant.subjectRanking.matchmakingWarning') }}
        </v-alert>

        <div class="flex items-center gap-3 my-6">
          <v-btn v-if="!isEditing" color="primary" variant="outlined" @click="startEditing">
            {{ t('participant.subjectRanking.editRanking') }}
          </v-btn>

          <template v-else>
            <v-btn
              color="primary"
              :loading="isSaving"
              :disabled="orderedSubjects.length === 0"
              @click="confirmRanking"
            >
              {{ t('participant.subjectRanking.confirmRanking') }}
            </v-btn>
            <v-btn variant="text" :disabled="isSaving" @click="cancelEditing">
              {{ t('common.cancel') }}
            </v-btn>
            <span class="text-sm text-gray-600">
              {{ t('participant.subjectRanking.dragHint') }}
            </span>
          </template>

          <v-chip
            v-if="!isEditing"
            label
            :color="isRankingSaved ? 'success' : 'warning'"
            size="small"
          >
            {{
              isRankingSaved
                ? t('participant.subjectRanking.rankingSaved')
                : t('participant.subjectRanking.rankingNotSaved')
            }}
          </v-chip>
        </div>

        <div v-if="isThemesLoading || isLoadingRanking" class="text-center py-12">
          <v-progress-circular indeterminate color="primary" size="48"></v-progress-circular>
        </div>

        <div v-else-if="orderedSubjects.length === 0" class="text-center text-gray-600 my-10">
          {{ t('participant.subjectRanking.noSubjects') }}
        </div>

        <div v-else class="flex flex-col gap-3">
          <v-card
            v-for="(subject, index) in orderedSubjects"
            :key="subject.id"
            class="px-4 py-3"
            :class="[
              isEditing ? 'cursor-move' : '',
              draggedIndex === index ? 'opacity-50' : '',
              dragOverIndex === index && draggedIndex !== index ? 'border-2 border-primary' : '',
            ]"
            :variant="isEditing ? 'outlined' : 'tonal'"
            elevation="0"
            :draggable="isEditing"
            @dragstart="onDragStart(index, $event)"
            @dragover="onDragOver(index, $event)"
            @drop="onDrop(index)"
            @dragend="onDragEnd"
          >
            <div class="flex items-start gap-4">
              <div class="flex items-center gap-2 shrink-0">
                <v-icon v-if="isEditing" color="grey" :title="t('participant.subjectRanking.drag')">
                  mdi-drag
                </v-icon>
                <v-avatar :color="index === 0 ? 'primary' : 'grey-lighten-1'" size="32">
                  <span class="font-weight-bold">{{ index + 1 }}</span>
                </v-avatar>
              </div>

              <div class="grow">
                <div class="flex items-center gap-2 flex-wrap">
                  <p class="font-semibold text-lg">{{ subject.name }}</p>
                  <v-chip v-if="index === 0" color="primary" size="x-small" label>
                    {{ t('participant.subjectRanking.favorite') }}
                  </v-chip>
                </div>
                <p class="text-sm text-gray-600">{{ subject.themeName }}</p>
                <p class="text-gray-700 mt-2 whitespace-pre-line">
                  <span v-if="subject.description">{{ subject.description }}</span>
                  <span v-else class="text-gray-400 italic">
                    {{ t('participant.subjectRanking.noDescription') }}
                  </span>
                </p>
              </div>

              <div v-if="isEditing" class="flex flex-col shrink-0">
                <v-btn
                  icon="mdi-chevron-up"
                  size="small"
                  variant="text"
                  :disabled="index === 0"
                  :title="t('participant.subjectRanking.moveUp')"
                  @click="moveSubject(index, index - 1)"
                />
                <v-btn
                  icon="mdi-chevron-down"
                  size="small"
                  variant="text"
                  :disabled="index === orderedSubjects.length - 1"
                  :title="t('participant.subjectRanking.moveDown')"
                  @click="moveSubject(index, index + 1)"
                />
              </div>
            </div>
          </v-card>
        </div>
      </div>
    </v-row>

    <AppSnackbar v-model="snackbar" :message="text" :timeout="timeout" :error="error" />
  </v-container>
</template>
