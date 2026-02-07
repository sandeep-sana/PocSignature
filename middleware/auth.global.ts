import { useAuth } from '../composables/useAuth'

const adminOnlyPaths = ['/users', '/validation-readiness']

export default defineNuxtRouteMiddleware((to) => {
  const { isAuthenticated, isAdmin, initFromStorage } = useAuth()
  // Restore session from localStorage on client only
  if (import.meta.client) {
    initFromStorage()
  }

  const isLoginPage = to.path === '/login'
  if (isLoginPage) {
    if (isAuthenticated.value) return navigateTo('/')
    return
  }

  // Only redirect to login on client (server has no localStorage)
  if (import.meta.client && !isAuthenticated.value) {
    return navigateTo('/login')
  }

  // RBAC: Admin-only routes — Approver cannot access
  if (import.meta.client && adminOnlyPaths.some((p) => to.path.startsWith(p)) && !isAdmin.value) {
    return navigateTo('/')
  }
})
