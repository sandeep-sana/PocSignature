<template>
  <div class="space-y-4">
    <!-- Select employee + pick a saved signature -->
    <div>
      <label class="block text-sm font-medium">Selected Employee</label>
      <select v-model="selectedEmployeeId" class="border p-2 rounded w-full">
        <option value="">-- Select an employee --</option>
        <option v-for="emp in validateCompare.list" :key="emp._id" :value="emp._id">
          {{ emp.name }} ({{ emp.empId }})
        </option>
      </select>
      <p class="text-xs opacity-70 mt-1">Selecting an employee loads all their saved signatures.</p>

      <div class="grid md:grid-cols-4 sm:grid-cols-2 gap-3 mt-3">
        <label
          v-for="(s, i) in validateCompare.signatures"
          :key="s._id || i"
          class="border rounded p-2 flex items-center gap-2 cursor-pointer"
        >
          <input type="radio" :value="i" v-model.number="selectedSigIndex" @change="onSelectSig(i)" />
          <img :src="s.signature || s.image" alt="" class="border rounded" style="height:42px" />
          <span class="text-xs opacity-70 ml-auto">v{{ s.version ?? (i + 1) }}</span>
        </label>
      </div>
    </div>

    <!-- PDF upload + render -->
    <div class="space-y-2">
      <label class="block text-sm font-medium">Upload PDF (the page with the signature)</label>
      <input type="file" accept="application/pdf" @change="onPdfFile" class="border p-2 rounded w-full" />

      <div class="flex items-center gap-3 text-sm opacity-80">
        <span>Zoom: {{ (scale * 100).toFixed(0) }}%</span>
        <input type="range" min="50" max="200" v-model.number="zoomUi" @input="applyZoomFromUi" />
        <button class="border px-2 py-1 rounded" :disabled="!pdfReady" @click="fitToWidth">Fit width</button>
        <button class="border px-2 py-1 rounded" :disabled="!pdfReady" @click="fitToHeight">Fit height</button>
      </div>

      <!-- PDF stage with separate overlay canvas -->
      <div class="relative overflow-auto border rounded p-2" style="max-height: 70vh;">
        <!-- Base PDF canvas -->
        <canvas ref="pdfCanvas" class="block mx-auto" />
        <!-- Transparent overlay for selection -->
        <canvas
          ref="overlayCanvas"
          class="absolute"
          style="inset: 0; margin: auto; touch-action: none; pointer-events: auto; z-index: 10; cursor: crosshair;"
        />
      </div>

      <div class="flex flex-wrap gap-2">
        <button class="border px-3 py-2 rounded" :disabled="!hasCrop" @click="clearCrop">Clear selection</button>
        <!-- Optional manual apply; auto-apply already happens on release -->
        <button class="border px-3 py-2 rounded" :disabled="!hasCrop" @click="applyCropFromSelection">Apply crop</button>
      </div>
      <p class="text-xs opacity-70">Drag on the overlay to select the signature. The cropped preview appears immediately.</p>
    </div>

    <!-- Preview: selected DB signature & cropped PDF signature (shows FIRST) -->
    <div class="grid md:grid-cols-2 gap-4">
      <div>
        <h3 class="text-sm font-medium mb-2">Cropped PDF Signature (Preview)</h3>
        <div class="border rounded p-2 min-h-28 flex items-center justify-center checker">
          <!-- force <img> refresh by key -->
          <img v-if="pdfCropDataUrl" :src="pdfCropDataUrl" :key="pdfCropDataUrl" class="max-h-40 object-contain" />
          <span v-else class="text-xs opacity-60">No crop yet. Draw a box on the PDF.</span>
        </div>
      </div>

      <div>
        <h3 class="text-sm font-medium mb-2">Selected Employee Signature</h3>
        <div class="border rounded p-2 min-h-28 flex items-center justify-center checker">
          <img v-if="sigDataUrl" :src="sigDataUrl" class="max-h-40 object-contain" />
          <span v-else class="text-xs opacity-60">No signature selected.</span>
        </div>
      </div>
    </div>

    <!-- Compare -->
    <div class="flex items-center gap-3">
      <button
        class="border px-3 py-2 rounded"
        :disabled="!sigDataUrl || !pdfCropDataUrl"
        @click="compareNow"
      >
        Compare Signatures
      </button>
      <div class="text-sm opacity-80">
        <span class="mr-2">Blur: {{ BLUR_PX }}px</span>
        <span>Threshold: {{ thresholdMode }}</span>
      </div>
    </div>

    <!-- Result + Diff -->
    <div v-if="result" class="grid md:grid-cols-2 gap-4">
      <div class="border rounded p-3">
        <p class="mb-2"><strong>Match:</strong> {{ result.matchPercent.toFixed(2) }}%</p>
        <p class="text-xs opacity-70">
          Diff pixels: {{ result.diffPixels }} / {{ result.totalPixels }}
        </p>
      </div>
      <div class="border rounded p-3">
        <p class="text-sm font-medium mb-2">Diff Preview</p>
        <canvas ref="diffCanvas" class="border max-w-full"></canvas>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch, nextTick } from 'vue'
