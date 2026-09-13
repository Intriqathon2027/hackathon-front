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
  <v-dialog v-model="localModelValue" max-width="800">
    <v-card>
      <v-card-title class="text-lg font-bold px-6 pt-6">
        {{
          props.editMode
            ? t('matchmakingSettings.editConstraint')
            : t('matchmakingSettings.addConstraint')
        }}
        <v-btn icon class="absolute top-2 right-2" @click="close" aria-label="Close">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <v-card-text>
        <v-form @submit.prevent="save" class="space-y-4">
          <!-- Rule -->
          <p>{{ t('matchmakingSettings.rule') }}</p>
          <v-select
            v-model="constraint.rule"
            :items="['MIN', 'MAX', 'EQUAL']"
            :placeholder="t('matchmakingSettings.rule')"
            outlined
          />

          <!-- Value -->
          <p>{{ t('matchmakingSettings.numberOfPeople') }}</p>
          <v-text-field
            v-model="constraint.value"
            :placeholder="t('matchmakingSettings.numberOfPeople')"
            type="number"
            min="1"
            :max="props.maxTeamSize"
            outlined
          />

          <!-- Solo / Multiple -->
          <v-switch
            v-model="constraint.multiple"
            :label="constraint.multiple ? t('common.multiple') : t('common.individual')"
            :hint="t('matchmakingSettings.multipleHint')"
            color="green"
          />

          <!-- Schools -->
          <p>{{ t('matchmakingSettings.schools') }}</p>
          <v-select
            v-model="schoolsProxy as unknown as string[]"
            v-if="constraint.multiple"
            :items="props.schoolNames"
            :placeholder="t('matchmakingSettings.selectSchools')"
            multiple
            outlined
          />

          <v-select
            v-else
            v-model="schoolsProxy as unknown as string"
            :items="props.schoolNames"
            :placeholder="t('matchmakingSettings.selectSchools')"
            outlined
          />

          <p v-if="error" class="text-red-600">{{ error }}</p>

          <v-card-actions class="justify-center">
            <v-btn color="primary" type="submit" variant="elevated" class="px-8">
              {{ props.editMode ? t('common.edit') : t('common.create') }}
            </v-btn>
          </v-card-actions>
        </v-form>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>
