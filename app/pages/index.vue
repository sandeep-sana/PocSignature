<template>
  <div class="poc-dashboard">
    <div class="dashboard-header">
      <h1>Welcome, {{ user?.username || 'User' }}</h1>
      <p class="tagline">Logged in as <strong>{{ user?.role }}</strong>. Role-based access is enforced.</p>
    </div>

    <!-- Role-based tasks -->
    <section class="tasks-section" v-if="isApprover">
      <h2>My tasks (Approver)</h2>
      <div class="task-grid">
        <NuxtLink to="/specimen" class="task-card primary">
          <span class="task-icon">✓</span>
          <h3>Approve records</h3>
          <p>Review and approve specimen signature records with electronic signature.</p>
        </NuxtLink>
        <NuxtLink to="/audit-trail" class="task-card">
          <span class="task-icon">📋</span>
          <h3>Audit Trail</h3>
          <p>View all GxP actions: created by, approved by, timestamp.</p>
        </NuxtLink>
        <NuxtLink to="/stamp" class="task-card">
          <span class="task-icon">📄</span>
          <h3>Stamp PDF</h3>
          <p>Apply signature and date/time to PDF documents.</p>
        </NuxtLink>
        <NuxtLink to="/validate-compare" class="task-card">
          <span class="task-icon">🔍</span>
          <h3>Validate & Compare</h3>
          <p>Compare signatures for validation.</p>
        </NuxtLink>
      </div>
    </section>

    <section class="tasks-section" v-if="isAdmin">
      <h2>My tasks (Admin)</h2>
      <div class="task-grid">
        <NuxtLink to="/specimen" class="task-card">
          <span class="task-icon">📝</span>
          <h3>Specimen Record</h3>
          <p>Create and manage specimen signature records.</p>
        </NuxtLink>
        <NuxtLink to="/enrol" class="task-card">
          <span class="task-icon">👥</span>
          <h3>Enrol (List)</h3>
          <p>Employee list and signature enrolment.</p>
        </NuxtLink>
        <NuxtLink to="/audit-trail" class="task-card">
          <span class="task-icon">📋</span>
          <h3>Audit Trail</h3>
          <p>View all GxP audit entries.</p>
        </NuxtLink>
        <NuxtLink to="/users" class="task-card primary">
          <span class="task-icon">🔐</span>
          <h3>User Management</h3>
          <p>User list, roles. No shared accounts.</p>
        </NuxtLink>
        <NuxtLink to="/stamp" class="task-card">
          <span class="task-icon">📄</span>
          <h3>Stamp PDF</h3>
          <p>Stamp PDFs with signature and date/time.</p>
        </NuxtLink>
        <NuxtLink to="/validate-compare" class="task-card">
          <span class="task-icon">🔍</span>
          <h3>Validate Compare</h3>
          <p>Signature validation and comparison.</p>
        </NuxtLink>
        <NuxtLink to="/validation-readiness" class="task-card">
          <span class="task-icon">📑</span>
          <h3>Validation Readiness</h3>
          <p>URS, IQ/OQ/PQ, Traceability Matrix.</p>
        </NuxtLink>
      </div>
    </section>

    <p class="positioning-statement">
      “This is a representative demo environment to demonstrate compliance capability. Upon order, the system is configured, qualified, and validated as per your URS and risk profile.”
    </p>

    <div class="demo-flow" v-if="isAdmin">
      <h2>Demo flow (7 core items)</h2>
      <div class="flow-grid">
        <NuxtLink to="/specimen" class="flow-card"><span class="flow-num">2</span><h3>Specimen Record</h3><p>Create record, signature</p></NuxtLink>
        <NuxtLink to="/specimen" class="flow-card"><span class="flow-num">3</span><h3>E-Signature</h3><p>Approve · Bound to record</p></NuxtLink>
        <NuxtLink to="/audit-trail" class="flow-card"><span class="flow-num">4</span><h3>Audit Trail</h3><p>Created by, Approved by</p></NuxtLink>
        <NuxtLink to="/users" class="flow-card"><span class="flow-num">6</span><h3>User Management</h3><p>Roles, no shared accounts</p></NuxtLink>
        <NuxtLink to="/validation-readiness" class="flow-card"><span class="flow-num">7</span><h3>Validation Readiness</h3><p>URS, IQ/OQ/PQ</p></NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useAuth } from '../../composables/useAuth'
const { user, isAdmin, isApprover } = useAuth()
</script>

<style scoped>
.poc-dashboard {
  max-width: 960px;
  margin: 0 auto;
  padding: 1.5rem 0;
}

.dashboard-header {
  margin-bottom: 1rem;
}

.dashboard-header h1 {
  font-size: 1.75rem;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 0.35rem;
}

.tagline {
  color: #64748b;
  font-size: 0.95rem;
}

.positioning-statement {
  background: #f1f5f9;
  border-left: 4px solid #22c55e;
  padding: 1rem 1.25rem;
  border-radius: 0 8px 8px 0;
  color: #334155;
  font-size: 0.9rem;
  margin-bottom: 2rem;
}

.demo-flow h2 {
  font-size: 1.1rem;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 1rem;
}

.flow-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1rem;
}

.flow-card {
  display: block;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 1.25rem;
  text-decoration: none;
  color: inherit;
  transition: border-color 0.2s, box-shadow 0.2s;
  position: relative;
}

.flow-card:hover {
  border-color: #22c55e;
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.12);
}

.flow-num {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  width: 28px;
  height: 28px;
  background: #22c55e;
  color: #fff;
  font-size: 0.8rem;
  font-weight: 700;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.flow-card h3 {
  font-size: 1rem;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 0.35rem;
  padding-right: 36px;
}

.flow-card p {
  font-size: 0.8rem;
  color: #64748b;
  line-height: 1.4;
  margin: 0;
}

.tasks-section {
  margin-bottom: 2rem;
}

.tasks-section h2 {
  font-size: 1.1rem;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 1rem;
}

.task-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}

.task-card {
  display: block;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 1.25rem;
  text-decoration: none;
  color: inherit;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.task-card:hover {
  border-color: #22c55e;
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.12);
}

.task-card.primary {
  border-color: #22c55e;
  background: #f0fdf4;
}

.task-card.primary:hover {
  background: #dcfce7;
}

.task-icon {
  display: block;
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
}

.task-card h3 {
  font-size: 1rem;
  font-weight: 600;
  color: #0f172a;
  margin: 0 0 0.35rem 0;
}

.task-card p {
  font-size: 0.8rem;
  color: #64748b;
  line-height: 1.4;
  margin: 0;
}
</style>