import api from '~~/api.config'
import CONFIG from '~~/config'

// ---------- state ----------
const sigDataUrl = ref('')
const selectedEmployeeId = ref('')
const selectedSigIndex = ref(null)
const validateCompare = reactive({ list: [], signatures: [] })

// PDF.js
let pdfjsLib = null
let pdfDoc = null
const pdfCanvas = ref(null)
const pdfCtx = ref(null)
const scale = ref(1)
const zoomUi = ref(100)
const pdfReady = ref(false)

// Overlay
const overlayCanvas = ref(null)
const overlayCtx = ref(null)

// Crop state
const isDragging = ref(false)
const cropStart = reactive({ x: 0, y: 0 })
const cropEnd = reactive({ x: 0, y: 0 })
const hasCrop = ref(false)

// Cropped image from PDF
const pdfCropDataUrl = ref('')

// Compare result + diff
const result = ref(null)
const diffCanvas = ref(null)

// Tunables
const CANONICAL_W = 600
const CANONICAL_H = 200
const BLUR_PX = 1
const thresholdMode = 'adaptive'

// ---------- API ----------
const employeeList = async () => {
  try {
    const res = await api.get(`${CONFIG.API}/api/employee/employee`)
    validateCompare.list = res.data?.list || []
  } catch (e) { console.error(e) }
}

const fetchSignatures = async (employeeId) => {
  if (!employeeId) {
    validateCompare.signatures = []; selectedSigIndex.value = null; sigDataUrl.value = ''
    return
  }
  try {
    const response = await api.get(`${CONFIG.API}/api/employee/employeeId`, { params: { _id: employeeId } })
    validateCompare.signatures = response.data?.data?.signatures || []
    if (validateCompare.signatures.length) {
      selectedSigIndex.value = 0
      sigDataUrl.value = validateCompare.signatures[0].signature || validateCompare.signatures[0].image || ''
    } else { selectedSigIndex.value = null; sigDataUrl.value = '' }
  } catch (e) {
    console.error('Failed to load signatures:', e)
    validateCompare.signatures = []; selectedSigIndex.value = null; sigDataUrl.value = ''
  }
}

const onSelectSig = (i) => {
  const s = validateCompare.signatures[i]
  sigDataUrl.value = s?.signature || s?.image || ''
}

// ---------- PDF load/render ----------
const onPdfFile = async (e) => {
  const file = e.target.files?.[0]; if (!file) return
  await ensurePdfJs()
  const buf = await file.arrayBuffer()
  const loadingTask = pdfjsLib.getDocument({ data: buf })
  pdfDoc = await loadingTask.promise
  scale.value = 1; zoomUi.value = 100
  await renderPage(1)
  pdfReady.value = true
}

