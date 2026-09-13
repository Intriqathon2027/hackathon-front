import { defineStore } from 'pinia'
import { UserDTO } from '@/types/user'

export const useAuthStore = defineStore('auth', {
  state: (): { user: SupabaseDecodedUser | null } => ({
    user: null,
  }),
  getters: {
    isAuthenticated: (state) => !!state.user,
  },
  actions: {
    login(userData: SupabaseDecodedUser) {
      this.user = userData
      localStorage.setItem('authUser', JSON.stringify(userData))
    },
    logout() {
      this.user = null
      localStorage.removeItem('authUser')
    },
    loadAuth() {
      const data = localStorage.getItem('authUser')
      if (data) {
        this.user = JSON.parse(data)
      } else if (import.meta.env.DEV) {
        const params = new URLSearchParams(window.location.search)
        if (params.get('devAuth') === 'organizer') {
          this.user = {
            id: 'dev-org-id',
            email: 'organizer@dev.local',
            role: 'ORGANIZER' as any,
            accessToken: 'dev-token',
            firstname: 'Admin',
            lastname: 'Organizer',
          }
          localStorage.setItem('authUser', JSON.stringify(this.user))
        }
      }
    },
    updateAccessToken(newAccessToken: string) {
      if (this.user) {
        this.user.accessToken = newAccessToken
        localStorage.setItem('authUser', JSON.stringify(this.user))
      }
    },
    updateProfilePicture(newProfilePicturePath: string | undefined) {
      if (this.user) {
        this.user.profilePicturePath = newProfilePicturePath
        localStorage.setItem('authUser', JSON.stringify(this.user))
      }
    },

    updateUserFields(updatedFields: Partial<UserDTO>) {
      if (this.user) {
        this.user = {
          ...this.user,
          ...updatedFields,
        } as SupabaseDecodedUser

        localStorage.setItem('authUser', JSON.stringify(this.user))
      } else {
        console.warn('Cannot update user fields: User is not authenticated.')
      }
    },
  },
})

export function getAuthHeaders() {
  const authStore = useAuthStore()
  if (!authStore.user?.accessToken) {
    throw new Error('User is not authenticated')
  }
  return {
    Authorization: `Bearer ${authStore.user.accessToken}`,
  }
}
