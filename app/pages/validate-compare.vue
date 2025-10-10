<template>
  <div class="container-lg py-4">
    <!-- 1) Employee & Saved Signatures -->
    <section class="card section-card mb-4">
      <div class="card-header d-flex align-items-center justify-content-between py-2">
        <h2 class="h6 mb-0">Select Employee & Reference Signature</h2>
        <span class="badge rounded-pill"
          :class="validateCompare.signatures?.length ? 'text-bg-success' : 'text-bg-secondary'">
          {{ validateCompare.signatures?.length || 0 }} saved
        </span>
      </div>

      <div class="card-body">
        <div class="row g-3 align-items-end">
          <div class="col-md-8">
            <label class="form-label mb-1">Selected Employee</label>
            <select v-model="selectedEmployeeId" class="form-select" aria-label="Select employee">
              <option value="">— Select an employee —</option>
              <option v-for="emp in validateCompare.list" :key="emp._id" :value="emp._id">
                {{ emp.name }} ({{ emp.empId }})
              </option>
            </select>
            <div class="form-text">Choosing an employee loads their saved signatures below.</div>
          </div>
        </div>

        <!-- Signatures grid -->
        <fieldset class="mt-3">
          <legend class="visually-hidden">Saved signatures</legend>
          <div class="row row-cols-2 row-cols-sm-3 row-cols-lg-6 g-3">
            <div v-for="(s, i) in validateCompare.signatures" :key="s._id || i" class="col">
              <label class="sig-card d-flex align-items-center gap-2 p-2" :class="{ active: selectedSigIndex === i }">
                <input class="form-check-input d-none" type="radio" :value="i" v-model.number="selectedSigIndex"
                  @change="onSelectSig(i)" :aria-label="`Signature version ${s.version ?? (i + 1)}`" />
                <img :src="s.signature || s.image" alt="Saved signature preview" class="sig-thumb img-fluid" />
                <span class="ms-auto small text-muted">v{{ s.version ?? (i + 1) }}</span>
              </label>
            </div>
          </div>

          <p v-if="!validateCompare.signatures?.length" class="text-muted small mt-2 mb-0">
            No saved signatures found for the selected employee.
          </p>
        </fieldset>
      </div>
    </section>

    <!-- 2) PDF Upload & Tools -->
    <section class="card section-card mb-4">
      <div class="card-header d-flex align-items-center justify-content-between py-2">
        <h2 class="h6 mb-0">Upload PDF & Mark Signature Area</h2>
        <span class="badge rounded-pill" :class="pdfReady ? 'text-bg-success' : 'text-bg-secondary'">
          {{ pdfReady ? 'PDF Ready' : 'No PDF loaded' }}
        </span>
      </div>

      <div class="card-body">
        <div class="row g-3 align-items-end">
          <div class="col-md-8">
            <label for="pdf-input" class="form-label mb-1">Upload PDF (page containing the signature)</label>
            <input id="pdf-input" type="file" accept="application/pdf" @change="onPdfFile" class="form-control" />
          </div>

          <div class="col-md-4">
            <div class="border rounded-3 p-2">
              <div class="d-flex align-items-center gap-2 small text-muted">
                <span class="text-nowrap">Zoom: {{ (scale * 100).toFixed(0) }}%</span>
                <input type="range" min="50" max="150" v-model.number="zoomUi" @input="applyZoomFromUi"
                  class="form-range flex-grow-1" :disabled="!pdfReady" />
              </div>
              <div class="mt-2 d-flex gap-2">
                <button class="btn btn-outline-secondary btn-sm" :disabled="!pdfReady" @click="fitToWidth">
                  Fit width
                </button>
                <button class="btn btn-outline-secondary btn-sm" :disabled="!pdfReady" @click="fitToHeight">
                  Fit height
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- PDF stage -->
        <!-- PDF stage (aligned canvases) -->
        <!-- PDF stage (aligned canvases) -->
        <div class="pdf-stage position-relative overflow-auto border rounded-3 mt-3 p-2" ref="pdfStage">
          <div class="canvas-wrap position-relative d-inline-block mx-auto" ref="canvasWrap">
            <!-- Base PDF canvas -->
            <canvas ref="pdfCanvas" class="d-block img-fluid" style="height:auto;" />
            <!-- Transparent overlay for selection -->
            <canvas ref="overlayCanvas" class="overlay-canvas" />
          </div>
        </div>



        <div class="d-flex flex-wrap align-items-center gap-2 mt-3">
          <button class="btn btn-outline-secondary" :disabled="!hasCrop" @click="clearCrop">
            Clear selection
          </button>
          <button class="btn btn-outline-primary" :disabled="!hasCrop" @click="applyCropFromSelection">
            Apply crop
          </button>
          <span class="ms-auto small text-muted">Tip: Drag on the overlay to select the signature area.</span>
        </div>
      </div>
    </section>

    <!-- 3) Raw Previews -->
    <section class="row g-4 mb-4">
      <div class="col-md-6">
        <div class="card section-card h-100">
          <div class="card-header py-2">
            <h3 class="h6 mb-0">Employee Signature (Reference)</h3>
          </div>
          <div class="card-body">
            <div class="checker border rounded-3 d-flex align-items-center justify-content-center min-h-180 p-2">
              <img v-if="sigDataUrl" :src="sigDataUrl" class="img-fluid" style="max-height:12rem; object-fit:contain;"
                alt="Employee signature reference" />
              <span v-else class="text-muted small">No signature selected.</span>
            </div>
          </div>
        </div>
      </div>

      <div class="col-md-6">
        <div class="card section-card h-100">
          <div class="card-header py-2">
            <h3 class="h6 mb-0">PDF Cropped Signature</h3>
          </div>
          <div class="card-body">
            <div class="checker border rounded-3 d-flex align-items-center justify-content-center min-h-180 p-2">
              <img v-if="pdfCropDataUrl" :src="pdfCropDataUrl" :key="pdfCropDataUrl" class="img-fluid"
                style="max-height:12rem; object-fit:contain;" alt="Cropped signature from PDF" />
              <span v-else class="text-muted small">No crop yet. Draw a box on the PDF.</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 4) Normalized (Aligned) Previews -->
    <section v-if="alignedAUrl || alignedBUrl" class="row g-4 mb-4">
      <div class="col-md-6">
        <div class="card section-card h-100">
          <div class="card-header py-2">
            <h3 class="h6 mb-0">Aligned Employee (normalized)</h3>
          </div>
          <div class="card-body">
            <div class="checker border rounded-3 d-flex align-items-center justify-content-center"
              :style="canonicalBoxStyle">
              <img v-if="alignedAUrl" :src="alignedAUrl" :key="alignedAUrl" class="w-100 h-100"
                style="object-fit:contain; image-rendering:pixelated;" alt="Aligned employee signature" />
              <span v-else class="text-muted small">—</span>
            </div>
          </div>
        </div>
      </div>

      <div class="col-md-6">
        <div class="card section-card h-100">
          <div class="card-header py-2">
            <h3 class="h6 mb-0">Aligned PDF Crop (normalized)</h3>
          </div>
          <div class="card-body">
            <div class="checker border rounded-3 d-flex align-items-center justify-content-center"
              :style="canonicalBoxStyle">
              <img v-if="alignedBUrl" :src="alignedBUrl" :key="alignedBUrl" class="w-100 h-100"
                style="object-fit:contain; image-rendering:pixelated;" alt="Aligned PDF signature" />
              <span v-else class="text-muted small">—</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 5) Compare -->
    <section class="d-flex flex-wrap align-items-center gap-2 mb-4">
      <button class="btn btn-primary" :disabled="!sigDataUrl || !pdfCropDataUrl" @click="compareNow">
        Align &amp; Compare (position-invariant)
      </button>

      <div class="d-flex flex-wrap align-items-center gap-2 small text-muted">
        <span class="badge rounded-pill text-bg-light border">Blur: {{ BLUR_PX }}px</span>
        <span class="badge rounded-pill text-bg-light border">Threshold: {{ thresholdMode }}</span>
        <span class="badge rounded-pill text-bg-light border">Shift search: ±{{ MAX_SHIFT }}px</span>
      </div>
    </section>

    <!-- 6) Result + Diff -->
    <section v-if="result" class="row g-4">
      <div class="col-md-6">
        <div class="card section-card h-100">
          <div class="card-body">
            <div class="d-flex align-items-center justify-content-between">
              <p class="mb-0 fw-semibold">Match (Jaccard)</p>
              <span class="badge fs-6" :class="result.matchPercent >= 50 ? 'bg-success' : 'bg-danger'">
                {{ result.matchPercent.toFixed(2) }}%
              </span>
            </div>

            <div class="row g-2 mt-3 small">
              <div class="col-6">
                <div class="border rounded-3 p-2">
                  <div class="text-muted">Intersection</div>
                  <div class="fw-medium">{{ result.intersection }}</div>
                </div>
              </div>
              <div class="col-6">
                <div class="border rounded-3 p-2">
                  <div class="text-muted">Union</div>
                  <div class="fw-medium">{{ result.union }}</div>
                </div>
              </div>
              <div class="col-6">
                <div class="border rounded-3 p-2">
                  <div class="text-muted">Best shift dx</div>
                  <div class="fw-medium">{{ result.dx }}</div>
                </div>
              </div>
              <div class="col-6">
                <div class="border rounded-3 p-2">
                  <div class="text-muted">Best shift dy</div>
                  <div class="fw-medium">{{ result.dy }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="col-md-6">
        <div class="card section-card h-100">
          <div class="card-body">
            <p class="fw-semibold mb-2">Diff Preview</p>
            <p class="text-muted small mb-3">
              <span class="me-2">Green = overlap</span>
              <span class="me-2">Red = only employee</span>
              <span>Blue = only PDF</span>
            </p>
            <div class="border rounded-3 overflow-auto p-2">
              <canvas ref="diffCanvas" class="d-block w-100" style="max-width:100%;"></canvas>
            </div>
          </div>
        </div>
      </div>
    </section>
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
// replace your current onPdfFile with this
const onPdfFile = async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  await ensurePdfJs(); // <-- make sure worker is loaded

  const buf = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: buf });
  pdfDoc = await loadingTask.promise;

  scale.value = 1;
  zoomUi.value = 100;

  await renderPage(1);
  pdfReady.value = true;
};