// workerSrc as URL string
const ensurePdfJs = async () => {
  if (pdfjsLib) return
  const [{ default: workerSrc }, pdfMod] = await Promise.all([
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
    import('pdfjs-dist/build/pdf')
  ])
  pdfjsLib = pdfMod
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc
}

const renderPage = async (pageNumber) => {
  const page = await pdfDoc.getPage(pageNumber)
  const viewport = page.getViewport({ scale: scale.value })
  const canvas = pdfCanvas.value; if (!canvas) return
  const ctx = canvas.getContext('2d'); pdfCtx.value = ctx
  canvas.width = viewport.width; canvas.height = viewport.height

  // reset crop/result
  hasCrop.value = false; isDragging.value = false
  cropStart.x = cropStart.y = 0; cropEnd.x = cropEnd.y = 0
  pdfCropDataUrl.value = ''; result.value = null

  await page.render({ canvasContext: ctx, viewport }).promise
  await nextTick()

  // ---- overlay sync ----
  const o = overlayCanvas.value
  o.width = canvas.width
  o.height = canvas.height

  // match CSS size to base canvas rect (prevents DPI/CSS mismatch)
  const rect = canvas.getBoundingClientRect()
  o.style.width = rect.width + 'px'
  o.style.height = rect.height + 'px'

  // position overlay exactly on top of base within the scroller
  o.style.position = 'absolute'
  o.style.left = canvas.offsetLeft + 'px'
  o.style.top = canvas.offsetTop + 'px'
  o.style.zIndex = '10'
  o.style.cursor = 'crosshair'

  overlayCtx.value = o.getContext('2d')
  wireOverlayPointer()
  drawOverlay()
}

// ---------- overlay pointer events ----------
const wireOverlayPointer = () => {
  const o = overlayCanvas.value; if (!o) return
  o.onpointerdown = o.onpointermove = o.onpointerup = o.onpointerleave = o.onpointercancel = null

  o.onpointerdown = (ev) => {
    o.setPointerCapture?.(ev.pointerId)
    const { x, y } = canvasCoords(o, ev)
    cropStart.x = x; cropStart.y = y
    cropEnd.x = x; cropEnd.y = y
    isDragging.value = true
    drawOverlay()
  }

  o.onpointermove = (ev) => {
    if (!isDragging.value) return
    const { x, y } = canvasCoords(o, ev)
    cropEnd.x = clamp(x, 0, o.width)
    cropEnd.y = clamp(y, 0, o.height)
    drawOverlay()
  }

  const finish = () => {
    if (!isDragging.value) return
    isDragging.value = false
    hasCrop.value = rectWidth() > 3 && rectHeight() > 3
    drawOverlay()
    // ✅ Auto-apply crop so the preview shows immediately
    if (hasCrop.value) applyCropFromSelection()
  }
  o.onpointerup = finish
  o.onpointerleave = finish
  o.onpointercancel = finish
}

// draw translucent mask + rect on overlay
const drawOverlay = () => {
  const o = overlayCanvas.value; const ctx = overlayCtx.value
  if (!o || !ctx) return
  ctx.clearRect(0, 0, o.width, o.height)
  if (isDragging.value || hasCrop.value) {
    const x = Math.min(cropStart.x, cropEnd.x)
    const y = Math.min(cropStart.y, cropEnd.y)
    const w = rectWidth(); const h = rectHeight()
    ctx.save()
    ctx.fillStyle = 'rgba(0,0,0,0.25)'
    ctx.fillRect(0, 0, o.width, y)                         // top
    ctx.fillRect(0, y + h, o.width, o.height - (y + h))    // bottom
    ctx.fillRect(0, y, x, h)                               // left
    ctx.fillRect(x + w, y, o.width - (x + w), h)           // right
    ctx.strokeStyle = '#03a9f4'
    ctx.lineWidth = 2
    ctx.setLineDash([6, 4])
    ctx.strokeRect(x, y, w, h)
    ctx.restore()
  }
}

