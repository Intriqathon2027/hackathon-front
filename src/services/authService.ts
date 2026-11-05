import { supabase } from './supabase'
import axios from 'axios'
import { useAuthStore } from '@/stores/auth'
import { UserRole } from '@/types/roles'

export async function loginWithSupabase(
  email: string,
  password: string,
  organizer: boolean = false
) {
  const { data, error: supaError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (supaError || !data.session) {
    throw new Error('Invalid credentials')
  }

  const accessToken = data.session.access_token

  const response = await axios.post(
    `${import.meta.env.VITE_API_URL}/api/user/login`,
    {},
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  )

  const user = {
    ...response.data,
    accessToken,
  }

  if (organizer && user.role !== UserRole.ORGANIZER) {
    await supabase.auth.signOut()
    throw new Error('Access denied')
  }

  const authStore = useAuthStore()
  authStore.login(user)

  return user
}

export async function logout() {
  const { error } = await supabase.auth.signOut()
  if (error) {
    throw new Error('Error during logout')
  }

  const authStore = useAuthStore()
  authStore.logout()
}

// Manage Supabase auth state changes (e.g., token refresh)
supabase.auth.onAuthStateChange((event, session) => {
  const authStore = useAuthStore()

  if (session) {
    authStore.updateAccessToken(session.access_token)
  } else if (event === 'SIGNED_OUT') {
    authStore.logout()
  }
})