const ensurePdfJs = async () => {
  if (pdfjsLib) return
  const [{ default: workerSrc }, pdfMod] = await Promise.all([
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
    import('pdfjs-dist/build/pdf')
  ])
  pdfjsLib = pdfMod
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc
}

const pdfStage = ref(null);
const canvasWrap = ref(null);

/** get inner content size (minus padding) */
function innerSize(el) {
  if (!el) return { width: 0, height: 0 };
  const rect = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  const padH = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
  const padV = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
  return { width: Math.max(0, rect.width - padH), height: Math.max(0, rect.height - padV) };
}


const renderPage = async (pageNumber) => {
  const page = await pdfDoc.getPage(pageNumber);

  // 1) CSS zoom used for layout (what you already have on screen)
  const cssScale = Math.max(0.1, scale.value || 1);
  const viewport = page.getViewport({ scale: cssScale });

  const canvas = pdfCanvas.value;
  if (!canvas) return;

  // 2) Output scale for the backing store (real pixels)
  //    Use devicePixelRatio for crisp text/lines on HiDPI displays.
  const dpr = window.devicePixelRatio || 1;
  // Optional safety cap to avoid huge memory (tweak if needed)
  const MAX_DPR = 3;
  const outputScale = Math.min(dpr, MAX_DPR);

  // 3) Set backing-store size (in device pixels)
  canvas.width = Math.floor(viewport.width * outputScale);
  canvas.height = Math.floor(viewport.height * outputScale);

  // 4) Set CSS size (in layout/CSS pixels)
  canvas.style.width = `${Math.floor(viewport.width)}px`;
  canvas.style.height = `${Math.floor(viewport.height)}px`;

  // 5) Get context and reset any previous transforms
  const ctx = canvas.getContext('2d', { alpha: false });
  pdfCtx.value = ctx;
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  // 6) Clear crop/compare state (your original logic)
  hasCrop.value = false;
  isDragging.value = false;
  cropStart.x = cropStart.y = 0;
  cropEnd.x = cropEnd.y = 0;
  pdfCropDataUrl.value = '';
  result.value = null;
  alignedAUrl.value = '';
  alignedBUrl.value = '';

  // 7) Render at HiDPI via transform matrix (keeps CSS size the same)
  const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;

  await page.render({
    canvasContext: ctx,
    viewport,
    transform,           // << key for crisp output
    intent: 'display'
  }).promise;

  await nextTick();
  syncOverlayCssSize();  // make your overlay match the CSS size
};


