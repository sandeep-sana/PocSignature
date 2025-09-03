<template>
  <div class="max-w-6xl mx-auto px-4 py-4 space-y-6">
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

      <div class="flex items-center flex-wrap gap-3 text-sm opacity-80">
        <span>Zoom: {{ (scale * 100).toFixed(0) }}%</span>
        <input type="range" min="50" max="200" v-model.number="zoomUi" @input="applyZoomFromUi" />
        <button class="border px-2 py-1 rounded" :disabled="!pdfReady" @click="fitToWidth">Fit width</button>
        <button class="border px-2 py-1 rounded" :disabled="!pdfReady" @click="fitToHeight">Fit height</button>
      </div>

      <!-- PDF stage with separate overlay canvas -->
      <div class="relative overflow-auto border rounded p-2" style="max-height:70vh;">
        <!-- Base PDF canvas (CSS-scaled to width) -->
        <canvas ref="pdfCanvas" class="block mx-auto" style="width:100%;height:auto;" />
        <!-- Transparent overlay for selection (size/pos synced in JS) -->
        <canvas
          ref="overlayCanvas"
          class="absolute pointer-events-auto"
          style="inset:0;margin:auto;touch-action:none;z-index:10;cursor:crosshair;"
        />
      </div>

      <div class="flex flex-wrap gap-2">
        <button class="border px-3 py-2 rounded" :disabled="!hasCrop" @click="clearCrop">Clear selection</button>
        <button class="border px-3 py-2 rounded" :disabled="!hasCrop" @click="applyCropFromSelection">Apply crop</button>
      </div>
      <p class="text-xs opacity-70">Drag on the overlay to select the signature. Release (auto-apply) or click “Apply crop”.</p>
    </div>

    <!-- Raw previews -->
    <div class="grid md:grid-cols-2 gap-4">
      <div>
        <h3 class="text-sm font-medium mb-2">Employee Signature (Reference)</h3>
        <div class="border rounded p-2 min-h-28 flex items-center justify-center checker">
          <img v-if="sigDataUrl" :src="sigDataUrl" style="max-height:12rem;width:100%;object-fit:contain;" />
          <span v-else class="text-xs opacity-60">No signature selected.</span>
        </div>
      </div>
      <div>
        <h3 class="text-sm font-medium mb-2">PDF Cropped Signature</h3>
        <div class="border rounded p-2 min-h-28 flex items-center justify-center checker">
          <img v-if="pdfCropDataUrl" :src="pdfCropDataUrl" :key="pdfCropDataUrl" style="max-height:12rem;width:100%;object-fit:contain;" />
          <span v-else class="text-xs opacity-60">No crop yet. Draw a box on the PDF.</span>
        </div>
      </div>
    </div>

    <!-- Aligned inputs (normalized) — fixed size via inline style -->
    <div v-if="alignedAUrl || alignedBUrl" class="grid md:grid-cols-2 gap-4">
      <div>
        <h3 class="text-sm font-medium mb-2">Aligned Employee (normalized)</h3>
        <div class="border rounded p-2 flex items-center justify-center checker"
             :style="canonicalBoxStyle">
          <img v-if="alignedAUrl" :src="alignedAUrl" :key="alignedAUrl"
               style="width:100%;height:100%;object-fit:contain;image-rendering:pixelated;" />
          <span v-else class="text-xs opacity-60">—</span>
        </div>
      </div>
      <div>
        <h3 class="text-sm font-medium mb-2">Aligned PDF Crop (normalized)</h3>
        <div class="border rounded p-2 flex items-center justify-center checker"
             :style="canonicalBoxStyle">
          <img v-if="alignedBUrl" :src="alignedBUrl" :key="alignedBUrl"
               style="width:100%;height:100%;object-fit:contain;image-rendering:pixelated;" />
          <span v-else class="text-xs opacity-60">—</span>
        </div>
      </div>
    </div>

    <!-- Compare -->
    <div class="flex items-center gap-3">
      <button class="border px-3 py-2 rounded" :disabled="!sigDataUrl || !pdfCropDataUrl" @click="compareNow">
        Align & Compare (position-invariant)
      </button>
      <div class="text-sm opacity-80">
        <span class="mr-2">Blur: {{ BLUR_PX }}px</span>
        <span class="mr-2">Threshold: {{ thresholdMode }}</span>
        <span>Shift search: ±{{ MAX_SHIFT }}px</span>
      </div>
    </div>

    <!-- Result + Diff -->
    <div v-if="result" class="grid md:grid-cols-2 gap-4">
      <div class="border rounded p-3 text-sm">
        <p class="mb-2"><strong>Match (Jaccard):</strong> {{ result.matchPercent.toFixed(2) }}%</p>
        <p class="opacity-80">Intersection: {{ result.intersection }} | Union: {{ result.union }}</p>
        <p class="opacity-80">Best shift: dx={{ result.dx }}, dy={{ result.dy }}</p>
      </div>
      <div class="border rounded p-3">
        <p class="text-sm font-medium mb-2">Diff Preview (green=overlap, red=only employee, blue=only PDF)</p>
        <canvas ref="diffCanvas" class="border max-w-full"></canvas>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount, watch, nextTick, computed } from 'vue'
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

