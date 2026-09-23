<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { getRole, getTPrefix } from '@/utils/user'
import { userService } from '@/services/userService'
import { useAuthStore } from '@/stores/auth'
import type { UserDTO } from '@/types/user'
import { SubmissionDTO } from '@/types/submission'
import { submissionService } from '@/services/submissionService'
import { teamService } from '@/services/teamService'
import { TeamDTO } from '@/types/team'
import { S3BucketService } from '@/services/s3BucketService'
import { usePhaseStore } from '@/stores/phase'

const authStore = useAuthStore()
const phaseStore = usePhaseStore()

const userInfo = ref<UserDTO | null>(null)
const teamInfo = ref<TeamDTO | null>(null)
const submissionInfo = ref<SubmissionDTO | null>(null)
const dueDate = ref<Date | null>(null)
const loading = ref(false)

// État pour l'upload
const selectedFile = ref<File | null>(null)
const uploading = ref(false)
const uploadError = ref('')
const uploadSuccess = ref(false)

onMounted(async () => {
  await phaseStore.fetchPhases()
  if (authStore.user?.id) {
    try {
      loading.value = true
      const userResponse = await userService.getById(authStore.user.id)
      userInfo.value = userResponse
      if (!userResponse.teamId) return

      const teamResponse = await teamService.getById(userResponse.teamId)
      teamInfo.value = teamResponse

      const submissionResponse = await submissionService.getbyTeamId(userResponse.teamId) as SubmissionDTO | null
      submissionInfo.value = submissionResponse
      if (!submissionInfo.value) {
        submissionInfo.value = await submissionService.create(userResponse.teamId)
      }

      const date = await submissionService.getDueDate()
      dueDate.value = new Date(date)
    } catch (err) {
      console.error('Error fetching user data:', err)
    } finally {
      loading.value = false
    }
  }
})

const { t } = useI18n()
const role = getRole()
const tPrefix = getTPrefix(role, true)