// replace your syncOverlayCssSize with this
const syncOverlayCssSize = () => {
  const base = pdfCanvas.value;
  const o = overlayCanvas.value;
  if (!base || !o) return;

  // 1) match intrinsic pixel buffer for accurate coordinates
  o.width = base.width;
  o.height = base.height;

  // 2) CSS sizing is handled by .overlay-canvas { inset:0 } inside .canvas-wrap
  // so no manual left/top needed.

  overlayCtx.value = o.getContext('2d');
  wireOverlayPointer();
  drawOverlay();
};


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
  if (!hasCrop.value) return;
  const base = pdfCanvas.value;
  const ctxScaleX = base.width / base.clientWidth;   // backing-store scale
  const ctxScaleY = base.height / base.clientHeight;

  // x,y,w,h from your selection **in CSS px** → convert to canvas px
  let x = Math.min(cropStart.x, cropEnd.x) * ctxScaleX;
  let y = Math.min(cropStart.y, cropEnd.y) * ctxScaleY;
  let w = rectWidth() * ctxScaleX;
  let h = rectHeight() * ctxScaleY;

  x = Math.max(0, Math.floor(x));
  y = Math.max(0, Math.floor(y));
  w = Math.max(1, Math.floor(w));
  h = Math.max(1, Math.floor(h));
  if (x + w > base.width) w = base.width - x;
  if (y + h > base.height) h = base.height - y;

  const tmp = document.createElement('canvas');
  // Optional: export at higher DPI (2x). Set to 1 for 1:1.
  const exportScale = window.devicePixelRatio || 1; // or just 2
  tmp.width = Math.floor(w * exportScale);
  tmp.height = Math.floor(h * exportScale);

  const tctx = tmp.getContext('2d', { willReadFrequently: true });
  // Avoid blurring when upscaling
  tctx.imageSmoothingEnabled = false;

  // Source rect (x,y,w,h) → Dest rect (0,0,w*scale,h*scale)
  tctx.drawImage(base, x, y, w, h, 0, 0, tmp.width, tmp.height);

  pdfCropDataUrl.value = tmp.toDataURL('image/png'); // lossless
};


