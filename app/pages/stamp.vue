<!-- components/StampPdf.client.vue -->
<template>
  <div class="container py-3">
    <div class="row g-3">
      <!-- LEFT: Controls -->
      <div class="col-lg-5">
        <div class="card shadow-sm h-100">
          <div class="card-header d-flex align-items-center justify-content-between">
            <div class="d-flex align-items-center gap-2">
              <span class="fw-semibold">Stamp PDF</span>
              <span class="badge bg-light text-muted fw-normal">Date/time on stamp</span>
            </div>
            <div class="btn-group btn-group-sm" role="group" aria-label="Sample PDFs">
              <button type="button" class="btn btn-outline-secondary" @click="loadPdfFromAsset(HR_Approval_form)">
                HR Approval
              </button>
              <button type="button" class="btn btn-outline-secondary" @click="loadPdfFromAsset(Quality_Log)">
                Quality Log
              </button>
            </div>
          </div>

          <div class="card-body">
            <!-- Employee -->
            <div class="mb-3">
              <label class="form-label">Selected Employee</label>
              <select v-model="selectedEmployeeId" class="form-select">
                <option value="">-- Select an employee --</option>
                <option v-for="emp in stamp.list" :key="emp._id" :value="emp._id">
                  {{ emp.name }} ({{ emp.empId }})
                </option>
              </select>
              <div class="form-text">Selecting an employee loads all their saved signatures.</div>
            </div>

            <!-- PDF Source -->
            <div class="mb-3">
              <label class="form-label">Choose a PDF</label>
              <div class="input-group">
                <input class="form-control" type="file" accept="application/pdf" @change="onPdfFile" />
                <button class="btn btn-outline-secondary" type="button" :disabled="!origUrl"
                  @click="showOriginal">Original</button>
                <button class="btn btn-outline-secondary" type="button" :disabled="!previewUrl"
                  @click="showStamped">Stamped</button>
              </div>
              <div v-if="!pdfBytes" class="form-text">Or use the sample PDFs via the header buttons.</div>
            </div>

            <!-- Mode toggle -->
            <div class="mb-3">
              <label class="form-label d-block">Stamp Mode</label>
              <input type="radio" class="btn-check" name="mode" value="single" id="modeSingle" v-model="stampMode" />
              <label class="btn btn-outline-primary me-2" for="modeSingle">Single</label>

              <input type="radio" class="btn-check" name="mode" value="multi" id="modeMulti" v-model="stampMode" />
              <label class="btn btn-outline-primary" for="modeMulti">Multi (grid)</label>
            </div>

            <!-- Signatures -->
            <div class="mb-3">
              <div class="d-flex align-items-center justify-content-between mb-2">
                <label class="form-label mb-0">Signatures</label>
                <div v-if="isLoadingSigs" class="small text-muted d-flex align-items-center gap-2">
                  <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                  Loading…
                </div>
              </div>

              <div v-if="stamp.signatures.length" class="sig-grid">
                <!-- SINGLE -->
                <label v-if="stampMode === 'single'" v-for="(s, i) in stamp.signatures" :key="s._id || i" class="sig-card"
                  :class="{ 'active': selectedSigIndex === i }"
                  @click="selectedSigIndex = i; sigDataUrl = s.signature || s.image || ''">
                  <input type="radio" class="form-check-input d-none" :value="i" v-model.number="selectedSigIndex" />
                  <img :src="s.signature || s.image" alt="signature" class="sig-img" />
                  <div class="sig-meta">
                    <span class="badge bg-secondary-subtle text-secondary-emphasis">v{{ s.version ?? (i + 1) }}</span>
                  </div>
                </label>

                <!-- MULTI -->
                <label v-for="(s, i) in stamp.signatures" :key="s._id || i" v-else class="sig-card"
                  :class="{ active: selectedSigIndexes.includes(i) }">
                  <input type="checkbox" class="form-check-input me-2" :value="i" v-model="selectedSigIndexes" />
                  <img :src="s.signature || s.image" alt="signature" class="sig-img" />
                  <div class="sig-meta">
                    <span class="badge bg-secondary-subtle text-secondary-emphasis">v{{ s.version ?? (i + 1) }}</span>
                  </div>
                </label>
              </div>

              <div v-else class="text-muted small">No signatures for this employee yet.</div>
            </div>

            <!-- Manual override preview (hidden input retained via sigDataUrl) -->
            <div v-if="sigDataUrl" class="mb-3">
              <div class="form-text">Selected signature preview</div>
              <img :src="sigDataUrl" alt="signature preview" class="border rounded p-1" style="height:48px" />
            </div>

            <!-- Coordinates (collapsible advanced) -->
            <div class="mb-2">
              <button class="btn btn-link p-0 small" type="button" data-bs-toggle="collapse"
                data-bs-target="#coordsCollapse" aria-expanded="false">
                Position & size (advanced)
              </button>
              <div class="collapse show" id="coordsCollapse">
                <div class="row g-2 mt-1">
                  <div class="col-6">
                    <label class="form-label small">X</label>
                    <input type="number" class="form-control" v-model.number="coords.x" />
                  </div>
                  <div class="col-6">
                    <label class="form-label small">Y</label>
                    <input type="number" class="form-control" v-model.number="coords.y" />
                  </div>
                  <div class="col-6">
                    <label class="form-label small">Width</label>
                    <input type="number" class="form-control" v-model.number="coords.w" />
                  </div>
                  <div class="col-6">
                    <label class="form-label small">Height</label>
                    <input type="number" class="form-control" v-model.number="coords.h" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="card-footer bg-transparent">
            <div class="d-flex flex-wrap gap-2">
              <button v-if="stampMode === 'single'" class="btn btn-primary" :disabled="!canStampSingle || isStamping"
                @click="stampSingleAndPreview">
                <span v-if="isStamping" class="spinner-border spinner-border-sm me-1"></span>
                Stamp (Single) & Preview
              </button>

              <button v-else class="btn btn-primary" :disabled="!canStampMulti || isStamping"
                @click="stampManyAndPreview">
                <span v-if="isStamping" class="spinner-border spinner-border-sm me-1"></span>
                Stamp (Multi) & Preview
              </button>

              <a v-if="previewUrl" :href="previewUrl" download="signed.pdf" class="btn btn-success">
                Download Stamped PDF
              </a>
              <button type="button" class="btn btn-outline-secondary" :disabled="!origUrl" @click="showOriginal">Show
                Original</button>
              <button type="button" class="btn btn-outline-secondary" :disabled="!previewUrl" @click="showStamped">Show
                Stamped</button>
              <button type="button" class="btn btn-outline-danger ms-auto" :disabled="!pdfBytes && !previewUrl"
                @click="resetAll">Reset</button>
            </div>
          </div>
        </div>
      </div>

      <!-- RIGHT: Viewer -->
      <div class="col-lg-7">
        <div class="card shadow-sm h-100">
          <div class="card-header d-flex align-items-center">
            <strong class="me-auto">Preview</strong>
            <small v-if="!viewerUrl" class="text-muted">Load a PDF to preview</small>
          </div>
          <div class="card-body p-0">
            <div class="ratio ratio-4x3 viewer-minh">
              <iframe v-if="viewerUrl" :src="viewerUrl" class="w-100 h-100 border-0"></iframe>
              <div v-else class="d-flex h-100 align-items-center justify-content-center text-muted flex-column">
                <div class="display-6">📄</div>
                <div>Choose or upload a PDF</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { PDFDocument, StandardFonts } from 'pdf-lib'
