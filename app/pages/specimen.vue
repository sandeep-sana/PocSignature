<template>
  <div class="poc-page specimen-page">
    <div class="page-header">
      <span class="demo-badge">2</span>
      <div class="header-text">
        <h1>Specimen Signature Record</h1>
        <p class="compliance-line">Master specimen signature record — Person Name, Employee ID, Department, Signature (draw or upload).</p>
      </div>
      <button type="button" class="btn-add" @click="showModal = true">+ Create record</button>
    </div>

    <div class="records-section">
      <h2>Records</h2>
      <div class="records-list">
        <div v-for="rec in displayRecords" :key="rec._id || rec.id" class="record-card">
          <div class="record-meta">
            <span class="name">{{ rec.name }}</span>
            <span class="id">{{ rec.empId || rec.employeeId }}</span>
            <span class="dept">{{ rec.dept || rec.department }}</span>
          </div>
          <div v-if="rec.signature" class="sig-thumb">
            <img :src="rec.signature" alt="Signature" />
          </div>
          <div class="record-versions" v-if="getVersions(rec).length">
            <span class="version-badge" v-for="v in getVersions(rec)" :key="v">v{{ v }}</span>
            <span class="versioning-hint">5 — No overwrite, only versioning (Version 1 → 2).</span>
          </div>
          <div class="record-actions">
            <button type="button" class="btn-approve" @click="openApprove(rec)">Approve</button>
            <button type="button" class="btn-edit" @click="editRecord(rec)">Edit</button>
          </div>
          <div v-if="getSignaturesForRecord(rec._id || rec.id).length" class="signed-info">
            <template v-for="sig in getSignaturesForRecord(rec._id || rec.id)" :key="sig.signedAt">
              <span class="signed-by">{{ sig.signedBy }}</span>
              <span class="signed-at">{{ formatDate(sig.signedAt) }}</span>
              <span class="meaning">{{ sig.meaning }}</span>
            </template>
          </div>
        </div>
        <p v-if="!displayRecords.length" class="empty">No records yet. Create one to demonstrate specimen capture and approval.</p>
      </div>
    </div>

    <!-- Create/Edit modal: Person Name, Employee ID, Department, Signature -->
    <div v-if="showModal" class="modal-backdrop" @click.self="showModal = false">
      <div class="modal-card">
        <div class="modal-header">
          <h2>{{ editingId ? 'Edit record' : 'Create specimen record' }}</h2>
          <button type="button" class="btn-close" aria-label="Close" @click="showModal = false">&times;</button>
        </div>
        <div class="modal-body">
          <p class="compliance-inline">This represents a master specimen signature record.</p>
          <form @submit.prevent="saveRecord">
            <div class="form-row">
              <label>Person name</label>
              <input v-model="form.name" type="text" required placeholder="Full name" />
            </div>
            <div class="form-row">
              <label>Employee ID</label>
              <input v-model="form.empId" type="text" required placeholder="Employee ID" />
            </div>
            <div class="form-row">
              <label>Department</label>
              <input v-model="form.dept" type="text" required placeholder="Department" />
            </div>
            <div class="form-row">
              <label>Signature (draw or upload)</label>
              <div class="sig-modes">
                <button type="button" :class="{ active: sigMode === 'draw' }" @click="sigMode = 'draw'">Draw</button>
                <button type="button" :class="{ active: sigMode === 'upload' }" @click="sigMode = 'upload'">Upload</button>
              </div>
              <ClientOnly v-if="sigMode === 'draw'">
                <SignaturePad v-model:signature="form.signature" />
              </ClientOnly>
              <div v-else>
                <input type="file" accept="image/*" @change="onSigFile" />
                <img v-if="form.signature" :src="form.signature" class="sig-preview" alt="Signature" />
              </div>
            </div>
            <div class="modal-footer">
              <button type="submit" class="btn-save">Save</button>
              <button type="button" class="btn-cancel" @click="showModal = false">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- E-Sign approval modal -->
    <div v-if="showApproveModal" class="modal-backdrop" @click.self="showApproveModal = false">
      <div class="modal-card approve-modal">
        <div class="modal-header">
          <h2>Apply electronic signature (Approval)</h2>
          <button type="button" class="btn-close" aria-label="Close" @click="showApproveModal = false">&times;</button>
        </div>
        <div class="modal-body">
          <p class="compliance-inline">Enter username/password, select meaning = &quot;Approval&quot;. Signature is bound to the record, not an image overlay.</p>
          <form @submit.prevent="submitApproval">
            <div class="form-row">
              <label>Username</label>
              <input v-model="approveForm.username" type="text" required placeholder="Username" />
            </div>
            <div class="form-row">
              <label>Password</label>
              <input v-model="approveForm.password" type="password" required placeholder="Password" />
            </div>
            <div class="form-row">
              <label>Meaning</label>
              <select v-model="approveForm.meaning">
                <option value="Approval">Approval</option>
                <option value="Review">Review</option>
                <option value="Acknowledgment">Acknowledgment</option>
              </select>
            </div>
            <div class="modal-footer">
              <button type="submit" class="btn-save">Sign</button>
              <button type="button" class="btn-cancel" @click="showApproveModal = false">Cancel</button>
            </div>
          </form>
          <div v-if="lastSignature" class="signature-display">
            <h4>Display (bound to record)</h4>
            <div class="sig-display-row"><strong>Name:</strong> {{ lastSignature.signedBy }}</div>
            <div class="sig-display-row"><strong>Date/time:</strong> {{ formatDate(lastSignature.signedAt) }}</div>
            <div class="sig-display-row"><strong>Meaning:</strong> {{ lastSignature.meaning }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useAuth } from '../../composables/useAuth'
