<template>
  <div class="poc-page audit-page">
    <div class="page-header">
      <span class="demo-badge">4</span>
      <div class="header-text">
        <h1>Audit Trail</h1>
        <p class="compliance-line">All GxP actions are automatically audit trailed — Created by, Approved by, Timestamp, Action.</p>
      </div>
    </div>

    <div class="audit-table-wrap">
      <table class="audit-table">
        <thead>
          <tr>
            <th>Created by</th>
            <th>Approved by</th>
            <th>Timestamp</th>
            <th>Action</th>
            <th>Record</th>
            <th>Meaning</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="e in auditEntries" :key="e.id">
            <td>{{ e.createdBy }}</td>
            <td>{{ e.approvedBy || '—' }}</td>
            <td>{{ formatDate(e.timestamp) }}</td>
            <td><span class="action-badge" :class="e.action">{{ e.action }}</span></td>
            <td>{{ e.recordType }} ({{ e.recordId }})</td>
            <td>{{ e.meaning || '—' }}</td>
          </tr>
          <tr v-if="!auditEntries.length">
            <td colspan="6" class="empty">No audit entries yet. Create and approve specimen records to see entries here.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { usePocDemo } from '../../composables/usePocDemo'

const { auditEntries, initAuditFromStorage } = usePocDemo()
onMounted(initAuditFromStorage)

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString()
}
</script>

<style scoped>
.poc-page { max-width: 1000px; margin: 0 auto; padding: 1rem 0; }
.page-header { display: flex; align-items: flex-start; gap: 1rem; margin-bottom: 1.5rem; }
.demo-badge { flex-shrink: 0; width: 2rem; height: 2rem; background: #22c55e; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 1rem; }
.header-text { flex: 1; min-width: 0; }
.page-header h1 { font-size: 1.5rem; font-weight: 700; color: #0f172a; margin: 0 0 0.25rem 0; }
.compliance-line { color: #64748b; font-size: 0.9rem; margin: 0; }
.audit-table-wrap { overflow-x: auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; }
.audit-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
.audit-table th { text-align: left; padding: 0.75rem 1rem; background: #f8fafc; font-weight: 600; color: #334155; border-bottom: 1px solid #e2e8f0; }
.audit-table td { padding: 0.75rem 1rem; border-bottom: 1px solid #f1f5f9; color: #475569; }
.audit-table tbody tr:last-child td { border-bottom: none; }
.action-badge { display: inline-block; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.8rem; font-weight: 600; }
.action-badge.Created { background: #dbeafe; color: #1d4ed8; }
.action-badge.Approved { background: #dcfce7; color: #166534; }
.action-badge.Revised { background: #fef3c7; color: #b45309; }
.empty { color: #94a3b8; text-align: center; padding: 2rem !important; }
</style>
