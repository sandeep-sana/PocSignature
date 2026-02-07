<template>
    <aside class="sidebar">
        <h2>Sidebar</h2>
        <div class="user-info" v-if="user">
            <span class="user-role">{{ user.username }}</span>
            <span class="role-badge" :class="user.role">{{ user.role }}</span>
            <button type="button" class="logout-btn" @click="logout">Logout</button>
        </div>
        <nav class="nav-section">
            <router-link to="/">Dashboard</router-link>
            <template v-if="isApprover">
                <span class="nav-label">My tasks</span>
                <router-link to="/specimen">Approve records</router-link>
                <router-link to="/audit-trail">Audit Trail</router-link>
                <router-link to="/stamp">Stamp PDF</router-link>
                <router-link to="/validate-compare">Validate & Compare</router-link>
            </template>
            <template v-if="isAdmin">
                <span class="nav-label">Admin</span>
                <router-link to="/specimen">Specimen Record</router-link>
                <router-link to="/enrol">Enrol (List)</router-link>
                <router-link to="/audit-trail">Audit Trail</router-link>
                <router-link to="/stamp">Stamp PDF</router-link>
                <router-link to="/validate-compare">Validate Compare</router-link>
                <router-link to="/users">User Management</router-link>
                <router-link to="/validation-readiness">Validation Readiness</router-link>
            </template>
        </nav>
    </aside>
</template>

<script setup>
import { useAuth } from '../composables/useAuth'
const { user, logout, isAdmin, isApprover } = useAuth()
</script>

<style scoped>
.sidebar {
    position: fixed;
    top: 0;
    left: 0;
    width: 220px;
    height: 100vh;
    background: #0f172a;
    color: #fff;
    padding: 1rem;
}

.sidebar a {
    display: block;
    margin: 0.5rem 0;
    color: inherit;
    text-decoration: none;
}

.sidebar a.router-link-active {
    font-weight: bold;
    color: #22c55e;
}

.user-info {
    margin-bottom: 1rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #334155;
}

.user-info .user-role {
    display: block;
    font-size: 0.9rem;
    color: #e2e8f0;
}

.role-badge {
    display: inline-block;
    margin-top: 0.25rem;
    padding: 0.2rem 0.5rem;
    font-size: 0.75rem;
    font-weight: 600;
    border-radius: 4px;
}
.role-badge.admin { background: #22c55e; color: #0f172a; }
.role-badge.approver { background: #0ea5e9; color: #fff; }

.nav-label {
    display: block;
    margin: 0.75rem 0 0.35rem 0;
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #64748b;
}

.logout-btn {
    display: block;
    margin-top: 0.5rem;
    padding: 0.35rem 0.5rem;
    background: transparent;
    border: 1px solid #475569;
    color: #94a3b8;
    font-size: 0.8rem;
    cursor: pointer;
    border-radius: 4px;
}

.logout-btn:hover {
    background: #334155;
    color: #f8fafc;
}
</style>