import { usePocDemo, useSignedRecords } from '../../composables/usePocDemo'
import SignaturePad from '../../common/signature-pad.vue'
import api from '../../api.config'
import CONFIG from '../../config'

const { user } = useAuth()
const { addAudit, getAuditForRecord, initAuditFromStorage } = usePocDemo()
const { addSignature, getSignaturesForRecord, initSignedFromStorage } = useSignedRecords()

const showModal = ref(false)
const showApproveModal = ref(false)
const editingId = ref(null)
const sigMode = ref('draw')
const apiRecords = ref([])
const localRecords = ref([]) // for POC-only records (no API)
const approveRecord = ref(null)
const lastSignature = ref(null)

const form = reactive({
  name: '',
  empId: '',
  dept: '',
  signature: '',
})

const approveForm = reactive({
  username: '',
  password: '',
  meaning: 'Approval',
})

const displayRecords = computed(() => {
  const combined = [...localRecords.value]
  apiRecords.value.forEach((r) => {
    if (!combined.find((c) => (c._id || c.id) === r._id)) {
      combined.push({ ...r, empId: r.empId || r.employeeId, dept: r.dept || r.department })
    }
  })
  return combined.sort((a, b) => (b._id || b.id || '').localeCompare(a._id || a.id || ''))
})

function getVersions(rec) {
  const audits = getAuditForRecord(rec._id || rec.id)
  const versions = new Set(audits.map((a) => a.version).filter(Boolean))
  return Array.from(versions).sort((a, b) => a - b)
}

function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString()
}

async function loadApiRecords() {
  try {
    const res = await api.get(`${CONFIG.API}/api/employee/employee`)
    apiRecords.value = res.data?.list || []
  } catch {
    apiRecords.value = []
  }
}

function loadLocalRecords() {
  if (import.meta.client) {
    try {
      const s = localStorage.getItem('poc-specimen-records')
      if (s) localRecords.value = JSON.parse(s)
    } catch {}
  }
}

function saveLocalRecords() {
  if (import.meta.client) localStorage.setItem('poc-specimen-records', JSON.stringify(localRecords.value))
}

function saveRecord() {
  if (!form.name || !form.empId || !form.dept || !form.signature) return
  const record = {
    id: editingId.value || `rec-${Date.now()}`,
    name: form.name,
    empId: form.empId,
    dept: form.dept,
    signature: form.signature,
  }
  if (editingId.value) {
    const idx = localRecords.value.findIndex((r) => (r._id || r.id) === editingId.value)
    if (idx >= 0) {
      const old = localRecords.value[idx]
      localRecords.value[idx] = { ...record, _id: old._id || old.id, version: (old.version || 1) + 1 }
    }
    addAudit({
      recordId: record.id,
      recordType: 'Specimen',
      action: 'Revised',
      createdBy: user?.value?.username || 'User',
      timestamp: new Date().toISOString(),
      version: record.version,
    })
  } else {
    localRecords.value = [{ ...record, _id: record.id, version: 1 }, ...localRecords.value]
    addAudit({
      recordId: record.id,
      recordType: 'Specimen',
      action: 'Created',
      createdBy: user?.value?.username || 'User',
      timestamp: new Date().toISOString(),
      version: 1,
    })
  }
  saveLocalRecords()
  showModal.value = false
  editingId.value = null
  form.name = form.empId = form.dept = form.signature = ''
}

function editRecord(rec) {
  editingId.value = rec._id || rec.id
  form.name = rec.name
  form.empId = rec.empId || rec.employeeId
  form.dept = rec.dept || rec.department
  form.signature = rec.signature || ''
  showModal.value = true
}

function openApprove(rec) {
  approveRecord.value = rec
  approveForm.username = user?.value?.username || ''
  approveForm.password = ''
  approveForm.meaning = 'Approval'
  lastSignature.value = null
  showApproveModal.value = true
}

function submitApproval() {
  if (!approveRecord.value || !approveForm.username || !approveForm.password) return
  const recordId = approveRecord.value._id || approveRecord.value.id
  const signedAt = new Date().toISOString()
  addSignature({
    recordId,
    recordType: 'Specimen',
    signedBy: approveForm.username,
    signedAt,
    meaning: approveForm.meaning,
  })
  addAudit({
    recordId,
    recordType: 'Specimen',
    action: 'Approved',
    createdBy: approveRecord.value.name,
    approvedBy: approveForm.username,
    timestamp: signedAt,
    meaning: approveForm.meaning,
  })
  lastSignature.value = { signedBy: approveForm.username, signedAt, meaning: approveForm.meaning }
}

