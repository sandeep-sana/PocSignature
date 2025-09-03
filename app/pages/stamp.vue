<!-- components/StampPdf.client.vue -->
<template>
  <div class="space-y-3">
    <!-- Sample PDFs -->
    <div class="flex gap-2">
      <button class="border px-3 py-2 rounded" @click="loadPdfFromAsset(HR_Approval_form)">
        Load: HR_Approval_Form.pdf
      </button>
      <button class="border px-3 py-2 rounded" @click="loadPdfFromAsset(Quality_Log)">
        Load: Quality_Log.pdf
      </button>
    </div>

    <!-- Pick employee -->
    <div>
      <label class="block text-sm font-medium">Selected Employee</label>
      <select v-model="selectedEmployeeId" class="border p-2 rounded w-full">
        <option value="">-- Select an employee --</option>
        <option v-for="emp in stamp.list" :key="emp._id" :value="emp._id">
          {{ emp.name }} ({{ emp.empId }})
        </option>
      </select>
      <p class="text-xs opacity-70 mt-1">Selecting an employee loads all their saved signatures.</p>
    </div>

    <!-- Signatures from the employee -->
    <div v-if="stamp.signatures.length" class="space-y-2">
      <div class="flex items-center gap-3">
        <label class="text-sm font-medium">Stamp Mode:</label>
        <label class="text-sm flex items-center gap-1">
          <input type="radio" value="single" v-model="stampMode" /> Single
        </label>
        <label class="text-sm flex items-center gap-1">
          <input type="radio" value="multi" v-model="stampMode" /> Multi (grid)
        </label>
      </div>

      <!-- Single select (radio) -->
      <div v-if="stampMode==='single'" class="grid md:grid-cols-4 sm:grid-cols-2 gap-3">
        <label v-for="(s, i) in stamp.signatures" :key="s._id" class="border rounded p-2 flex items-center gap-2">
          <input type="radio" :value="i" v-model.number="selectedSigIndex" />
          <img :src="s.signature || s.image" alt="" class="border rounded" style="height:42px" />
          <span class="text-xs opacity-70 ml-auto">v{{ s.version }}</span>
        </label>
      </div>

      <!-- Multi select (checkboxes) -->
      <div v-else class="grid md:grid-cols-4 sm:grid-cols-2 gap-3">
        <label v-for="(s, i) in stamp.signatures" :key="s._id" class="border rounded p-2 flex items-center gap-2">
          <input type="checkbox" :value="i" v-model="selectedSigIndexes" />
          <img :src="s.signature || s.image" alt="" class="border rounded" style="height:42px" />
          <span class="text-xs opacity-70 ml-auto">v{{ s.version }}</span>
        </label>
      </div>
    </div>

    <!-- Manual override / paste data URL if needed -->
    <div>
      <!-- <label class="block text-sm font-medium">Signature (base64 data URL)</label> -->
      <!-- <textarea v-model="sigDataUrl" rows="3" class="w-full border p-2" placeholder="data:image/png;base64,iVBORw0K..."></textarea> -->
      <div v-if="sigDataUrl" class="mt-2">
        <span class="text-xs opacity-70">Preview:</span>
        <img :src="sigDataUrl" alt="signature" class="border rounded mt-1" style="height:48px" />
      </div>
    </div>

    <!-- Coords -->
    <div class="grid grid-cols-2 gap-2">
      <div>
        <label class="block text-xs">x</label>
        <input type="number" v-model.number="coords.x" class="border p-1 w-full">
      </div>
      <div>
        <label class="block text-xs">y</label>
        <input type="number" v-model.number="coords.y" class="border p-1 w-full">
      </div>
      <div>
        <label class="block text-xs">w</label>
        <input type="number" v-model.number="coords.w" class="border p-1 w-full">
      </div>
      <div>
        <label class="block text-xs">h</label>
        <input type="number" v-model.number="coords.h" class="border p-1 w-full">
      </div>
    </div>

    <!-- Actions -->
    <div class="flex items-center gap-2">
      <button
        v-if="stampMode==='single'"
        :disabled="!pdfBytes || (!sigDataUrl && selectedSigIndex===null)"
        @click="stampSingleAndPreview"
        class="border px-3 py-2 rounded"
      >
        Stamp (Single) & Preview
      </button>

      <button
        v-else
        :disabled="!pdfBytes || selectedSigIndexes.length===0"
        @click="stampManyAndPreview"
        class="border px-3 py-2 rounded"
      >
        Stamp (Multi) & Preview
      </button>

      <a v-if="previewUrl" :href="previewUrl" download="signed.pdf" class="border px-3 py-2 rounded">
        Download Stamped PDF
      </a>
      <button v-if="origUrl" @click="showOriginal" class="border px-3 py-2 rounded">Show Original</button>
      <button v-if="previewUrl" @click="showStamped" class="border px-3 py-2 rounded">Show Stamped</button>
    </div>

    <!-- Preview -->
    <div v-if="viewerUrl" class="border rounded overflow-hidden" style="height: 75vh;">
      <iframe :src="viewerUrl" class="w-full h-full"></iframe>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { PDFDocument } from 'pdf-lib'
