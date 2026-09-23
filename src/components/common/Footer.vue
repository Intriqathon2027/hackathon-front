<script setup lang="ts">
  import { useI18n } from 'vue-i18n'
  import { RouterLink } from 'vue-router'
  import { configurationService } from '@/services/configurationService'
  import { HackathonMediaDTO } from '@/types/config'
  import { onMounted, ref } from 'vue'
  import { PublicConfigurationKey } from '@/utils/configuration/configurationKey'

  const { t } = useI18n()

  const mediaSettings = ref<HackathonMediaDTO>({
    bannerPictureId: null,
    hackathonLogoId: null,
    evaluationGridPath: null,
    facebook: null,
    instagram: null,
    x: null,
    youtube: null,
    linkedin: null,
  })

  onMounted(async () => {
    try {
      const response = await configurationService.findOnePublic(PublicConfigurationKey.MEDIA)
      if (response && response.value) {
        mediaSettings.value = response.value
      }
    } catch (error) {
      console.error('Error fetching media settings:', error)
    }
  })
</script>

<style scoped>
  .footer-with-border {
    border-top: 1px solid #e0e0e0;
  }
</style>

<template>
  <v-footer class="pa-4 footer-with-border">
    <v-container>
      <!-- Réseaux sociaux -->
      <v-row justify="end" class="mb-2">
        <v-btn
          v-if="mediaSettings.facebook"
          icon
          variant="text"
          size="small"
          :href="mediaSettings.facebook"
          target="_blank"
        >
          <v-icon>mdi-facebook</v-icon>
        </v-btn>

        <v-btn
          v-if="mediaSettings.instagram"
          icon
          variant="text"
          size="small"
          :href="mediaSettings.instagram"
          target="_blank"
        >
          <v-icon>mdi-instagram</v-icon>
        </v-btn>

        <v-btn
          v-if="mediaSettings.x"
          icon
          variant="text"
          size="small"
          :href="mediaSettings.x"
          target="_blank"
        >
          <v-icon>mdi-twitter</v-icon>
        </v-btn>

        <v-btn
          v-if="mediaSettings.youtube"
          icon
          variant="text"
          size="small"
          :href="mediaSettings.youtube"
          target="_blank"
        >
          <v-icon>mdi-youtube</v-icon>
        </v-btn>

        <v-btn
          v-if="mediaSettings.linkedin"
          icon
          variant="text"
          size="small"
          :href="mediaSettings.linkedin"
          target="_blank"
        >
          <v-icon>mdi-linkedin</v-icon>
        </v-btn>
      </v-row>

      <!-- Mentions légales -->
      <v-row justify="space-between" align="center">
        <!-- Colonne gauche -->
        <div class="text-caption text-grey-darken-1">
          {{ t('footer.copyright') }}
          — {{ t('footer.credits') }}
        </div>

        <!-- Colonne droite -->
        <div class="d-flex align-center gap-2">
          <RouterLink to="/terms" class="text-caption text-grey-darken-1 text-decoration-none">
            {{ t('footer.terms') }}
          </RouterLink>
          |
          <RouterLink to="/privacy" class="text-caption text-grey-darken-1 text-decoration-none">
            {{ t('footer.privacyPolicy') }}
          </RouterLink>
        </div>
      </v-row>
    </v-container>
  </v-footer>
</template>
