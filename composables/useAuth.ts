import CONFIG from '../config'

export type UserRole = 'admin' | 'approver'

export interface AuthUser {
  username: string
  role: UserRole
}

const AUTH_KEY = 'poc-auth-user'
const TOKEN_KEY = 'token'

export function useAuth() {
  const user = useState<AuthUser | null>('auth-user', () => null)

  function initFromStorage() {
    if (import.meta.client && !user.value) {
      try {
        const stored = localStorage.getItem(AUTH_KEY)
        const token = localStorage.getItem(TOKEN_KEY)
        if (stored && token) {
          const parsed = JSON.parse(stored) as AuthUser
          if (parsed?.username && parsed?.role) user.value = parsed
        }
      } catch {
        user.value = null
      }
    }
  }

  async function login(username: string, password: string): Promise<{ success: boolean; message?: string }> {
    if (import.meta.server) return { success: false, message: 'Login on server not supported' }
    try {
      const api = (await import('../api.config')).default
      const { data } = await api.post<{ success: boolean; token?: string; user?: AuthUser; message?: string }>(
        `${CONFIG.API}/api/auth/login`,
        { username: username.trim(), password }
      )
      if (!data.success || !data.token || !data.user) {
        return { success: false, message: data.message || 'Login failed' }
      }
      user.value = data.user
      localStorage.setItem(TOKEN_KEY, data.token)
      localStorage.setItem(AUTH_KEY, JSON.stringify(data.user))
      return { success: true }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      return { success: false, message: msg || 'Invalid username or password' }
    }
  }

  function logout() {
    user.value = null
    if (import.meta.client) {
      localStorage.removeItem(AUTH_KEY)
      localStorage.removeItem(TOKEN_KEY)
      // Optional: call backend logout (e.g. for audit)
      import('../api.config').then(({ default: api }) => {
        api.post(`${CONFIG.API}/api/auth/logout`).catch(() => {})
      })
    }
  }

  const isAuthenticated = computed(() => !!user.value)
  const isAdmin = computed(() => user.value?.role === 'admin')
  const isApprover = computed(() => user.value?.role === 'approver')

  return {
    user: readonly(user),
    isAuthenticated,
    isAdmin,
    isApprover,
    login,
    logout,
    initFromStorage,
  }
}