// Aligned previews (normalized)
const alignedAUrl = ref('')
const alignedBUrl = ref('')

// Compare result + diff
const result = ref(null)
const diffCanvas = ref(null)

// Tunables (+ used for inline size)
const CANONICAL_W = 360
const CANONICAL_H = 120
const BLUR_PX = 1
const thresholdMode = 'adaptive'
const MAX_SHIFT = 20 // px

// Inline style for canonical boxes (so no CSS dependency)
const canonicalBoxStyle = computed(() => ({
  width: CANONICAL_W + 'px',
  height: CANONICAL_H + 'px',
  maxWidth: '100%'
}))

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
  canvas.width = viewport.width
  canvas.height = viewport.height

  hasCrop.value = false; isDragging.value = false
  cropStart.x = cropStart.y = 0; cropEnd.x = cropEnd.y = 0
  pdfCropDataUrl.value = ''; result.value = null
  alignedAUrl.value = ''; alignedBUrl.value = ''

  await page.render({ canvasContext: ctx, viewport }).promise
  await nextTick()
  syncOverlayCssSize()
}

const syncOverlayCssSize = () => {
  const base = pdfCanvas.value
  const o = overlayCanvas.value
  if (!base || !o) return

  // intrinsic pixels
  o.width = base.width
  o.height = base.height

  // match CSS box (base is width:100%; height:auto)
  const rect = base.getBoundingClientRect()
  o.style.width = rect.width + 'px'
  o.style.height = rect.height + 'px'
  o.style.position = 'absolute'
  o.style.left = base.offsetLeft + 'px'
  o.style.top = base.offsetTop + 'px'
  o.style.zIndex = '10'
  o.style.cursor = 'crosshair'

  overlayCtx.value = o.getContext('2d')
  wireOverlayPointer()
  drawOverlay()
}

const handleResize = () => syncOverlayCssSize()

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
    if (hasCrop.value) applyCropFromSelection()
  }
  o.onpointerup = finish
  o.onpointerleave = finish
  o.onpointercancel = finish
}

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
    ctx.fillRect(0, 0, o.width, y)
    ctx.fillRect(0, y + h, o.width, o.height - (y + h))
    ctx.fillRect(0, y, x, h)
    ctx.fillRect(x + w, y, o.width - (x + w), h)
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
}

const rectWidth = () => Math.abs(cropEnd.x - cropStart.x)
const rectHeight = () => Math.abs(cropEnd.y - cropStart.y)

const applyCropFromSelection = () => {
  if (!hasCrop.value) return
  const base = pdfCanvas.value
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
  pdfCropDataUrl.value = tmp.toDataURL('image/png')
}