const formatDate = (dateVal?: string | Date | null) => {
  if (!dateVal) return '-'
  const date = new Date(dateVal)
  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const statusLabel = computed(() => {
  if (!submissionInfo.value?.status) return  t(`${tPrefix}.submission.status.notSubmitted`)
  const statusMap = {
    NOT_SUBMITTED: t(`${tPrefix}.submission.status.notSubmitted`),
    PENDING: t(`${tPrefix}.submission.status.pending`),
    GRADED: t(`${tPrefix}.submission.status.graded`)
  }
  return statusMap[submissionInfo.value.status as unknown as keyof typeof statusMap] || submissionInfo.value.status
})

const statusColor = computed(() => {
  if (!submissionInfo.value?.status) return 'grey'
  const colorMap = {
    NOT_SUBMITTED: 'grey',
    PENDING: 'orange',
    GRADED: 'green'
  }
  return colorMap[submissionInfo.value.status as unknown as keyof typeof colorMap] || 'grey'
})

const timeRemaining = computed(() => {
  if (!dueDate.value) return '-'
  const diff = new Date(dueDate.value).getTime() - Date.now()
  if (diff <= 0) return t(`${tPrefix}.submission.status.deadlineExceeded`)
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  
  if (days > 0) return `${days}j ${hours}h ${minutes}min`
  return `${hours}h ${minutes}min`
})

const hasEvaluations = computed(() => {
  return submissionInfo.value?.evaluations && submissionInfo.value.evaluations.length > 0
})

const hasComments = computed(() => {
  return submissionInfo.value?.comments && submissionInfo.value.comments.length > 0
})

const isDeadlineExceeded = computed(() => {
  if (!dueDate.value) return false
  return new Date(dueDate.value).getTime() < Date.now()
})

const isSubmissionPhase = computed(() => phaseStore.currentPhase?.order === 4)

// Gestion de l'upload
const handleUpload = async () => {
  if (!selectedFile.value) {
    uploadError.value = 'Veuillez sélectionner un fichier'
    return
  }

  // Vérifier l'extension du fichier
  if (!selectedFile.value.name.endsWith('.zip')) {
    uploadError.value = t(`${tPrefix}.submission.upload.zipOnlyError`)
    return
  }

  uploading.value = true
  uploadError.value = ''
  uploadSuccess.value = false

  try {
    // Upload du fichier vers S3
    const result = await S3BucketService.uploadFile(selectedFile.value, 'submissions')
    
    // Mettre à jour la soumission avec le chemin du fichier
    if (submissionInfo.value?.id) {
      await submissionService.update({
        teamId: submissionInfo.value.teamId,
        submissionFilePath: result.path,
      })
      
      // Recharger les informations de soumission
      if (userInfo.value?.teamId) {
        submissionInfo.value = await submissionService.getbyTeamId(userInfo.value.teamId) as SubmissionDTO | null
      }
    }
    
    uploadSuccess.value = true
    setTimeout(() => {
      uploadSuccess.value = false
    }, 3000)

    console.log('File uploaded successfully:', result.path)
  } catch (error) {
    console.error('Error uploading file:', error)
    uploadError.value = t(`${tPrefix}.submission.upload.uploadError`)
  } finally {
    uploading.value = false
  }
}

const downloadSubmissionFile = async () => {
  if (!submissionInfo.value?.submissionFilePath) return
  
  try {
    const { url } = await S3BucketService.getFileUrl('submissions', submissionInfo.value.submissionFilePath)
    window.open(url, '_blank')
  } catch (error) {
    console.error('Error downloading file:', error)
  }
}

</script>

<template>
  <v-container class="py-10">
    <h1 class="text-3xl font-bold mb-8">{{ t(`${tPrefix}.submission.title`) }}</h1>

    <v-progress-linear v-if="loading" indeterminate color="primary" class="mb-4" />

    <!-- Bloc principal - Soumission -->
    <v-card class="pa-6 mb-6">
      <h2 class="text-xl font-semibold mb-4">{{ t(`${tPrefix}.submission.team.title`) }} {{ teamInfo?.name || '-' }}</h2>

      <v-row class="mb-4">
        <v-col cols="12">
          <h3>
            <span v-if="submissionInfo?.githubLink">
              <a
                :href="submissionInfo.githubLink"
                target="_blank"
                rel="noopener noreferrer"
                style="color: #1e88e5; text-decoration: underline;"
              >
                {{ submissionInfo.githubLink }}
              </a>
            </span>
            <span v-else>{{ t(`${tPrefix}.submission.team.noGithubLink`) }}</span>
          </h3>
        </v-col>
      </v-row>

      <h3 class="text-base font-semibold mb-3">{{ t(`${tPrefix}.submission.upload.title`) }}</h3>
      <v-row align="center" class="mb-2">
        <v-col cols="12" md="8">
          <v-file-input
            v-model="selectedFile"
            :label="t(`${tPrefix}.submission.upload.chooseFile`)"
            variant="outlined"
            density="comfortable"
            accept=".zip"
            prepend-icon="mdi-paperclip"
            :hide-details="!uploadError"
            :error-messages="uploadError"
            :disabled="uploading || isDeadlineExceeded || !isSubmissionPhase"
          />
        </v-col>
        <v-col cols="12" md="4">
          <v-btn 
            color="primary" 
            block
            @click="handleUpload"
            :loading="uploading"
            :disabled="!selectedFile || uploading || isDeadlineExceeded || !isSubmissionPhase"
          >
            <v-icon left>mdi-upload</v-icon>
            {{ t(`${tPrefix}.submission.upload.uploadButton`) }}
          </v-btn>
        </v-col>
      </v-row>

      <v-alert
        v-if="!isDeadlineExceeded && !isSubmissionPhase"
        type="warning"
        variant="tonal"
        class="mb-4"
      >
        {{ t(`${tPrefix}.submission.phaseClosed`) }}
      </v-alert>

      <v-alert
        v-if="uploadSuccess"
        type="success"
        variant="tonal"
        class="mt-4"
        closable
      >
        {{ t(`${tPrefix}.submission.upload.uploadSuccess`) }}
      </v-alert>

      <v-alert
        v-if="submissionInfo?.submissionFilePath"
        type="success"
        variant="tonal"
        class="mt-4"
      >
        <v-row align="center">
          <v-col cols="auto">
            <v-icon>mdi-file-check</v-icon>
          </v-col>
          <v-col>
                    {{ t(`${tPrefix}.submission.upload.fileUploaded`) }}
 : {{ submissionInfo.submissionFilePath.split('/').pop() }}
          </v-col>
          <v-col cols="auto">
            <v-btn
              variant="outlined"
              size="small"
              prepend-icon="mdi-download"
              @click="downloadSubmissionFile"
            >
              {{ t(`${tPrefix}.submission.upload.download`) }}
            </v-btn>
          </v-col>
        </v-row>
      </v-alert>
    </v-card>

    <!-- Statut de remise -->
    <v-card class="pa-6 mb-6">
      <h2 class="text-xl font-semibold mb-4">{{ t(`${tPrefix}.submission.status.title`) }}</h2>

      <v-table density="comfortable">
        <tbody>
          <tr>
            <td class="font-weight-bold">{{ t(`${tPrefix}.submission.status.team`) }}</td>
            <td>{{ teamInfo?.name || '-' }}</td>
          </tr>
          <tr>
            <td class="font-weight-bold">{{ t(`${tPrefix}.submission.status.status`) }}</td>
            <td>
              <v-chip :color="statusColor" size="small">
                {{ statusLabel }}
              </v-chip>
            </td>
          </tr>
          <tr>
            <td class="font-weight-bold">{{ t(`${tPrefix}.submission.status.timeRemaining`) }}</td>
            <td>
              <span :class="{ 'text-red': timeRemaining === 'Délai dépassé' }">
                {{ timeRemaining }}
              </span>
            </td>
          </tr>
          <tr>
            <td class="font-weight-bold">{{ t(`${tPrefix}.submission.status.deadline`) }}</td>
            <td>{{ formatDate(dueDate) }}</td>
          </tr>
          <tr>
            <td class="font-weight-bold">{{ t(`${tPrefix}.submission.status.lastModified`) }}</td>
            <td>{{ formatDate(submissionInfo?.updatedAt) }}</td>
          </tr>
          <tr>
            <td class="font-weight-bold">{{ t(`${tPrefix}.submission.status.createdAt`) }}</td>
            <td>{{ formatDate(submissionInfo?.createdAt) }}</td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

    <!-- Évaluations -->
    <v-card class="pa-6 mb-6">
      <h2 class="text-xl font-semibold mb-4">{{ t(`${tPrefix}.submission.evaluations.title`) }}</h2>

      <div v-if="!hasEvaluations" class="text-grey text-center py-4">
        {{ t(`${tPrefix}.submission.evaluations.noEvaluations`) }}
      </div>

      <div v-else>
        <v-alert type="info" variant="tonal" class="mb-4">
          <strong>{{ t(`${tPrefix}.submission.evaluations.averageGrade`) }} : {{ submissionInfo?.grade }}/20</strong>
        </v-alert>

        <v-expansion-panels variant="accordion">
          <v-expansion-panel
            v-for="(evaluation, index) in submissionInfo?.evaluations"
            :key="evaluation.id"
          >
            <v-expansion-panel-title>
              <v-row align="center" no-gutters>
                <v-col cols="8">
                  <strong>{{ t(`${tPrefix}.submission.evaluations.jury`) }} {{ index + 1 }}</strong>
                </v-col>
                <v-col cols="4" class="text-right">
                  <v-chip color="primary" size="small">
                    {{ evaluation.grade }}/20
                  </v-chip>
                </v-col>
              </v-row>
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <div class="py-2">
                <p class="text-caption text-grey mb-2">
                  {{ t(`${tPrefix}.submission.evaluations.evaluatedOn`) }} {{ formatDate(evaluation.createdAt) }}
                </p>
                
                <div v-if="evaluation.comment" class="mb-3">
                  <strong>{{ t(`${tPrefix}.submission.evaluations.comment`) }} :</strong>
                  <p class="mt-1">{{ evaluation.comment }}</p>
                </div>

                <div v-if="evaluation.evaluationFilePath">
                  <v-btn
                    variant="outlined"
                    size="small"
                    prepend-icon="mdi-file-download"
                  >
                    {{ t(`${tPrefix}.submission.evaluations.downloadFile`) }}
                  </v-btn>
                </div>
              </div>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </div>
    </v-card>

    <!-- Commentaires des mentors -->
    <v-card class="pa-6">
      <h2 class="text-xl font-semibold mb-4">{{ t(`${tPrefix}.submission.comments.title`) }}</h2>

      <div v-if="!hasComments" class="text-grey text-center py-4">
        {{ t(`${tPrefix}.submission.comments.noComments`) }}
      </div>

      <v-list v-else lines="three">
        <v-list-item
          v-for="comment in submissionInfo?.comments"
          :key="comment.id"
          class="mb-2 border rounded"
        >
          <template #prepend>
            <v-avatar color="primary">
              <v-icon>mdi-account</v-icon>
            </v-avatar>
          </template>

          <v-list-item-title class="font-weight-bold mb-1">
            {{ t(`${tPrefix}.submission.comments.mentor`) }}
          </v-list-item-title>
          
          <v-list-item-subtitle class="text-caption text-grey mb-2">
            {{ formatDate(comment.createdAt) }}
          </v-list-item-subtitle>

          <div class="mt-2">
            {{ comment.content || t(`${tPrefix}.submission.comments.noContent`) }}
          </div>
        </v-list-item>
      </v-list>
    </v-card>
  </v-container>
</template>

<style scoped>
.v-table {
  border-radius: 8px;
}

.v-table tbody tr:hover {
  background-color: rgba(0, 0, 0, 0.02);
}

td {
  padding: 12px 16px !important;
  border-bottom: 1px solid #eee;
}

td:first-child {
  width: 200px;
}

.text-red {
  color: #d32f2f;
  font-weight: 600;
}

.border {
  border: 1px solid #e0e0e0;
}
</style>