<script setup lang="ts">
  import { computed, ref, watch } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { ConstraintDTO } from '@/types/config'

  const { t } = useI18n({ useScope: 'global' })

  // -----------------------------
  // Props & Emits
  // -----------------------------
  const props = defineProps<{
    modelValue: boolean
    editMode?: boolean
    constraint?: ConstraintDTO | null
    schoolNames?: string[]
    maxTeamSize?: number
  }>()

  const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void
    (e: 'save', constraint: ConstraintDTO): void
  }>()

  // -----------------------------
  // Dialog state
  // -----------------------------
  const localModelValue = ref(props.modelValue)
  watch(
    () => props.modelValue,
    (val) => (localModelValue.value = val)
  )
  watch(localModelValue, (val) => emit('update:modelValue', val))

  const constraint = ref<ConstraintDTO>({
    rule: 'MIN',
    schools: [],
    value: 1,
    multiple: false,
  })

  const error = ref<string | null>(null)

  const ruleOptions = computed(() => [
    { title: t('common.minimum'), value: 'MIN' },
    { title: t('common.maximum'), value: 'MAX' },
    { title: t('common.equal'), value: 'EQUAL' },
  ])

  // -----------------------------
  // Reset & initialize form
  // -----------------------------
  const resetForm = () => {
    constraint.value = {
      rule: 'MIN',
      schools: [],
      value: 1,
      multiple: false,
    }
    error.value = null
  }

  const schoolsProxy = computed({
    get: (): string | string[] | null => {
      return constraint.value.multiple
        ? constraint.value.schools
        : constraint.value.schools[0] || null
    },
    set: (val: string | string[] | null) => {
      if (constraint.value.multiple) {
        constraint.value.schools = Array.isArray(val) ? val : []
      } else {
        constraint.value.schools = val ? [val as string] : []
      }
    },
  })

  const initializeForm = () => {
    if (props.editMode && props.constraint) {
      constraint.value.rule = props.constraint.rule
      constraint.value.value = props.constraint.value
      constraint.value.multiple = props.constraint.multiple
      constraint.value.schools = [...(props.constraint.schools || [])]
    } else {
      resetForm()
    }
  }

  const close = () => {
    localModelValue.value = false
    resetForm()
  }

  // -----------------------------
  // Save constraint (add or edit)
  // -----------------------------
  const save = async () => {
    if (constraint.value.value < 1) {
      error.value = t('matchmakingSettings.valueMustBePositive')
      return
    }
    if (constraint.value.schools.length === 0) {
      error.value = t('matchmakingSettings.selectAtLeastOneSchool')
      return
    }
    if (!Array.isArray(constraint.value.schools)) {
      constraint.value.schools = constraint.value.schools ? [constraint.value.schools] : []
    }

    emit('save', { ...constraint.value })
    close()
  }

  // -----------------------------
  // Watch dialog open and props changes
  // -----------------------------
  watch(
    localModelValue,
    (open) => {
      if (open) initializeForm()
    },
    { immediate: true }
  )

  watch([() => props.constraint, () => props.editMode], () => {
    if (localModelValue.value) initializeForm()
  })
</script>

<template>
  <v-dialog v-model="localModelValue" max-width="600">
    <v-card class="rounded-xl">
      <v-card-title class="text-lg font-bold px-6 pt-6 flex justify-between items-center">
        <span>
          {{
            props.editMode
              ? t('matchmakingSettings.editConstraint')
              : t('matchmakingSettings.addConstraint')
          }}
        </span>
        <v-btn icon="mdi-close" variant="text" density="compact" @click="close" aria-label="Close" />
      </v-card-title>

      <v-card-text class="px-6 py-4">
        <v-form @submit.prevent="save" class="space-y-4">
          <!-- Rule -->
          <div>
            <label class="block text-sm font-semibold text-slate-800 mb-1">
              {{ t('matchmakingSettings.rule') }}
            </label>
            <v-select
              v-model="constraint.rule"
              :items="ruleOptions"
              item-title="title"
              item-value="value"
              variant="outlined"
              density="comfortable"
              hide-details
            />
          </div>

          <!-- Value -->
          <div>
            <label class="block text-sm font-semibold text-slate-800 mb-1">
              {{ t('matchmakingSettings.numberOfPeople') }}
            </label>
            <v-text-field
              v-model.number="constraint.value"
              type="number"
              min="1"
              :max="props.maxTeamSize"
              variant="outlined"
              density="comfortable"
              hide-details
            />
          </div>

          <!-- Solo / Multiple -->
          <v-switch
            v-model="constraint.multiple"
            :label="constraint.multiple ? t('common.multiple') : t('common.individual')"
            :hint="t('matchmakingSettings.multipleHint')"
            persistent-hint
            color="primary"
            hide-details="auto"
          />

          <!-- Schools -->
          <div>
            <label class="block text-sm font-semibold text-slate-800 mb-1">
              {{ t('matchmakingSettings.schools') }}
            </label>
            <v-select
              v-if="constraint.multiple"
              v-model="schoolsProxy as unknown as string[]"
              :items="props.schoolNames"
              :placeholder="t('matchmakingSettings.selectSchools')"
              multiple
              chips
              closable-chips
              variant="outlined"
              density="comfortable"
              hide-details
            />
            <v-select
              v-else
              v-model="schoolsProxy as unknown as string"
              :items="props.schoolNames"
              :placeholder="t('matchmakingSettings.selectSchools')"
              variant="outlined"
              density="comfortable"
              hide-details
            />
          </div>

          <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mt-2">
            {{ error }}
          </v-alert>

          <v-card-actions class="justify-end gap-2 pt-4 px-0">
            <v-btn variant="text" @click="close">
              {{ t('common.cancel') }}
            </v-btn>
            <v-btn color="primary" type="submit" variant="elevated" class="px-6 font-semibold">
              {{ props.editMode ? t('common.edit') : t('common.create') }}
            </v-btn>
          </v-card-actions>
        </v-form>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>