const W_STRAIGHT = 3, W_DIAG = 4;


// === DROP-IN: compare using symmetric chamfer + small shift search ===
// DROP-IN compareNow using (1) best shift via Jaccard on dilated masks,
// then (2) Dice coefficient and (3) SSIM (global, overlapped region).
// Final score = max(Dice%, SSIM%) so identical images land ~100%.

const compareNow = async () => {
  try {
    if (!sigDataUrl.value || !pdfCropDataUrl.value) return;

    result.value = null;
    alignedAUrl.value = '';
    alignedBUrl.value = '';

    // 1) Load & normalize (your existing pipeline)
    const [imgA, imgB] = await Promise.all([
      loadImage(sigDataUrl.value),
      loadImage(pdfCropDataUrl.value),
    ]);
    const normA = normalizeForCompare(imgA, CANONICAL_H, CANONICAL_W);
    const normB = normalizeForCompare(imgB, CANONICAL_H, CANONICAL_W);

    alignedAUrl.value = normA.canvas.toDataURL('image/png');
    alignedBUrl.value = normB.canvas.toDataURL('image/png');

    const W = CANONICAL_W, H = CANONICAL_H;

    // 2) Tolerant masks (tiny dilation to absorb 1px stroke/scan jitter)
    const DILATE_RADIUS = 1;
    const A0 = normA.binary, B0 = normB.binary;
    const A = dilate(A0, W, H, DILATE_RADIUS);
    const B = dilate(B0, W, H, DILATE_RADIUS);

    // 3) Find best shift using Jaccard (fast + stable)
    const { bestDx, bestDy, bestIntersection, bestUnion } =
      bestShiftJaccard(A, B, W, H, MAX_SHIFT);

    // 4) Dice% from overlap stats at the chosen shift (on DILATED masks)
    //    Dice = 2*inter / (|A|+|B|). In overlapped window, |A|+|B| = union + inter
    const denomDice = bestUnion + bestIntersection;
    const dicePercent = denomDice > 0 ? (200 * bestIntersection) / denomDice : 0;

    // 5) SSIM% on normalized canvases at the chosen shift (global, overlapped region)
    const ssimPercent = (() => {
      const ctxA = normA.canvas.getContext('2d');
      const ctxB = normB.canvas.getContext('2d');
      if (!ctxA || !ctxB) return 0;
      const dataA = ctxA.getImageData(0, 0, W, H).data;
      const dataB = ctxB.getImageData(0, 0, W, H).data;
      const s = ssimAtShiftRGBA(dataA, dataB, W, H, bestDx, bestDy);
      return Math.max(0, Math.min(100, s * 100));
    })();

    // 6) Final score (industry-friendly): take the stronger of structure (SSIM) or region overlap (Dice)
    const finalMatch = Math.max(dicePercent, ssimPercent);

    result.value = {
      matchPercent: finalMatch,
      dx: bestDx,
      dy: bestDy,
      // extras for diagnostics
      dicePercent,
      ssimPercent,
      intersection: bestIntersection,
      union: bestUnion,
    };

    // 7) Diff preview with RAW masks (no dilation) at best shift
    await nextTick();
    const dCanvas = diffCanvas.value;
    if (!dCanvas) return;
    dCanvas.width = W; dCanvas.height = H;
    const diffImg = buildDiffImage(A0, B0, W, H, bestDx, bestDy);
    const ctx = dCanvas.getContext('2d');
    if (!ctx) return;
    ctx.putImageData(diffImg, 0, 0);
  } catch (err) {
    console.error('Compare failed:', err);
    result.value = null;
  }
};

