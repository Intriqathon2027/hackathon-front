<script setup lang="ts">
import { ref, watch } from 'vue'
import type { UserDTO } from '@/types/user'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { useI18n } from 'vue-i18n'
import {
  loginDiscord,
  loginGitHub,
  unlinkDiscord,
  unlinkGitHub,
} from '@/services/oauthService'

const { t } = useI18n()

const props = defineProps<{ user: UserDTO; editMode: boolean; adminPlatform: boolean }>()
const emit = defineEmits<{ (e: 'update:user', value: UserDTO): void }>()

const localUser = ref<UserDTO>({ ...props.user })
const unlinkingGithub = ref(false)
const unlinkingDiscord = ref(false)

const loginWithDiscord = async () => {
  await loginDiscord(props.adminPlatform, localUser.value.id!)
}

const loginWithGithub = async () => {
  await loginGitHub(props.adminPlatform, localUser.value.id!)
}

const handleUnlinkGithub = async () => {
  if (!localUser.value.id || !localUser.value.github) return
  unlinkingGithub.value = true
  try {
    await unlinkGitHub(localUser.value.id)
    localUser.value.github = null as any
    emit('update:user', { ...localUser.value })
  } catch (error) {
    console.error('Error unlinking GitHub:', error)
  } finally {
    unlinkingGithub.value = false
  }
}

const handleUnlinkDiscord = async () => {
  if (!localUser.value.id || !localUser.value.discord) return
  unlinkingDiscord.value = true
  try {
    await unlinkDiscord(localUser.value.id)
    localUser.value.discord = null as any
    emit('update:user', { ...localUser.value })
  } catch (error) {
    console.error('Error unlinking Discord:', error)
  } finally {
    unlinkingDiscord.value = false
  }
}

// Réinitialiser localUser si parent change
watch(() => props.user, (val) => (localUser.value = { ...val }), { deep: true })

// Expose méthode save
const getChanges = () => {
  return {
    id: localUser.value.id,
    firstname: localUser.value.firstname,
    lastname: localUser.value.lastname,
    email: localUser.value.email,
    role: localUser.value.role,
    github: localUser.value.github,
    discord: localUser.value.discord,
    linkedin: localUser.value.linkedin,
    teamId: localUser.value.teamId,
  }
}
const resetLocalUser = () => {
  localUser.value = { ...props.user }
}
defineExpose({ getChanges, resetLocalUser })
</script>

<template>
  <v-card class="pa-6 mb-6 full-height-card" outlined>
    <v-card-title class="text-h5 font-weight-bold mb-6 d-flex align-center">
      {{ t('profile.contacts') }}
    </v-card-title>
    <v-card-text class="flex-grow-1">
      <v-row dense>
        <!-- GitHub -->
        <v-col cols="12" class="d-flex align-center mb-2 ga-2">
          <v-btn
            base-color="black"
            :disabled="!!localUser.github"
            @click="loginWithGithub"
            class="connect-button"
          >
            <v-icon size="default" class="mr-2 flex-shrink-0">mdi-github</v-icon>
            <span>
              {{ localUser.github ? localUser.github.username : t('profile.connectGithub') }}
            </span>
          </v-btn>

          <v-btn
            color="error"
            variant="tonal"
            icon="mdi-link-off"
            size="small"
            class="flex-shrink-0"
            :disabled="!localUser.github"
            :loading="unlinkingGithub"
            :title="t('profile.unlinkGithub')"
            @click="handleUnlinkGithub"
          />
        </v-col>

        <!-- Discord -->
        <v-col cols="12" class="d-flex align-center mb-2 ga-2">
          <v-btn
            base-color="purple"
            :disabled="!!localUser.discord"
            @click="loginWithDiscord"
            class="connect-button"
          >
            <v-icon size="small" class="mr-2 flex-shrink-0">
              <FontAwesomeIcon icon="fa-brands fa-discord" />
            </v-icon>
            <span>
              {{ localUser.discord ? localUser.discord.username : t('profile.connectDiscord') }}
            </span>
          </v-btn>

          <v-btn
            color="error"
            variant="tonal"
            icon="mdi-link-off"
            size="small"
            class="flex-shrink-0"
            :disabled="!localUser.discord"
            :loading="unlinkingDiscord"
            :title="t('profile.unlinkDiscord')"
            @click="handleUnlinkDiscord"
          />
        </v-col>

        <!-- Email -->
        <v-col cols="12" class="d-flex align-center mb-2">
          <v-icon size="x-large" class="mr-4">mdi-email</v-icon>
          <div v-if="localUser.email">{{ localUser.email }}</div>
          <div v-else class="text-medium-emphasis">N/A</div>
        </v-col>

        <!-- LinkedIn -->
        <v-col cols="12" class="d-flex align-center mb-2">
          <v-icon size="x-large" class="mr-4">mdi-linkedin</v-icon>
          <div v-if="!props.editMode && localUser.linkedin">{{ localUser.linkedin }}</div>
          <div v-else-if="!props.editMode" class="text-medium-emphasis">N/A</div>
          <v-text-field
            v-else
            v-model="localUser.linkedin"
            placeholder="LinkedIn"
            variant="solo"
            class="flex-grow-1"
          />
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<style scoped>
.full-height-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.v-card-text.flex-grow-1 {
  flex-grow: 1;
}

.connect-button {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 10px;
  font-size: 0.72rem;
  letter-spacing: 0.04em;
  font-weight: 500;
  min-width: 0;
  flex: 1 1 auto;
  max-width: calc(100% - 44px);
}
</style>