const clearCrop = () => {
  hasCrop.value = false; isDragging.value = false
  cropStart.x = cropStart.y = 0
  cropEnd.x = cropEnd.y = 0
  drawOverlay()
  // keep current preview; comment next line if you want to clear preview too
  // pdfCropDataUrl.value = ''
}

const rectWidth = () => Math.abs(cropEnd.x - cropStart.x)
const rectHeight = () => Math.abs(cropEnd.y - cropStart.y)

// ✅ Used by auto-apply and the "Apply crop" button
const applyCropFromSelection = () => {
  if (!hasCrop.value) return
  const base = pdfCanvas.value

  // integer + clamped crop box
  let x = Math.min(cropStart.x, cropEnd.x)
  let y = Math.min(cropStart.y, cropEnd.y)
  let w = rectWidth()
  let h = rectHeight()

  x = Math.max(0, Math.floor(x))
  y = Math.max(0, Math.floor(y))
  w = Math.max(1, Math.floor(w))
  h = Math.max(1, Math.floor(h))
  if (x + w > base.width) w = base.width - x
  if (y + h > base.height) h = base.height - y

  const tmp = document.createElement('canvas')
  tmp.width = w; tmp.height = h
  const tctx = tmp.getContext('2d')
  tctx.drawImage(base, x, y, w, h, 0, 0, w, h)

  // force preview to refresh
  pdfCropDataUrl.value = tmp.toDataURL('image/png')
}

// ---------- zoom ----------
const applyZoomFromUi = async () => {
  if (!pdfDoc) return
  scale.value = zoomUi.value / 100
  await renderPage(1)
}
const fitToWidth = async () => {
  if (!pdfDoc) return
  const page = await pdfDoc.getPage(1)
  const viewport = page.getViewport({ scale: 1 })
  const canvas = pdfCanvas.value
  const targetW = Math.min(viewport.width, (canvas?.parentElement?.clientWidth || viewport.width) - 16)
  scale.value = targetW / viewport.width
  zoomUi.value = Math.round(scale.value * 100)
  await renderPage(1)
}
const fitToHeight = async () => {
  if (!pdfDoc) return
  const page = await pdfDoc.getPage(1)
  const viewport = page.getViewport({ scale: 1 })
  const canvas = pdfCanvas.value
  const targetH = Math.min(viewport.height, (canvas?.parentElement?.clientHeight || viewport.height) - 16)
  scale.value = targetH / viewport.height
  zoomUi.value = Math.round(scale.value * 100)
  await renderPage(1)
}

// ---------- compare ----------
const compareNow = async () => {
  try {
    result.value = null
    const [imgA, imgB] = await Promise.all([loadImage(sigDataUrl.value), loadImage(pdfCropDataUrl.value)])
    const a = drawNormalized(imgA, CANONICAL_W, CANONICAL_H)
    const b = drawNormalized(imgB, CANONICAL_W, CANONICAL_H)
    const aData = preprocess(a.getContext('2d'), a.width, a.height, BLUR_PX, thresholdMode)
    const bData = preprocess(b.getContext('2d'), b.width, b.height, BLUR_PX, thresholdMode)
    const { diffCount, total, diffImageData } = diffBinary(aData, bData)

    const matchPercent = (1 - diffCount / total) * 100
    result.value = { matchPercent, diffPixels: diffCount, totalPixels: total }

    await nextTick()
    const dCanvas = diffCanvas.value
    if (!dCanvas) return
    dCanvas.width = CANONICAL_W
    dCanvas.height = CANONICAL_H
    dCanvas.getContext('2d').putImageData(diffImageData, 0, 0)
  } catch (err) {
    console.error('Compare failed:', err)
    result.value = null
  }
}