// ---------- compare (position-invariant) ----------
const compareNow = async () => {
  try {
    result.value = null
    alignedAUrl.value = ''; alignedBUrl.value = ''
    const [imgA, imgB] = await Promise.all([loadImage(sigDataUrl.value), loadImage(pdfCropDataUrl.value)])
    const normA = normalizeForCompare(imgA, CANONICAL_H, CANONICAL_W)
    const normB = normalizeForCompare(imgB, CANONICAL_H, CANONICAL_W)
    alignedAUrl.value = normA.canvas.toDataURL('image/png')
    alignedBUrl.value = normB.canvas.toDataURL('image/png')
    const A = normA.binary, B = normB.binary
    const W = CANONICAL_W, H = CANONICAL_H
    const { bestDx, bestDy, bestIntersection, bestUnion } = bestShiftJaccard(A, B, W, H, MAX_SHIFT)
    const diffImg = buildDiffImage(A, B, W, H, bestDx, bestDy)
    const match = bestUnion > 0 ? (bestIntersection / bestUnion) * 100 : 0
    result.value = { matchPercent: match, dx: bestDx, dy: bestDy, intersection: bestIntersection, union: bestUnion }
    await nextTick()
    const dCanvas = diffCanvas.value
    if (!dCanvas) return
    dCanvas.width = W; dCanvas.height = H
    dCanvas.getContext('2d').putImageData(diffImg, 0, 0)
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

function normalizeForCompare (img, targetH, canvasW) {
  let c = document.createElement('canvas')
  c.width = Math.max(1, img.width); c.height = Math.max(1, img.height)
  let ctx = c.getContext('2d')
  ctx.drawImage(img, 0, 0, c.width, c.height)

  let id = ctx.getImageData(0, 0, c.width, c.height)
  id = grayscale(id)
  if (BLUR_PX > 0) id = boxBlur(id, c.width, c.height, BLUR_PX)
  id = thresholdToBW(id, thresholdMode)

  let bbox = contentBBox(id, c.width, c.height)
  if (!bbox) {
    invertImage(id)
    bbox = contentBBox(id, c.width, c.height)
    if (!bbox) {
      const blank = document.createElement('canvas')
      blank.width = canvasW; blank.height = targetH
      return { canvas: blank, binary: new Uint8Array(canvasW * targetH) }
    }
  }
  const trimmed = cropImageDataToCanvas(id, c.width, c.height, bbox)
  const r = Math.min(targetH / trimmed.height, canvasW / trimmed.width)
  const scaledW = Math.max(1, Math.round(trimmed.width * r))
  const scaledH = Math.max(1, Math.round(trimmed.height * r))
  const s = document.createElement('canvas')
  s.width = scaledW; s.height = scaledH
  s.getContext('2d').drawImage(trimmed, 0, 0, scaledW, scaledH)

  const out = document.createElement('canvas')
  out.width = canvasW; out.height = targetH
  const octx = out.getContext('2d')
  octx.fillStyle = '#ffffff'
  octx.fillRect(0, 0, out.width, out.height)
  const ox = Math.floor((canvasW - scaledW) / 2)
  const oy = Math.floor((targetH - scaledH) / 2)
  octx.drawImage(s, ox, oy)

  let outId = octx.getImageData(0, 0, out.width, out.height)
  outId = thresholdToBW(grayscale(outId), 'fixed', 128)
  octx.putImageData(outId, 0, 0)

  const bin = new Uint8Array(out.width * out.height)
  for (let i = 0, p = 0; i < outId.data.length; i += 4, p++) {
    bin[p] = outId.data[i] === 0 ? 1 : 0
  }
  return { canvas: out, binary: bin }
}

function grayscale (img) {
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    const y = Math.round(0.299 * d[i] + 0.587 * d[i+1] + 0.114 * d[i+2])
    d[i] = d[i+1] = d[i+2] = y
  }
  return img
}
function thresholdToBW (img, mode = 'adaptive', fixedT = 180) {
  const d = img.data
  let T = fixedT
  if (mode === 'adaptive') {
    let sum = 0
    for (let i = 0; i < d.length; i += 4) sum += d[i]
    T = Math.round(sum / (d.length / 4))
  }
  for (let i = 0; i < d.length; i += 4) {
    const v = d[i] > T ? 255 : 0
    d[i] = d[i+1] = d[i+2] = v
    d[i+3] = 255
  }
  return img
}
function invertImage (img) {
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    d[i]   = 255 - d[i]
    d[i+1] = 255 - d[i+1]
    d[i+2] = 255 - d[i+2]
  }
}
function contentBBox (img, w, h) {
  const d = img.data
  let minX = w, minY = h, maxX = -1, maxY = -1
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      if (d[i] === 0) {
        if (x < minX) minX = x
        if (y < minY) minY = y
        if (x > maxX) maxX = x
        if (y > maxY) maxY = y
      }
    }
  }
  if (maxX < 0) return null
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 }
}
function cropImageDataToCanvas (img, w, h, box) {
  const c = document.createElement('canvas')
  c.width = box.w; c.height = box.h
  const ctx = c.getContext('2d')
  const tmp = new ImageData(box.w, box.h)
  for (let yy = 0; yy < box.h; yy++) {
    const srcStart = ((box.y + yy) * w + box.x) * 4
    const dstStart = (yy * box.w) * 4
    tmp.data.set(img.data.subarray(srcStart, srcStart + box.w * 4), dstStart)
  }
  ctx.putImageData(tmp, 0, 0)
  return c
}
function boxBlur (img, w, h, r) {
  const src = img.data, out = new Uint8ClampedArray(src.length), tmp = new Uint8ClampedArray(src.length), ch = 4
  for (let y = 0; y < h; y++) {
    let acc = 0
    for (let k = -r; k <= r; k++) acc += src[(y*w + clamp(k,0,w-1)) * ch]
    for (let x = 0; x < w; x++) {
      const i = (y*w + x) * ch
      tmp[i] = tmp[i+1] = tmp[i+2] = Math.round(acc / (2*r+1))
      tmp[i+3] = 255
      const xOut = x - r, xIn = x + r + 1
      acc += src[(y*w + clamp(xIn,0,w-1)) * ch]
      acc -= src[(y*w + clamp(xOut,0,w-1)) * ch]
    }
  }
  for (let x = 0; x < w; x++) {
    let acc = 0
    for (let k = -r; k <= r; k++) acc += tmp[(clamp(k,0,h-1)*w + x) * ch]
    for (let y = 0; y < h; y++) {
      const i = (y*w + x) * ch
      const v = Math.round(acc / (2*r+1))
      out[i] = out[i+1] = out[i+2] = v
      out[i+3] = 255
      const yOut = y - r, yIn = y + r + 1
      acc += tmp[(clamp(yIn,0,h-1)*w + x) * ch]
      acc -= tmp[(clamp(yOut,0,h-1)*w + x) * ch]
    }
  }
  return new ImageData(out, w, h)
}
function bestShiftJaccard (A, B, W, H, R) {
  let best = -1, bestDx = 0, bestDy = 0, bestI = 0, bestU = 0
  for (let dy = -R; dy <= R; dy++) {
    for (let dx = -R; dx <= R; dx++) {
      let inter = 0, uni = 0
      const xStart = Math.max(0, dx), xEnd = Math.min(W, W + dx)
      const yStart = Math.max(0, dy), yEnd = Math.min(H, H + dy)
      for (let y = yStart; y < yEnd; y++) {
        let iA = y * W + xStart, iB = (y - dy) * W + (xStart - dx)
        for (let x = xStart; x < xEnd; x++, iA++, iB++) {
          const a = A[iA], b = B[iB]
          if (a | b) { uni++; if (a & b) inter++; }
        }
      }
      const score = uni > 0 ? inter / uni : 0
      if (score > best) { best = score; bestDx = dx; bestDy = dy; bestI = inter; bestU = uni }
    }
  }
  return { bestDx, bestDy, bestIntersection: bestI, bestUnion: bestU }
}
function buildDiffImage (A, B, W, H, dx, dy) {
  const out = new Uint8ClampedArray(W * H * 4)
  for (let i = 0; i < out.length; i += 4) { out[i]=230; out[i+1]=230; out[i+2]=230; out[i+3]=255 }
  const xStart = Math.max(0, dx), xEnd = Math.min(W, W + dx)
  const yStart = Math.max(0, dy), yEnd = Math.min(H, H + dy)
  for (let y = yStart; y < yEnd; y++) {
    let iA = y * W + xStart, iB = (y - dy) * W + (xStart - dx)
    for (let x = xStart; x < xEnd; x++, iA++, iB++) {
      const a = A[iA], b = B[iB], o = (y * W + x) * 4
      if (a && b)      { out[o]=0;   out[o+1]=180; out[o+2]=0   }
      else if (a)      { out[o]=220; out[o+1]=0;   out[o+2]=0   }
      else if (b)      { out[o]=0;   out[o+1]=90;  out[o+2]=255 }
    }
  }
  return new ImageData(out, W, H)
}
function canvasCoords (canvas, ev) {
  const rect = canvas.getBoundingClientRect()
  const x = (ev.clientX - rect.left) * (canvas.width / rect.width)
  const y = (ev.clientY - rect.top) * (canvas.height / rect.height)
  return { x: Math.round(x), y: Math.round(y) }
}
function clamp (v, lo, hi) { return Math.max(lo, Math.min(hi, v)) }

// ---------- lifecycle ----------
onMounted(() => {
  employeeList()
  window.addEventListener('resize', handleResize, { passive: true })
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
})
watch(selectedEmployeeId, fetchSignatures)
</script>

<style scoped>
/* only non-critical cosmetics left here */

.min-h-28 { min-height: 7rem; }

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
