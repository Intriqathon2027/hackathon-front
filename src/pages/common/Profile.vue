<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { logout } from '@/services/authService'
import { userService } from '@/services/userService'
import { S3BucketService } from '@/services/s3BucketService'
import type { UserDTO } from '@/types/user'

import ProfileCard from '@/components/common/profile/ProfileCard.vue'
import PersonalInfoCard from '@/components/common/profile/PersonalInfoCard.vue'
import ContactCard from '@/components/common/profile/ContactCard.vue'
import AppSnackbar from '@/components/common/AppSnackbar.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const snackbar = ref(false)
const text = ref('')
const timeout = ref(1500)
const error = ref(false)

const showConfirmLogoutDialog = ref(false)
const showConfirmDeleteAccountDialog = ref(false)

const isAdminPlatform = computed(() => route.path.startsWith('/organizer'))

const editMode = ref(false)
const userInfo = ref<UserDTO | null>(null)
const profilePicture = ref('https://upload.wikimedia.org/wikipedia/commons/a/ac/Default_pfp.jpg')

const personalInfoCard = ref<any>(null)
const contactCard = ref<any>(null)
const profileCard = ref<any>(null)

const getProfilePictureUrl = async () => {
  if (userInfo.value?.profilePicturePath) {
    try {
      const response = await S3BucketService.getFileUrl('users', userInfo.value.profilePicturePath)
      profilePicture.value = response.url
    } catch (err) {
      console.error('Error fetching profile picture:', err)
    }
  } else {
    profilePicture.value = 'https://upload.wikimedia.org/wikipedia/commons/a/ac/Default_pfp.jpg'
  }
}

onMounted(async () => {
  if (authStore.user?.id) {
    try {
      const userResponse = await userService.getById(authStore.user.id)
      userInfo.value = userResponse
      if (userResponse.profilePicturePath) getProfilePictureUrl()
    } catch (err) {
      console.error('Error fetching user data:', err)
    }
  }
})

const handleEdit = () => { editMode.value = true }
const cancelEdit = () => { 
  editMode.value = false
  personalInfoCard.value?.resetLocalUser()
  contactCard.value?.resetLocalUser()
  profileCard.value?.resetLocalUser()
}

const onSaveClick = async () => {
    try {
        const profileChanges = await profileCard.value?.getChanges() || {}
        const personalInfoChanges = personalInfoCard.value?.getChanges() || {}
        const contactChanges = contactCard.value?.getChanges() || {}

        // Check if profile picture is being deleted (it exists currently but change is null)
        const isDeletingProfilePicture = userInfo.value?.profilePicturePath && profileChanges.profilePicturePath === null

        const { favoriteSubjectIds, createdAt, supabaseUserId, team, juryTeams, mentorTeams, ...safeUser } = (userInfo.value || {}) as any

        const updatedUser = {
            ...safeUser,
            ...profileChanges,
            ...personalInfoChanges,
            ...contactChanges
        }

        const savedUser = await userService.update(updatedUser.id, updatedUser)
        userInfo.value = savedUser

        authStore.updateUserFields(savedUser)
        getProfilePictureUrl()
        editMode.value = false
        text.value = t('common.changesSaved')
        error.value = false
        snackbar.value = true

        if (isDeletingProfilePicture) {
           setTimeout(() => {
             window.location.reload()
           }, 1000)
        }
    } catch (err) {
        console.error('Error saving user:', err)
        text.value = t('common.error')
        error.value = true
        snackbar.value = true
    }
}

const handleLogout = async () => {
  try {
    await logout()
    router.push(isAdminPlatform.value ? '/admin-login' : '/login')
  } catch (err) {
    console.error(err)
    text.value = t('errors.loadUserFailed')
    error.value = true
    snackbar.value = true
  }
}

const handleDeleteAccount = async () => {
  try {
    if (authStore.user?.id) {
      await userService.remove(authStore.user.id)
      await logout()
    }
  } catch (err) {
    console.error('Delete account error:', err)
  }
}

const confirmLogout = () => showConfirmLogoutDialog.value = true
const confirmDeleteAccount = () => showConfirmDeleteAccountDialog.value = true
</script>

<template>
  <v-container v-if="userInfo">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-3xl font-bold mb-2">{{ t('profile.mainTitle') }}</h1>
      <div v-if="!editMode">
        <v-btn color="primary" @click="handleEdit">{{ t('profile.personalInfo.editButton') }}</v-btn>
      </div>
      <div v-else>
        <v-btn color="grey" class="mr-2" @click="cancelEdit">{{ t('common.cancel') }}</v-btn>
        <v-btn color="primary" class="ml-2" @click="onSaveClick">
          {{ t('common.saveChanges') }}
        </v-btn>
      </div>
    </div>

    <ProfileCard 
      ref="profileCard"
      :user="userInfo" 
      :profile-picture="profilePicture" 
      :edit-mode="editMode"
    />

    <v-row class="equal-height-row">
      <v-col cols="12" md="8">
        <PersonalInfoCard
          ref="personalInfoCard"
          :user="userInfo"
          :edit-mode="editMode"
        />
      </v-col>
      <v-col cols="12" md="4">
        <ContactCard
          ref="contactCard"
          :user="userInfo"
          :edit-mode="editMode"
          :adminPlatform="isAdminPlatform"
        />
      </v-col>
    </v-row>

    <div class="flex justify-center gap-4 mt-4">
      <v-btn color="red" @click="confirmLogout">{{ t('common.logout') }}</v-btn>
      <v-btn color="red-darken-4" @click="confirmDeleteAccount">{{ t('profile.deleteAccount') }}</v-btn>
    </div>

    <AppSnackbar v-model="snackbar" :message="text" :timeout="timeout" :error="error" />

    <ConfirmDialog
      v-model="showConfirmLogoutDialog"
      :title="t('profile.logoutConfirmTitle')"
      :text="t('profile.logoutConfirmText')"
      :confirm-label="t('profile.confirmButton')"
      :cancel-label="t('common.cancel')"
      @confirm="handleLogout"
    />
    <ConfirmDialog
      v-model="showConfirmDeleteAccountDialog"
      :title="t('profile.deleteAccount')"
      :text="t('profile.deleteAccountText')"
      :confirm-label="t('profile.deleteAccountConfirm')"
      :cancel-label="t('common.cancel')"
      @confirm="handleDeleteAccount"
    />
  </v-container>
</template>

<style scoped>
.equal-height-row { display: flex; flex-wrap: wrap; align-items: stretch; }
</style>
