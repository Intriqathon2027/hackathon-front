<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { PropType } from 'vue'
import {
  ConstraintDTO,
  MatchmakingAlgorithm,
  MatchmakingSettingsDTO,
  PartnersDTO,
} from '@/types/config'
import Constraints from './Constraints.vue'
import ConstraintForm from './ConstraintForm.vue'
import { ConfigurationKey } from '@/utils/configuration/configurationKey'
import { useConfiguration } from '@/composables/useConfiguration'
import AppSnackbar from '@/components/common/AppSnackbar.vue'

const props = defineProps({
  algorithmMode: {
    type: String as PropType<MatchmakingAlgorithm>,
    default: 'legacy',
  },
  title: {
    type: String,
    default: '',
  },
  bordered: {
    type: Boolean,
    default: true,
  },
  hideTitle: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits<{
  (e: 'saved', settings: MatchmakingSettingsDTO): void
  (e: 'update:algorithmMode', mode: MatchmakingAlgorithm): void
}>()

const { t, locale } = useI18n({ useScope: 'global' })

// Configurations
const {
  configuration: matchmakingConfig,
  loading: matchmakingLoading,
  updateConfiguration: updateMatchmaking,
} = useConfiguration(ConfigurationKey.MATCHMAKING)

const { configuration: partnersConfig, loading: partnersLoading } = useConfiguration(
  ConfigurationKey.PARTNERS
)

// UI Feedback
const snackbar = ref(false)
const snackbarText = ref(t('common.changesSaved'))
const snackbarTimeout = ref(2000)
const snackbarError = ref(false)

const errorMessage = ref<string>('')
const isSaving = ref(false)
const showCriterionForm = ref(false)

const isLoading = computed(() => matchmakingLoading.value || partnersLoading.value)
const isManual = computed(() => props.algorithmMode === 'manual')

// Matchmaking state
const matchmakingSettings = ref<MatchmakingSettingsDTO>({
  isActive: true,
  teamSizeMin: 1,
  teamSizeMax: 4,
  maxTeamsPerSubject: 2,
  constraints: [],
  algorithm: props.algorithmMode,
})

const schoolNames = ref<string[]>([])

// Populate schools from partners configuration
watch(
  partnersConfig,
  (newConfig) => {
    if (newConfig && newConfig.value && Array.isArray(newConfig.value.partners)) {
      const partners = newConfig.value.partners as PartnersDTO[]
      schoolNames.value = partners.filter((p) => p.isParticipatingSchool).map((p) => p.name)
    } else {
      schoolNames.value = []
    }
  },
  { immediate: true }
)

// Populate matchmaking settings from configuration
watch(
  matchmakingConfig,
  (newConfig) => {
    if (newConfig && newConfig.value) {
      const val = newConfig.value as MatchmakingSettingsDTO & { maxTeamsPerTopic?: number }
      matchmakingSettings.value = {
        isActive: true,
        teamSizeMin: val.teamSizeMin ?? 1,
        teamSizeMax: val.teamSizeMax ?? 4,
        maxTeamsPerSubject: val.maxTeamsPerSubject ?? val.maxTeamsPerTopic ?? 2,
        constraints: val.constraints ? [...val.constraints] : [],
        algorithm: val.algorithm ?? props.algorithmMode,
      }
      if (val.algorithm && val.algorithm !== props.algorithmMode) {
        emit('update:algorithmMode', val.algorithm)
      }
    }
  },
  { immediate: true }
)

// Watch algorithmMode prop change to update internal state
watch(
  () => props.algorithmMode,
  (newMode) => {
    matchmakingSettings.value.algorithm = newMode
  }
)

const hasConstraints = computed(
  () => matchmakingSettings.value.constraints && matchmakingSettings.value.constraints.length > 0
)

const validateConstraints = (constraints: ConstraintDTO[]) => {
  const schoolMap: Record<string, ConstraintDTO[]> = {}

  constraints.forEach((constraint) => {
    constraint.schools.forEach((school) => {
      if (!schoolMap[school]) schoolMap[school] = []
      schoolMap[school].push(constraint)
    })
  })

  const errors: string[] = []

  Object.entries(schoolMap).forEach(([school, cons]) => {
    const rules = cons.map((c) => c.rule)
    const counts = rules.reduce<Record<string, number>>((acc, r) => {
      acc[r] = (acc[r] || 0) + 1
      return acc
    }, {})

    // Verify uniqueness of rules
    if (counts.MIN && counts.MIN > 1) {
      errors.push(`${t('matchmakingSettings.errors.moreThanOneMin')}${school}`)
    }
    if (counts.MAX && counts.MAX > 1) {
      errors.push(`${t('matchmakingSettings.errors.moreThanOneMax')}${school}`)
    }
    if (counts.EQUAL && counts.EQUAL > 1) {
      errors.push(`${t('matchmakingSettings.errors.moreThanOneEqual')}${school}`)
    }
    if (counts.EQUAL && (counts.MIN || counts.MAX)) {
      errors.push(`${t('matchmakingSettings.errors.incompatibleRules')}${school}`)
    }

    // Check MIN/MAX coherence
    const minConstraint = cons.find((c) => c.rule === 'MIN')
    const maxConstraint = cons.find((c) => c.rule === 'MAX')

    if (minConstraint && maxConstraint) {
      const minValue = Number(minConstraint.value)
      const maxValue = Number(maxConstraint.value)
      if (minValue > maxValue) {
        errors.push(`${t('matchmakingSettings.errors.minGreaterThanMax')}${school}`)
      }
    }
  })

  return errors
}

const handleSave = async () => {
  isSaving.value = true
  try {
    const minSize = Number(matchmakingSettings.value.teamSizeMin)
    const maxSize = Number(matchmakingSettings.value.teamSizeMax)
    const maxTeamsPerSub = Number(matchmakingSettings.value.maxTeamsPerSubject)

    if (!maxTeamsPerSub || maxTeamsPerSub < 1) {
      errorMessage.value = `${t('matchmakingSettings.maxTeamsPerSubject')} : ${t('matchmakingSettings.valueMustBePositive')}`
      isSaving.value = false
      return
    }

    const payload: MatchmakingSettingsDTO = {
      ...matchmakingSettings.value,
      algorithm: props.algorithmMode,
      teamSizeMin: minSize,
      teamSizeMax: maxSize,
      maxTeamsPerSubject: maxTeamsPerSub,
      maxTeamsPerTopic: maxTeamsPerSub,
      constraints: matchmakingSettings.value.constraints.map((c) => ({
        ...c,
        value: Number(c.value),
      })),
    }

    await updateMatchmaking({ value: payload })

    snackbarText.value = t('common.changesSaved')
    snackbarError.value = false
    snackbar.value = true

    emit('saved', payload)
  } catch (e) {
    console.error('Error saving matchmaking settings:', e)
    snackbarText.value = t('common.error')
    snackbarError.value = true
    snackbar.value = true
  } finally {
    isSaving.value = false
  }
}

const deleteConstraint = (criterion: ConstraintDTO) => {
  matchmakingSettings.value.constraints = matchmakingSettings.value.constraints.filter(
    (c) => c !== criterion
  )
  handleSave()
}

const addConstraint = (criterion: ConstraintDTO) => {
  const temporaryConstraints = [...matchmakingSettings.value.constraints, criterion]
  const validationErrors = validateConstraints(temporaryConstraints)
  if (validationErrors.length > 0) {
    errorMessage.value = validationErrors.join(', ')
    return
  }
  matchmakingSettings.value.constraints.push(criterion)
  errorMessage.value = ''
  handleSave()
}

const updateConstraint = (index: number | undefined, updatedCriterion: ConstraintDTO) => {
  const temporaryConstraints = matchmakingSettings.value.constraints.map((c, i) =>
    i === index ? updatedCriterion : c
  )
  const validationErrors = validateConstraints(temporaryConstraints)
  if (validationErrors.length > 0) {
    errorMessage.value = validationErrors.join(', ')
    return
  }
  if (index === undefined) return
  matchmakingSettings.value.constraints[index] = updatedCriterion
  errorMessage.value = ''
  handleSave()
}
</script>

<template>
  <div
    class="rounded-xl transition-all relative"
    :class="[
      bordered ? 'border-2 p-6 shadow-xs' : 'p-2',
      isManual
        ? 'bg-slate-100/90 dark:bg-slate-900/60 border-slate-300 dark:border-slate-700 opacity-60 pointer-events-none select-none'
        : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700'
    ]"
  >
    <!-- Card Header with Title and Save Button -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800 mb-6">
      <div>
        <div class="flex items-center gap-3">
          <h2 v-if="!hideTitle" class="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <v-icon color="primary" size="24">mdi-tune-vertical</v-icon>
            {{ title || t('organizer.teamManagement.configSectionTitle') }}
          </h2>
          <v-chip
            v-if="isManual"
            color="grey-darken-1"
            size="small"
            prepend-icon="mdi-lock-outline"
            variant="flat"
          >
            {{ t('organizer.teamManagement.modes.manual.notEditableBadge') }}
          </v-chip>
        </div>
        <p class="text-sm text-slate-500 mt-1">
          {{ t('matchmakingSettings.subtitle') }}
        </p>
      </div>

      <v-btn
        color="primary"
        variant="elevated"
        prepend-icon="mdi-content-save"
        @click="handleSave"
        :loading="isSaving"
        :disabled="isLoading || isSaving || isManual"
      >
        {{ t('common.saveChanges') }}
      </v-btn>
    </div>

    <!-- Mode Context Alert Banner -->
    <div
      v-if="algorithmMode === 'new'"
      class="mb-6 p-4 rounded-lg bg-purple-50 border border-purple-200 text-purple-900 flex items-start gap-3"
    >
      <v-icon color="purple-darken-2" class="mt-0.5">mdi-creation-outline</v-icon>
      <div class="text-sm">
        <span class="font-semibold">{{ t('organizer.teamManagement.modes.new.title') }} : </span>
        {{ t('organizer.teamManagement.modes.new.configNotice') }}
      </div>
    </div>

    <div
      v-else-if="algorithmMode === 'legacy'"
      class="mb-6 p-4 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 flex items-start gap-3"
    >
      <v-icon color="blue-darken-2" class="mt-0.5">mdi-history</v-icon>
      <div class="text-sm">
        <span class="font-semibold">{{ t('organizer.teamManagement.modes.legacy.title') }} : </span>
        {{ t('organizer.teamManagement.modes.legacy.configNotice') }}
      </div>
    </div>

    <div
      v-else-if="algorithmMode === 'manual'"
      class="mb-6 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3"
    >
      <v-icon color="amber-darken-3" class="mt-0.5">mdi-account-edit-outline</v-icon>
      <div class="text-sm">
        <span class="font-semibold">{{ t('organizer.teamManagement.modes.manual.title') }} : </span>
        {{ t('organizer.teamManagement.modes.manual.configNotice') }}
      </div>
    </div>

    <!-- Team Sizes & Topic Constraints Configuration -->
    <div class="space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label class="block text-sm font-semibold text-slate-700 mb-1">
            {{ t('matchmakingSettings.minTeamSize') }} *
          </label>
          <v-text-field
            v-model="matchmakingSettings.teamSizeMin"
            type="number"
            min="1"
            density="compact"
            variant="outlined"
            hide-details
            :disabled="isManual"
            prepend-inner-icon="mdi-account-multiple-minus"
          ></v-text-field>
        </div>

        <div>
          <label class="block text-sm font-semibold text-slate-700 mb-1">
            {{ t('matchmakingSettings.maxTeamSize') }} *
          </label>
          <v-text-field
            v-model="matchmakingSettings.teamSizeMax"
            type="number"
            :min="matchmakingSettings.teamSizeMin"
            density="compact"
            variant="outlined"
            hide-details
            :disabled="isManual"
            prepend-inner-icon="mdi-account-multiple-plus"
          ></v-text-field>
        </div>

        <div>
          <label class="block text-sm font-semibold text-slate-700 mb-1">
            {{ t('matchmakingSettings.maxTeamsPerSubject') }} *
          </label>
          <v-text-field
            v-model="matchmakingSettings.maxTeamsPerSubject"
            type="number"
            min="1"
            density="compact"
            variant="outlined"
            hide-details
            :disabled="isManual"
            prepend-inner-icon="mdi-folder-account-outline"
          ></v-text-field>
        </div>
      </div>

      <!-- Constraints Section -->
      <div class="pt-4 border-t border-slate-200 dark:border-slate-800">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 class="text-lg font-bold text-slate-800 flex items-center gap-2">
              <v-icon size="20" color="primary">mdi-shield-check-outline</v-icon>
              {{ t('matchmakingSettings.constraint') }}
            </h3>
            <p class="text-xs text-slate-500">
              {{ t('matchmakingSettings.schoolQuotaSubtitle') }}
            </p>
          </div>

          <v-btn
            color="primary"
            variant="tonal"
            size="small"
            prepend-icon="mdi-plus"
            :disabled="isManual"
            @click="showCriterionForm = true"
          >
            {{ t('matchmakingSettings.addConstraintBtn') }}
          </v-btn>
        </div>

        <v-alert
          v-if="errorMessage"
          type="error"
          variant="tonal"
          density="compact"
          class="mb-4"
          closable
          @click:close="errorMessage = ''"
        >
          {{ errorMessage }}
        </v-alert>

        <div v-if="!hasConstraints" class="p-6 text-center bg-slate-50 dark:bg-slate-800 rounded-lg text-slate-500 text-sm">
          <v-icon size="36" class="mb-2 text-slate-400">mdi-clipboard-text-off-outline</v-icon>
          <p>{{ t('matchmakingSettings.noConstraints') }}</p>
        </div>

        <Constraints
          v-if="hasConstraints"
          :constraints="matchmakingSettings.constraints || []"
          :items-per-page="5"
          :school-names="schoolNames"
          :max-team-size="matchmakingSettings.teamSizeMax"
          :disabled="isManual"
          @delete="deleteConstraint"
          @edit="updateConstraint"
        />

        <ConstraintForm
          v-model="showCriterionForm"
          :school-names="schoolNames"
          :edit-mode="false"
          :max-team-size="Number(matchmakingSettings.teamSizeMax)"
          @save="addConstraint"
        />
      </div>
    </div>

    <AppSnackbar
      v-model="snackbar"
      :message="snackbarText"
      :timeout="snackbarTimeout"
      :error="snackbarError"
    />
  </div>
</template>