// ---------- helpers ----------
function loadImage (src) {
  return new Promise((resolve, reject) => {
    if (!src) return reject(new Error('Empty image src'))
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function drawNormalized (img, W, H) {
  const c = document.createElement('canvas'); c.width = W; c.height = H
  const ctx = c.getContext('2d'); ctx.clearRect(0, 0, W, H)
  const r = Math.min(W / img.width, H / img.height)
  const dw = Math.max(1, Math.round(img.width * r))
  const dh = Math.max(1, Math.round(img.height * r))
  const dx = Math.floor((W - dw) / 2)
  const dy = Math.floor((H - dh) / 2)
  ctx.drawImage(img, dx, dy, dw, dh)
  return c
}

function preprocess (ctx, w, h, blurPx = 1, threshMode = 'adaptive') {
  let img = ctx.getImageData(0, 0, w, h)
  const data = img.data
  for (let i = 0; i < data.length; i += 4) {
    const y = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2])
    data[i] = data[i + 1] = data[i + 2] = y
  }
  if (blurPx > 0) img = boxBlur(img, w, h, blurPx)
  let T = 180
  if (threshMode === 'adaptive') {
    let sum = 0; for (let i = 0; i < img.data.length; i += 4) sum += img.data[i]
    T = Math.round(sum / (img.data.length / 4))
  }
  for (let i = 0; i < img.data.length; i += 4) {
    const v = img.data[i] > T ? 255 : 0
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255
  }
  return img
}

function boxBlur (img, w, h, r) {
  const src = img.data, out = new Uint8ClampedArray(src.length), tmp = new Uint8ClampedArray(src.length), ch = 4
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0
      for (let k = -r; k <= r; k++) sum += src[(y * w + clamp(x + k, 0, w - 1)) * ch]
      const v = Math.round(sum / (2 * r + 1)), i = (y * w + x) * ch
      tmp[i] = tmp[i + 1] = tmp[i + 2] = v; tmp[i + 3] = 255
    }
  }
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      let sum = 0
      for (let k = -r; k <= r; k++) sum += tmp[(clamp(y + k, 0, h - 1) * w + x) * ch]
      const v = Math.round(sum / (2 * r + 1)), i = (y * w + x) * ch
      out[i] = out[i + 1] = out[i + 2] = v; out[i + 3] = 255
    }
  }
  return new ImageData(out, w, h)
}

function diffBinary (imgA, imgB) {
  const w = Math.min(imgA.width, imgB.width), h = Math.min(imgA.height, imgB.height)
  const total = w * h, out = new Uint8ClampedArray(w * h * 4)
  let diff = 0
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4, a = imgA.data[i], b = imgB.data[i], same = a === b
      if (!same) diff++
      if (same) { out[i] = out[i + 1] = out[i + 2] = 220 } else { out[i] = 255; out[i + 1] = 0; out[i + 2] = 0 }
      out[i + 3] = 255
    }
  }
  return { diffCount: diff, total, diffImageData: new ImageData(out, w, h) }
}

function canvasCoords (canvas, ev) {
  const rect = canvas.getBoundingClientRect()
  const x = (ev.clientX - rect.left) * (canvas.width / rect.width)
  const y = (ev.clientY - rect.top) * (canvas.height / rect.height)
  return { x: Math.round(x), y: Math.round(y) }
}
function clamp (v, lo, hi) { return Math.max(lo, Math.min(hi, v)) }

// ---------- lifecycle ----------
onMounted(employeeList)
watch(selectedEmployeeId, fetchSignatures)
</script>

<style scoped>
.min-h-28 { min-height: 7rem; }
/* checkerboard background to make crop bounds obvious */
.checker {
  background-image:
    linear-gradient(45deg, #eee 25%, transparent 25%),
    linear-gradient(-45deg, #eee 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #eee 75%),
    linear-gradient(-45deg, transparent 75%, #eee 75%);
  background-size: 16px 16px;
  background-position: 0 0, 0 8px, 8px -8px, -8px 0px;
}
</style>
