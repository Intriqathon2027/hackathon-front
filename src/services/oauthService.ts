import { useAuthStore } from '@/stores/auth'

const VITE_API_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  import.meta.env.VITE_VITE_API_URL ||
  ''

function getAuthHeaders(): HeadersInit {
  const authStore = useAuthStore() as { token?: string; session?: { access_token?: string } }
  const token = authStore.token ?? authStore.session?.access_token

  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export function loginDiscord(organizerPlatform: boolean = false, userId: string) {
  const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID
  const redirectUri = encodeURIComponent(import.meta.env.VITE_DISCORD_REDIRECT_URI)

  const supabaseUserId = useAuthStore().user?.supabaseUserId

  if (!supabaseUserId) {
    console.error('supabaseUserId is undefined! Cannot login with Discord.')
    return
  }

  const state = encodeURIComponent(
    JSON.stringify({
      supabaseUserId,
      userId,
      organizerPlatform,
    }),
  )

  window.location.href = `https://discord.com/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=identify&state=${state}`
}

export function loginGitHub(organizerPlatform: boolean = false, userId: string) {
  const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID
  const redirectUri = encodeURIComponent(import.meta.env.VITE_GITHUB_REDIRECT_URI)

  const supabaseUserId = useAuthStore().user?.supabaseUserId

  if (!supabaseUserId) {
    console.error('supabaseUserId is undefined! Cannot login with GitHub.')
    return
  }

  const state = encodeURIComponent(
    JSON.stringify({
      supabaseUserId,
      userId,
      organizerPlatform,
    }),
  )

  const scopes = 'read:user repo repo:invite user:email'
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scopes}`
  window.location.href = `${githubAuthUrl}&state=${state}`
}

export async function unlinkDiscord(userId: string): Promise<void> {
  if (!VITE_API_URL) {
    console.error("URL de l'API manquante : vérifie le nom de la variable dans le fichier .env")
  }

  const response = await fetch(`${VITE_API_URL}/api/auth/discord/${userId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    throw new Error(`Failed to unlink Discord account (${response.status})`)
  }
}

export async function unlinkGitHub(userId: string): Promise<void> {
  if (!VITE_API_URL) {
    console.error("URL de l'API manquante : vérifie le nom de la variable dans le fichier .env")
  }

  const response = await fetch(`${VITE_API_URL}/api/auth/github/${userId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    throw new Error(`Failed to unlink GitHub account (${response.status})`)
  }
}