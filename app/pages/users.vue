<template>
  <div class="poc-page users-page">
    <div class="page-header">
      <span class="demo-badge">6</span>
      <div class="header-text">
        <h1>User Management</h1>
        <p class="compliance-line">Admins control access. No shared accounts — User list and roles.</p>
      </div>
    </div>

    <div class="users-table-wrap">
      <table class="users-table">
        <thead>
          <tr>
            <th>User</th>
            <th>Role</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Admin</td>
            <td><span class="role-badge admin">Admin</span></td>
            <td>Full access; user management; system configuration</td>
          </tr>
          <tr>
            <td>Approver</td>
            <td><span class="role-badge approver">Approver</span></td>
            <td>Approve records; apply electronic signature; view audit trail</td>
          </tr>
          <tr v-if="user">
            <td>{{ user.username }}</td>
            <td><span class="role-badge" :class="user.role">{{ user.role }}</span></td>
            <td>Currently logged in</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="footnote">User list and roles are managed by administrators. No shared accounts—each user has a unique identity (Part 11, GAMP).</p>
  </div>
</template>

<script setup>
import { useAuth } from '../../composables/useAuth'

const { user } = useAuth()
</script>

<style scoped>
.poc-page { max-width: 800px; margin: 0 auto; padding: 1rem 0; }
.page-header { display: flex; align-items: flex-start; gap: 1rem; margin-bottom: 1.5rem; }
.demo-badge { flex-shrink: 0; width: 2rem; height: 2rem; background: #22c55e; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 1rem; }
.header-text { flex: 1; min-width: 0; }
.page-header h1 { font-size: 1.5rem; font-weight: 700; color: #0f172a; margin: 0 0 0.25rem 0; }
.compliance-line { color: #64748b; font-size: 0.9rem; margin: 0; }
.users-table-wrap { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; }
.users-table { width: 100%; border-collapse: collapse; font-size: 0.95rem; }
.users-table th { text-align: left; padding: 0.75rem 1.25rem; background: #f8fafc; font-weight: 600; color: #334155; }
.users-table td { padding: 0.75rem 1.25rem; border-top: 1px solid #f1f5f9; color: #475569; }
.role-badge { display: inline-block; padding: 0.25rem 0.6rem; border-radius: 6px; font-size: 0.85rem; font-weight: 600; }
.role-badge.admin { background: #22c55e; color: #fff; }
.role-badge.approver { background: #0ea5e9; color: #fff; }
.footnote { margin-top: 1.25rem; font-size: 0.85rem; color: #64748b; }
</style>
