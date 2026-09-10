<script setup lang="ts">
  import LanguageSelector from '@/components/common/LanguageSelector.vue'
  import { RouterLink, useRoute } from 'vue-router'
  import { useI18n } from 'vue-i18n'
  import { getRole, getTPrefix } from '@/utils/user'
  import { useHackathonLogo } from '@/composables/useHackathonLogo'
  import { ref, onMounted, watch} from 'vue'
  import { S3BucketService } from '@/services/s3BucketService'
  import { useAuthStore } from '@/stores/auth'

  import { userService } from '@/services/userService'

  const { t } = useI18n()
  const route = useRoute()
  const role = getRole()
  const tPrefix = getTPrefix(role, true)
  const userTeamId = ref<string | null>(null)

  const menuItems = [
    { path: '/user/dashboard', label: `${tPrefix}.nav.dashboard` },
    { path: '/user/announcements', label: `${tPrefix}.nav.announcements` },
    { path: '/user/team', label: `${tPrefix}.nav.teams` },
    { path: '/user/project', label: `${tPrefix}.nav.projects` },
    { path: '/user/faq', label: `${tPrefix}.nav.faq` },
    { path: '/user/subject-ranking', label: `${tPrefix}.nav.subjectRanking` },
  ]

  const getLinkClasses = (path: string) => {
    const base = 'rounded px-2 py-1 transition-transform transition-colors duration-200'
    return [
      base,
      route.path === path ? 'font-bold bg-green-700 scale-102' : '',
      'hover:bg-green-800 hover:scale-105',
    ].join(' ')
  }

  const { logoPicture } = useHackathonLogo()
  const authStore = useAuthStore()

  const profilePicture = ref('https://upload.wikimedia.org/wikipedia/commons/a/ac/Default_pfp.jpg')

  const loadData = async () => {
    if (authStore.user?.id) {
       try {
        // Fetch full user to get teamId
        const user = await userService.getById(authStore.user.id)
        if (user.teamId) {
            userTeamId.value = user.teamId
        }

        if (user.profilePicturePath) {
             const response = await S3BucketService.getFileUrl('users', user.profilePicturePath)
             profilePicture.value = response.url
        } else if (authStore.user.profilePicturePath) {
             // Fallback to auth store path if not updated or different
             const response = await S3BucketService.getFileUrl('users', authStore.user.profilePicturePath)
             profilePicture.value = response.url
        } else {
             profilePicture.value = 'https://upload.wikimedia.org/wikipedia/commons/a/ac/Default_pfp.jpg'
        }
       } catch (e) {
        console.error("Error loading user data in navbar", e)
       }
    }
  }

  // Watch for profile picture changes in the store
  watch(
    () => authStore.user?.profilePicturePath,
    () => {
      loadData()
    }
  )


  onMounted(() => {
    loadData()
  })
</script>

<template>
  <header class="p-4 bg-green-600 text-white flex justify-between items-center">
    <!-- Logo -->
    <div class="flex items-center gap-4">
      <img :src="logoPicture" alt="Logo" class="h-12" />
    </div>

    <!-- Navigation -->
    <nav class="flex gap-6">
      <RouterLink
        v-for="item in menuItems"
        :key="item.path"
        :to="
          item.path === '/user/team' && !userTeamId
            ? '/user/team'
            : item.path
        "
        :class="
          getLinkClasses(
            item.path === '/user/team' && !userTeamId
              ? '/user/team'
              : item.path
          )
        "
      >
        {{ t(item.label) }}
      </RouterLink>
    </nav>

    <!-- Actions (Language + Profile) -->
    <div class="flex items-center gap-4">
      <LanguageSelector />
      <RouterLink to="/user/profile">
        <v-btn icon class="bg-transparent">
          <v-img
            :src="profilePicture"
            alt="Profile"
            class="rounded-full"
            width="32"
            height="32"
            cover
          />
        </v-btn>
      </RouterLink>
    </div>
  </header>
</template>