import HR_Approval_form from '../../pdf/HR_Approval_Form.pdf'
import Quality_Log from '../../pdf/Quality_Log.pdf'
import api from '~~/api.config'
import CONFIG from '~~/config'

// Expose for template buttons
// eslint-disable-next-line no-undef
defineExpose({ HR_Approval_form, Quality_Log })

const stamp = reactive({ list: [], signatures: [] })
const selectedEmployeeId = ref('')

// single vs multi
const stampMode = ref('single') // 'single' | 'multi'
const selectedSigIndex = ref(null) // for single
const selectedSigIndexes = ref([]) // for multi

// coords (points)
const coords = ref({ x: 420, y: 120, w: 120, h: 40 })

// pdf state
const pdfBytes = ref(null)
const origUrl = ref(null)
const previewUrl = ref(null)
const viewerUrl = ref(null)

// loading flags
const isLoadingSigs = ref(false)
const isStamping = ref(false)

// manual override for single (kept to allow direct dataUrl usage)
const sigDataUrl = ref('')

const canStampSingle = computed(() => !!pdfBytes.value && (!!sigDataUrl.value || selectedSigIndex.value !== null))
const canStampMulti = computed(() => !!pdfBytes.value && selectedSigIndexes.value.length > 0)

// load employees
const employeeList = async () => {
  try {
    const res = await api.get(`${CONFIG.API}/api/employee/employee`)
    stamp.list = res.data?.list || []
  } catch (e) {
    console.error(e)
  }
}

