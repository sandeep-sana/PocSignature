<!-- components/StampPdf.client.vue -->
<template>
  <div class="space-y-3">
    <div>
      <label class="block text-sm font-medium">Select PDF</label>
      <input type="file" accept="application/pdf" @change="onPdfFile" />
    </div>

    <div>
      <label class="block text-sm font-medium">Signature (base64 data URL)</label>
      <textarea v-model="sigDataUrl" rows="3" class="w-full border p-2" placeholder="data:image/png;base64,iVBORw0K..."></textarea>
      <p class="text-xs opacity-70 mt-1">Tip: pass your existing base64 variable here.</p>
    </div>

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

    <div class="flex items-center gap-2">
      <button :disabled="!pdfBytes || !sigDataUrl" @click="stampAndPreview" class="border px-3 py-2 rounded">
        Stamp & Preview
      </button>
      <a v-if="previewUrl" :href="previewUrl" download="signed.pdf" class="border px-3 py-2 rounded">
        Download Stamped PDF
      </a>
    </div>

    <div v-if="previewUrl" class="border rounded overflow-hidden" style="height: 75vh;">
      <!-- Quick preview in an iframe -->
      <iframe :src="previewUrl" class="w-full h-full"></iframe>
    </div>
  </div>
</template>

<script setup>
// Vue 3, <script setup>
import { ref } from 'vue'
import { PDFDocument } from 'pdf-lib'

// Defaults from your request (points; origin is bottom-left)
const coords = ref({ x: 420, y: 120, w: 120, h: 40 })

const pdfBytes = ref(null)       // ArrayBuffer of the uploaded PDF
const sigDataUrl = ref('')       // base64 data URL of the signature image
const previewUrl = ref(null)     // object URL of stamped PDF for preview/download

function onPdfFile(e) {
  const f = e.target.files?.[0]
  if (!f) { pdfBytes.value = null; return }
  const reader = new FileReader()
  reader.onload = () => { pdfBytes.value = reader.result }
  reader.readAsArrayBuffer(f)
}

function dataUrlToUint8(dataUrl) {
  const base64 = dataUrl.split(',')[1] || ''
  const binary = atob(base64)
  const len = binary.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

async function stampAndPreview() {
  if (!pdfBytes.value || !sigDataUrl.value) return

  // 1) Load PDF
  const pdfDoc = await PDFDocument.load(pdfBytes.value)

  // 2) Embed signature image
  const sigBytes = dataUrlToUint8(sigDataUrl.value)
  // detect mime
  const isPng = sigDataUrl.value.startsWith('data:image/png')
  const image = isPng ? await pdfDoc.embedPng(sigBytes) : await pdfDoc.embedJpg(sigBytes)

  // 3) Last page
  const pages = pdfDoc.getPages()
  const lastPage = pages[pages.length - 1]

  // 4) Draw the image at given coordinates (points)
  lastPage.drawImage(image, {
    x: coords.value.x,
    y: coords.value.y,
    width: coords.value.w,
    height: coords.value.h,
  })

  // 5) Save as bytes and preview
  const outBytes = await pdfDoc.save()
  const blob = new Blob([outBytes], { type: 'application/pdf' })
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = URL.createObjectURL(blob)
}
</script>