// ---- helpers (add once) ----

// tiny dilation already provided earlier
function dilate(bin, W, H, radius = 1) {
  const out = new Uint8Array(bin.length);
  const r = Math.max(0, radius | 0);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let any = 0;
      for (let dy = -r; dy <= r && !any; dy++) {
        const yy = y + dy; if (yy < 0 || yy >= H) continue;
        for (let dx = -r; dx <= r; dx++) {
          const xx = x + dx; if (xx < 0 || xx >= W) continue;
          if (bin[yy * W + xx]) { any = 1; break; }
        }
      }
      out[y * W + x] = any;
    }
  }
  return out;
}

/**
 * SSIM on overlapped region at shift (dx,dy) using RGBA buffers (use R as grayscale).
 * Global SSIM (single window) with standard constants.
 * Returns [0..1].
 */
function ssimAtShiftRGBA(dataA, dataB, W, H, dx, dy) {
  // Overlap window
  const xStart = Math.max(0, dx), xEnd = Math.min(W, W + dx);
  const yStart = Math.max(0, dy), yEnd = Math.min(H, H + dy);
  const nW = xEnd - xStart, nH = yEnd - yStart;
  const N = nW * nH;
  if (N <= 0) return 0;

  // Accumulators
  let sumX = 0, sumY = 0, sumX2 = 0, sumY2 = 0, sumXY = 0;

  // iterate region; map (x,y) -> index in A and shifted in B
  for (let y = yStart; y < yEnd; y++) {
    let iA = (y * W + xStart) << 2;
    let iB = ((y - dy) * W + (xStart - dx)) << 2;
    for (let x = xStart; x < xEnd; x++, iA += 4, iB += 4) {
      // use red channel as grayscale (your normalized canvases are already gray/BW)
      const X = dataA[iA]; // 0..255
      const Y = dataB[iB];
      sumX += X; sumY += Y;
      sumX2 += X * X; sumY2 += Y * Y;
      sumXY += X * Y;
    }
  }

  const invN = 1 / N;
  const muX = sumX * invN;
  const muY = sumY * invN;
  const varX = sumX2 * invN - muX * muX;
  const varY = sumY2 * invN - muY * muY;
  const covXY = sumXY * invN - muX * muY;

  // SSIM constants
  const L = 255;
  const K1 = 0.01, K2 = 0.03;
  const C1 = (K1 * L) * (K1 * L);
  const C2 = (K2 * L) * (K2 * L);

  const num = (2 * muX * muY + C1) * (2 * covXY + C2);
  const den = (muX * muX + muY * muY + C1) * (varX + varY + C2);
  if (den <= 0) return 0;
  let ssim = num / den;
  if (!isFinite(ssim)) ssim = 0;
  // clamp
  if (ssim < 0) ssim = 0;
  if (ssim > 1) ssim = 1;
  return ssim;
}

// Build list of "ink" points (value==1)
function listPoints(bin, W, H) {
  const pts = [];
  for (let i = 0; i < bin.length; i++) {
    if (bin[i]) {
      const y = (i / W) | 0;
      const x = i - y * W;
      pts.push([x, y]);
    }
  }
  return pts;
}