// load an employee's signatures (array)
const fetchSignatures = async (employeeId) => {
  isLoadingSigs.value = true
  try {
    if (!employeeId) { stamp.signatures = []; return }
    const response = await api.get(`${CONFIG.API}/api/employee/employeeId`, { params: { _id: employeeId } })
    stamp.signatures = response.data?.data?.signatures || []

    // default single selection = latest
    if (stamp.signatures.length) {
      selectedSigIndex.value = 0
      sigDataUrl.value = stamp.signatures[0].signature || stamp.signatures[0].image || ''
    } else {
      selectedSigIndex.value = null
      sigDataUrl.value = ''
    }

    // clear multi selection
    selectedSigIndexes.value = []
  } catch (e) {
    console.error('Failed to load signatures:', e)
    stamp.signatures = []
    selectedSigIndex.value = null
    selectedSigIndexes.value = []
    sigDataUrl.value = ''
  } finally {
    isLoadingSigs.value = false
  }
}

onMounted(employeeList)
watch(selectedEmployeeId, fetchSignatures)

// helpers
function revoke(urlRef) { if (urlRef.value) URL.revokeObjectURL(urlRef.value); urlRef.value = null }
function setViewerTo(urlRef) { viewerUrl.value = urlRef.value }

async function loadPdfFromAsset(assetUrl) {
  const res = await fetch(assetUrl)
  const ab = await res.arrayBuffer()
  pdfBytes.value = ab
  const blob = new Blob([ab], { type: 'application/pdf' })
  revoke(origUrl); origUrl.value = URL.createObjectURL(blob)
  setViewerTo(origUrl)
}

function onPdfFile(e) {
  const f = e.target.files?.[0]
  if (!f) { pdfBytes.value = null; return }
  const reader = new FileReader()
  reader.onload = () => {
    pdfBytes.value = reader.result
    const blob = new Blob([reader.result], { type: 'application/pdf' })
    revoke(origUrl); origUrl.value = URL.createObjectURL(blob)
    setViewerTo(origUrl)
  }
  reader.readAsArrayBuffer(f)
}