function onSigFile(e) {
  const f = e.target?.files?.[0]
  if (!f) return
  const reader = new FileReader()
  reader.onload = () => {
    form.signature = reader.result
  }
  reader.readAsDataURL(f)
}

onMounted(() => {
  initAuditFromStorage()
  initSignedFromStorage()
  loadApiRecords()
  loadLocalRecords()
})
</script>

<style scoped>
.poc-page { max-width: 900px; margin: 0 auto; padding: 1rem 0; }
.page-header { display: flex; flex-wrap: wrap; align-items: flex-start; gap: 1rem; margin-bottom: 1.5rem; }
.demo-badge { flex-shrink: 0; width: 2rem; height: 2rem; background: #22c55e; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 1rem; }
.header-text { flex: 1 1 auto; min-width: 0; }
.page-header h1 { font-size: 1.5rem; font-weight: 700; color: #0f172a; margin: 0; }
.compliance-line { color: #64748b; font-size: 0.9rem; margin: 0.25rem 0 0 0; }
.btn-add { background: #22c55e; color: #fff; border: none; padding: 0.5rem 1rem; border-radius: 8px; font-weight: 600; cursor: pointer; }
.btn-add:hover { background: #16a34a; }
.records-section h2 { font-size: 1rem; font-weight: 600; color: #334155; margin-bottom: 0.75rem; }
.records-list { display: flex; flex-direction: column; gap: 0.75rem; }
.record-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 1rem; display: grid; grid-template-columns: 1fr auto auto auto; align-items: center; gap: 1rem; }
.record-meta { display: flex; flex-direction: column; gap: 0.2rem; }
.record-meta .name { font-weight: 600; color: #0f172a; }
.record-meta .id, .record-meta .dept { font-size: 0.85rem; color: #64748b; }
.sig-thumb img { max-height: 40px; max-width: 100px; object-fit: contain; border: 1px solid #e2e8f0; border-radius: 4px; }
.version-badge { display: inline-block; margin-right: 0.25rem; padding: 0.2rem 0.5rem; background: #e0f2fe; color: #0369a1; font-size: 0.75rem; border-radius: 4px; }
.record-versions { display: flex; flex-wrap: wrap; align-items: center; gap: 0.35rem; }
.versioning-hint { font-size: 0.75rem; color: #64748b; font-style: italic; }
.record-actions { display: flex; gap: 0.5rem; }
.btn-approve { background: #22c55e; color: #fff; border: none; padding: 0.4rem 0.75rem; border-radius: 6px; font-size: 0.85rem; cursor: pointer; }
.btn-edit { background: #0ea5e9; color: #fff; border: none; padding: 0.4rem 0.75rem; border-radius: 6px; font-size: 0.85rem; cursor: pointer; }
.signed-info { grid-column: 1 / -1; font-size: 0.8rem; color: #64748b; margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid #f1f5f9; }
.signed-info .signed-by { font-weight: 600; margin-right: 0.5rem; }
.empty { color: #94a3b8; font-size: 0.9rem; }
.modal-backdrop { position: fixed; inset: 0; background: rgba(15,23,42,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 1rem; }
.modal-card { background: #fff; border-radius: 12px; max-width: 520px; width: 100%; max-height: 90vh; overflow-y: auto; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.25rem; border-bottom: 1px solid #e2e8f0; }
.modal-header h2 { font-size: 1.1rem; font-weight: 600; margin: 0; }
.btn-close { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #64748b; line-height: 1; }
.compliance-inline { color: #64748b; font-size: 0.85rem; margin-bottom: 1rem; }
.modal-body { padding: 1.25rem; }
.form-row { margin-bottom: 1rem; }
.form-row label { display: block; font-weight: 500; margin-bottom: 0.35rem; font-size: 0.9rem; }
.form-row input[type="text"], .form-row input[type="password"], .form-row select { width: 100%; padding: 0.5rem 0.75rem; border: 1px solid #cbd5e1; border-radius: 6px; }
.sig-modes { display: flex; gap: 0.5rem; margin-bottom: 0.5rem; }
.sig-modes button { padding: 0.4rem 0.75rem; border: 1px solid #cbd5e1; border-radius: 6px; background: #fff; cursor: pointer; }
.sig-modes button.active { background: #22c55e; color: #fff; border-color: #22c55e; }
.sig-preview { max-height: 80px; margin-top: 0.5rem; }
.modal-footer { display: flex; gap: 0.75rem; margin-top: 1.25rem; }
.btn-save { background: #22c55e; color: #fff; border: none; padding: 0.5rem 1.25rem; border-radius: 6px; font-weight: 600; cursor: pointer; }
.btn-cancel { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; padding: 0.5rem 1.25rem; border-radius: 6px; cursor: pointer; }
.signature-display { margin-top: 1.25rem; padding: 1rem; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; }
.signature-display h4 { font-size: 0.9rem; margin-bottom: 0.5rem; color: #166534; }
.sig-display-row { margin-bottom: 0.35rem; }
</style>