// Average distance (chamfer units) of points shifted by (dx,dy) into distance map dm
function avgDistAt(dm, pts, W, H, dx, dy) {
  if (!pts.length) return Infinity;
  let sum = 0, n = 0;
  const PENALTY = 24; // units (~8 px) penalty when shifted out of bounds
  for (let k = 0; k < pts.length; k++) {
    const x = pts[k][0] + dx;
    const y = pts[k][1] + dy;
    if (x >= 0 && x < W && y >= 0 && y < H) {
      sum += dm[y * W + x];
    } else {
      sum += PENALTY;
    }
    n++;
  }
  return n ? (sum / n) : Infinity;
}

// 2-pass chamfer distance transform (3-4 mask). Returns "units".
function distanceTransformChamfer(bin, W, H) {
  const INF = 1e9;
  const d = new Uint32Array(W * H);

  // init: 0 on ink, INF elsewhere
  for (let i = 0; i < d.length; i++) d[i] = bin[i] ? 0 : INF;

  // forward pass
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      let v = d[i];
      if (v === 0) continue;
      // left, up-left, up, up-right
      if (x > 0) v = Math.min(v, d[i - 1] + W_STRAIGHT);
      if (x > 0 && y > 0) v = Math.min(v, d[i - 1 - W] + W_DIAG);
      if (y > 0) v = Math.min(v, d[i - W] + W_STRAIGHT);
      if (x + 1 < W && y > 0) v = Math.min(v, d[i + 1 - W] + W_DIAG);
      d[i] = v;
    }
  }

  // backward pass
  for (let y = H - 1; y >= 0; y--) {
    for (let x = W - 1; x >= 0; x--) {
      const i = y * W + x;
      let v = d[i];
      if (x + 1 < W) v = Math.min(v, d[i + 1] + W_STRAIGHT);
      if (x + 1 < W && y + 1 < H) v = Math.min(v, d[i + 1 + W] + W_DIAG);
      if (y + 1 < H) v = Math.min(v, d[i + W] + W_STRAIGHT);
      if (x > 0 && y + 1 < H) v = Math.min(v, d[i - 1 + W] + W_DIAG);
      d[i] = v;
    }
  }
  return d;
}

const applyZoomFromUi = async () => {
  if (!pdfDoc) return;
  const newScale = Math.max(0.5, Math.min(2, zoomUi.value / 100)); // 50%..200%
  if (Math.abs(newScale - scale.value) < 0.001) return;
  scale.value = newScale;
  await renderPage(1);
};


const fitToWidth = async () => {
  // ensure DOM layout is settled
  await nextTick();

  const base = pdfCanvas.value;
  if (!pdfDoc || !base) return;

  const page = await pdfDoc.getPage(1);
  const viewport = page.getViewport({ scale: 1 });

  // measure the *wrap* that actually constrains the canvas width
  const wrapEl = canvasWrap.value || base.parentElement;
  const { width: wrapW } = innerSize(wrapEl);

  if (!wrapW || !viewport.width) return;

  // convert to % and clamp to slider bounds
  zoomUi.value = Math.max(50, Math.min(200, Math.round((wrapW / viewport.width) * 100)));
  await applyZoomFromUi();
};

const fitToHeight = async () => {
  // ensure DOM layout is settled
  await nextTick();

  const base = pdfCanvas.value;
  if (!pdfDoc || !base) return;

  const page = await pdfDoc.getPage(1);
  const viewport = page.getViewport({ scale: 1 });

  // the height constraint is the scrollable stage (has max-height + padding)
  const stageEl = pdfStage.value || base.closest('.pdf-stage');
  const { height: stageH } = innerSize(stageEl);

  if (!stageH || !viewport.height) return;

  // convert to % and clamp
  zoomUi.value = Math.max(50, Math.min(150, Math.round((stageH / viewport.height) * 100)));
  await applyZoomFromUi();
};