function dataUrlToUint8(dataUrl) {
  const base64 = (dataUrl || '').split(',')[1] || ''
  const binary = atob(base64)
  const len = binary.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

async function embedFromDataUrl(pdfDoc, dataUrl) {
  const bytes = dataUrlToUint8(dataUrl)
  return dataUrl.startsWith('data:image/png')
    ? pdfDoc.embedPng(bytes)
    : pdfDoc.embedJpg(bytes)
}

/** Draw date/time text below the signature image (PDF coords: origin bottom-left). */
function drawStampDateTime(page, x, y, w, h, font, dateTimeStr) {
  const fontSize = 8
  const textY = y - h - 4
  page.drawText(dateTimeStr, {
    x,
    y: textY,
    size: fontSize,
    font,
  })
}

// stamp ONE (from sigDataUrl or selected radio)
async function stampSingleAndPreview() {
  if (!pdfBytes.value) return
  let dataUrl = sigDataUrl.value
  if (!dataUrl && selectedSigIndex.value != null) {
    const s = stamp.signatures[selectedSigIndex.value]
    dataUrl = s?.signature || s?.image || ''
  }
  if (!dataUrl) return

  isStamping.value = true
  try {
    const pdfDoc = await PDFDocument.load(pdfBytes.value)
    const font = await pdfDoc.embedStandardFont(StandardFonts.Helvetica)
    const image = await embedFromDataUrl(pdfDoc, dataUrl)
    const pages = pdfDoc.getPages()
    const last = pages[pages.length - 1]
    const { x, y, w, h } = coords.value
    const dateTimeStr = new Date().toLocaleString()

    last.drawImage(image, { x, y, width: w, height: h })
    drawStampDateTime(last, x, y, w, h, font, dateTimeStr)

    const outBytes = await pdfDoc.save()
    const blob = new Blob([outBytes], { type: 'application/pdf' })
    revoke(previewUrl); previewUrl.value = URL.createObjectURL(blob)
    setViewerTo(previewUrl)
  } finally {
    isStamping.value = false
  }
}

// stamp MANY (selected checkboxes) in a grid on last page
async function stampManyAndPreview() {
  if (!pdfBytes.value || selectedSigIndexes.value.length === 0) return

  isStamping.value = true
  try {
    const pdfDoc = await PDFDocument.load(pdfBytes.value)
    const font = await pdfDoc.embedStandardFont(StandardFonts.Helvetica)
    const pages = pdfDoc.getPages()
    const last = pages[pages.length - 1]
    const pageW = last.getWidth()
    const pageH = last.getHeight()

    const startX = coords.value.x
    const startY = coords.value.y
    const w = coords.value.w
    const h = coords.value.h
    const GAP = 14
    const MARGIN = 10
    const dateTimeStr = new Date().toLocaleString()

    let x = startX
    let y = startY

    // order: UI selection order
    for (const idx of selectedSigIndexes.value) {
      const s = stamp.signatures[idx]
      const dataUrl = s?.signature || s?.image
      if (!dataUrl) continue

      const image = await embedFromDataUrl(pdfDoc, dataUrl)
      last.drawImage(image, { x, y, width: w, height: h })
      drawStampDateTime(last, x, y, w, h, font, dateTimeStr)

      // advance row (upwards in PDF coords: leave room for date text below sig)
      y += h + GAP

      // wrap to next column if exceeding page height
      if (y + h > pageH - MARGIN) {
        y = startY
        x += w + GAP
        if (x + w > pageW - MARGIN) break // no more room
      }
    }

    const outBytes = await pdfDoc.save()
    const blob = new Blob([outBytes], { type: 'application/pdf' })
    revoke(previewUrl); previewUrl.value = URL.createObjectURL(blob)
    setViewerTo(previewUrl)
  } finally {
    isStamping.value = false
  }
}

function showOriginal() { if (origUrl.value) setViewerTo(origUrl) }
function showStamped() { if (previewUrl.value) setViewerTo(previewUrl) }
function resetAll() {
  // Keep employees/signatures; reset PDF & viewer
  revoke(origUrl); revoke(previewUrl)
  pdfBytes.value = null
  viewerUrl.value = null
}
</script>

<style scoped>
/* Signature grid */
.sig-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 0.75rem;
}

.sig-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  border: 1px solid var(--bs-border-color);
  border-radius: 0.75rem;
  background: var(--bs-body-bg);
  cursor: pointer;
  transition: box-shadow .2s ease, transform .1s ease, border-color .2s ease;
}

.sig-card:hover {
  box-shadow: 0 0.25rem 0.75rem rgba(33, 37, 41, .08);
}

.sig-card.active {
  border-color: var(--bs-primary);
  box-shadow: 0 0 0 .15rem rgba(var(--bs-primary-rgb), .15);
}

.sig-img {
  max-height: 42px;
  max-width: 100%;
  object-fit: contain;
  border: 1px dashed var(--bs-border-color);
  border-radius: 0.5rem;
  background: var(--bs-light-bg-subtle);
  padding: 2px;
}

.sig-meta {
  margin-left: auto;
}

/* Viewer minimum height for better feel */
.viewer-minh {
  min-height: 65vh;
}
</style>