import HR_Approval_form from '../../pdf/HR_Approval_Form.pdf'
import Quality_Log from '../../pdf/Quality_Log.pdf'
import api from '~~/api.config'
import CONFIG from '~~/config'

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

// manual override for single
const sigDataUrl = ref('')

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
  if (!employeeId) { stamp.signatures = []; return }
  try {
    const response = await api.get(`${CONFIG.API}/api/employee/employeeId`, {
      params: { _id: employeeId }
    })
    // expect: { data: { signatures: [...] } }
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

// stamp ONE (from sigDataUrl or selected radio)
async function stampSingleAndPreview() {
  if (!pdfBytes.value) return
  let dataUrl = sigDataUrl.value
  if (!dataUrl && selectedSigIndex.value != null) {
    const s = stamp.signatures[selectedSigIndex.value]
    dataUrl = s?.signature || s?.image || ''
  }
  if (!dataUrl) return

  const pdfDoc = await PDFDocument.load(pdfBytes.value)
  const image = await embedFromDataUrl(pdfDoc, dataUrl)

  const pages = pdfDoc.getPages()
  const last = pages[pages.length - 1]
  last.drawImage(image, {
    x: coords.value.x, y: coords.value.y,
    width: coords.value.w, height: coords.value.h
  })

  const outBytes = await pdfDoc.save()
  const blob = new Blob([outBytes], { type: 'application/pdf' })
  revoke(previewUrl); previewUrl.value = URL.createObjectURL(blob)
  setViewerTo(previewUrl)
}

// stamp MANY (selected checkboxes) in a grid on last page
async function stampManyAndPreview() {
  if (!pdfBytes.value || selectedSigIndexes.value.length === 0) return

  const pdfDoc = await PDFDocument.load(pdfBytes.value)
  const pages = pdfDoc.getPages()
  const last = pages[pages.length - 1]
  const pageW = last.getWidth()
  const pageH = last.getHeight()

  const startX = coords.value.x
  const startY = coords.value.y
  const w = coords.value.w
  const h = coords.value.h
  const GAP = 10
  const MARGIN = 10

  let x = startX
  let y = startY

  // order: newest first same as UI (selected order)
  for (const idx of selectedSigIndexes.value) {
    const s = stamp.signatures[idx]
    const dataUrl = s?.signature || s?.image
    if (!dataUrl) continue

    const image = await embedFromDataUrl(pdfDoc, dataUrl)
    last.drawImage(image, { x, y, width: w, height: h })

    // advance row (upwards in PDF coords)
    y += h + GAP

    // wrap to next column if exceeding page height
    if (y + h > pageH - MARGIN) {
      y = startY
      x += w + GAP
      if (x + w > pageW - MARGIN) break // no more room
    }
  }

  const outBytes = await PDFDocument.save(pdfDoc)
  const blob = new Blob([outBytes], { type: 'application/pdf' })
  revoke(previewUrl); previewUrl.value = URL.createObjectURL(blob)
  setViewerTo(previewUrl)
}

function showOriginal() { if (origUrl.value) setViewerTo(origUrl) }
function showStamped() { if (previewUrl.value) setViewerTo(previewUrl) }
</script>