// ---------- helpers ----------
function loadImage(src) {
  return new Promise((resolve, reject) => {
    if (!src) return reject(new Error('Empty image src'))
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function normalizeForCompare(img, targetH, canvasW, opts = {}) {
  const {
    blurPx = (typeof BLUR_PX === 'number' ? BLUR_PX : 0),
    pad = 2,
    finalThreshold = 160,      // tweak 140–180 for best edges
    thresholdModeForBBox = thresholdMode || 'fixed'
  } = opts;

  // 1) Determine source pixel size correctly (natural pixels, not CSS)
  const isCanvas = img instanceof HTMLCanvasElement;
  const srcW = isCanvas ? img.width : (img.naturalWidth || img.videoWidth || img.width || 1);
  const srcH = isCanvas ? img.height : (img.naturalHeight || img.videoHeight || img.height || 1);

  const src = document.createElement('canvas');
  src.width = Math.max(1, srcW);
  src.height = Math.max(1, srcH);
  const sctx = src.getContext('2d', { willReadFrequently: true });
  sctx.drawImage(img, 0, 0, src.width, src.height);

  // 2) Prepare grayscale for processing
  let idOrig = sctx.getImageData(0, 0, src.width, src.height);
  let gray = grayscale(idOrig);
  if (blurPx > 0) gray = boxBlur(gray, src.width, src.height, blurPx);

  // 3) Use BW ONLY to detect content bbox (don’t scale from BW!)
  let bw = thresholdToBW(gray, thresholdModeForBBox);
  let bbox = contentBBox(bw, src.width, src.height);
  if (!bbox) {
    invertImage(bw);
    bbox = contentBBox(bw, src.width, src.height);
    if (!bbox) {
      const blank = document.createElement('canvas');
      blank.width = canvasW; blank.height = targetH;
      return { canvas: blank, binary: new Uint8Array(canvasW * targetH) };
    }
  }

  // Optional padding around bbox
  bbox.x = Math.max(0, bbox.x - pad);
  bbox.y = Math.max(0, bbox.y - pad);
  bbox.w = Math.min(src.width - bbox.x, bbox.w + pad * 2);
  bbox.h = Math.min(src.height - bbox.y, bbox.h + pad * 2);

  // 4) Crop from the ORIGINAL GRAYSCALE data
  const trimmed = cropImageDataToCanvas(gray, src.width, src.height, bbox);

  // 5) Scale with high-quality resampling
  const r = Math.min(targetH / trimmed.height, canvasW / trimmed.width);
  const scaledW = Math.max(1, Math.round(trimmed.width * r));
  const scaledH = Math.max(1, Math.round(trimmed.height * r));

  const scaled = document.createElement('canvas');
  scaled.width = scaledW; scaled.height = scaledH;
  const scx = scaled.getContext('2d');
  scx.imageSmoothingEnabled = true;
  scx.imageSmoothingQuality = 'high';
  scx.drawImage(trimmed, 0, 0, scaledW, scaledH); // grayscale -> smooth edges

  // 6) Center on the output canvas
  const out = document.createElement('canvas');
  out.width = canvasW; out.height = targetH;
  const octx = out.getContext('2d');
  octx.fillStyle = '#ffffff';
  octx.fillRect(0, 0, out.width, out.height);
  const ox = Math.floor((canvasW - scaledW) / 2);
  const oy = Math.floor((targetH - scaledH) / 2);
  octx.drawImage(scaled, ox, oy);

  // 7) Single final threshold to produce the binary for comparison
  let outId = octx.getImageData(0, 0, out.width, out.height);
  outId = thresholdToBW(grayscale(outId), 'fixed', finalThreshold);
  octx.putImageData(outId, 0, 0);

  // Binary (1=black, 0=white)
  const bin = new Uint8Array(out.width * out.height);
  for (let i = 0, p = 0; i < outId.data.length; i += 4, p++) {
    bin[p] = outId.data[i] === 0 ? 1 : 0;
  }
  return { canvas: out, binary: bin };
}


function grayscale(img) {
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    const y = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2])
    d[i] = d[i + 1] = d[i + 2] = y
  }
  return img
}
function thresholdToBW(img, mode = 'adaptive', fixedT = 180) {
  const d = img.data
  let T = fixedT
  if (mode === 'adaptive') {
    let sum = 0
    for (let i = 0; i < d.length; i += 4) sum += d[i]
    T = Math.round(sum / (d.length / 4))
  }
  for (let i = 0; i < d.length; i += 4) {
    const v = d[i] > T ? 255 : 0
    d[i] = d[i + 1] = d[i + 2] = v
    d[i + 3] = 255
  }
  return img
}
function invertImage(img) {
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    d[i] = 255 - d[i]
    d[i + 1] = 255 - d[i + 1]
    d[i + 2] = 255 - d[i + 2]
  }
}
function contentBBox(img, w, h) {
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
function cropImageDataToCanvas(img, w, h, box) {
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
function boxBlur(img, w, h, r) {
  const src = img.data, out = new Uint8ClampedArray(src.length), tmp = new Uint8ClampedArray(src.length), ch = 4
  for (let y = 0; y < h; y++) {
    let acc = 0
    for (let k = -r; k <= r; k++) acc += src[(y * w + clamp(k, 0, w - 1)) * ch]
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * ch
      tmp[i] = tmp[i + 1] = tmp[i + 2] = Math.round(acc / (2 * r + 1))
      tmp[i + 3] = 255
      const xOut = x - r, xIn = x + r + 1
      acc += src[(y * w + clamp(xIn, 0, w - 1)) * ch]
      acc -= src[(y * w + clamp(xOut, 0, w - 1)) * ch]
    }
  }
  for (let x = 0; x < w; x++) {
    let acc = 0
    for (let k = -r; k <= r; k++) acc += tmp[(clamp(k, 0, h - 1) * w + x) * ch]
    for (let y = 0; y < h; y++) {
      const i = (y * w + x) * ch
      const v = Math.round(acc / (2 * r + 1))
      out[i] = out[i + 1] = out[i + 2] = v
      out[i + 3] = 255
      const yOut = y - r, yIn = y + r + 1
      acc += tmp[(clamp(yIn, 0, h - 1) * w + x) * ch]
      acc -= tmp[(clamp(yOut, 0, h - 1) * w + x) * ch]
    }
  }
  return new ImageData(out, w, h)
}
function bestShiftJaccard(A, B, W, H, R) {
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
function buildDiffImage(A, B, W, H, dx, dy) {
  const out = new Uint8ClampedArray(W * H * 4)
  for (let i = 0; i < out.length; i += 4) { out[i] = 230; out[i + 1] = 230; out[i + 2] = 230; out[i + 3] = 255 }
  const xStart = Math.max(0, dx), xEnd = Math.min(W, W + dx)
  const yStart = Math.max(0, dy), yEnd = Math.min(H, H + dy)
  for (let y = yStart; y < yEnd; y++) {
    let iA = y * W + xStart, iB = (y - dy) * W + (xStart - dx)
    for (let x = xStart; x < xEnd; x++, iA++, iB++) {
      const a = A[iA], b = B[iB], o = (y * W + x) * 4
      if (a && b) { out[o] = 0; out[o + 1] = 180; out[o + 2] = 0 }
      else if (a) { out[o] = 220; out[o + 1] = 0; out[o + 2] = 0 }
      else if (b) { out[o] = 0; out[o + 1] = 90; out[o + 2] = 255 }
    }
  }
  return new ImageData(out, W, H)
}
function canvasCoords(canvas, ev) {
  const rect = canvas.getBoundingClientRect()
  const x = (ev.clientX - rect.left) * (canvas.width / rect.width)
  const y = (ev.clientY - rect.top) * (canvas.height / rect.height)
  return { x: Math.round(x), y: Math.round(y) }
}
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)) }

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

.min-h-28 {
  min-height: 7rem;
}

.section-card {
  border: 1px solid #e9ecef;
  border-radius: 1rem;
}

/* Signature card */
.sig-card {
  border: 1px solid #e9ecef;
  border-radius: .75rem;
  background: #fff;
  transition: box-shadow .15s ease, border-color .15s ease, background .15s ease;
  user-select: none;
}

.sig-card:hover {
  box-shadow: 0 .25rem .75rem rgba(0, 0, 0, .05);
}

.sig-card.active {
  border-color: #6366f1;
  /* indigo-ish */
  background: rgba(99, 102, 241, .06);
  box-shadow: 0 0 0 .2rem rgba(99, 102, 241, .15);
}

.sig-thumb {
  height: 44px;
  width: auto;
  object-fit: contain;
  background: #fff;
  border: 1px solid #e9ecef;
  border-radius: .375rem;
}

/* PDF stage max height */
.pdf-stage {
  max-height: 70vh;
}

/* Min preview height */
.min-h-180 {
  min-height: 180px;
}

.canvas-wrap {
  line-height: 0;
}

/* removes stray inline-gap */
.overlay-canvas {
  position: absolute;
  inset: 0;
  /* top:0; right:0; bottom:0; left:0 */
  margin: 0;
  pointer-events: auto;
  touch-action: none;
  z-index: 10;
  cursor: crosshair;
}


/* Checkerboard background */
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
