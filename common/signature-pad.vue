<template>
  <div class="sig-wrap">
    <canvas ref="canvas" class="sig-canvas"></canvas>

    <div class="controls">
      <button @click="clear">Clear</button>
      <button @click="undo">Undo</button>
      <button @click="savePng">OK</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

/* v-model:signature */
const props = defineProps({ signature: String })
const emit  = defineEmits(['update:signature','saved'])

let SignaturePadCtor = null
let pad = null

/* local canvas ref (no need to pass in via props) */
const canvas = ref(null)

function resizeCanvas () {
  if (!canvas.value) return
  const ratio  = Math.max(window.devicePixelRatio || 1, 1)
  const parent = canvas.value.parentElement
  const width  = parent.clientWidth
  const height = Math.max(180, Math.round(width * 0.35))

  canvas.value.width  = Math.floor(width * ratio)
  canvas.value.height = Math.floor(height * ratio)
  canvas.value.style.width  = width + 'px'
  canvas.value.style.height = height + 'px'

  const ctx = canvas.value.getContext('2d')
  ctx.setTransform(1,0,0,1,0,0) // reset before scaling to avoid compounding
  ctx.scale(ratio, ratio)
}

function emitPNG () {
  if (!pad) return
  const dataUrl = pad.isEmpty() ? '' : pad.toDataURL('image/png')
  emit('update:signature', dataUrl)         // <-- sends PNG back to parent
}

function clear () {
  pad && pad.clear()
  emit('update:signature', '')
}

function undo () {
  if (!pad) return
  const data = pad.toData()
  if (data.length) {
    data.pop()
    pad.fromData(data)
  }
  emitPNG()
}

function savePng () {
  if (!pad || pad.isEmpty()) return alert('Please provide a signature first.')
  const dataUrl = pad.toDataURL('image/png')
  emit('update:signature', dataUrl)         // keep parent in sync
  emit('saved', { type: 'png', dataUrl })   // optional event
//   download(dataUrl, 'signature.png')
}

function saveSvg () {
  if (!pad || pad.isEmpty()) return alert('Please provide a signature first.')
  const dataUrl = pad.toDataURL('image/svg+xml')
  emit('saved', { type: 'svg', dataUrl })
  download(dataUrl, 'signature.svg')
}

function download (dataUrl, filename) {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
}

function initPad () {
  if (!canvas.value || !SignaturePadCtor) return
  pad = new SignaturePadCtor(canvas.value, {
    minWidth: 0.5,
    maxWidth: 2.5,
    throttle: 16,
    backgroundColor: 'rgba(255,255,255,1)',
    penColor: '#111'
  })
  // whenever the user finishes a stroke, push PNG to parent
  pad.onEnd = emitPNG

  // if parent passed an initial signature, draw it
  if (props.signature) {
    const img = new Image()
    img.onload = () => {
      const dpr = Math.max(window.devicePixelRatio || 1, 1)
      const ctx = canvas.value.getContext('2d')
      ctx.drawImage(img, 0, 0, canvas.value.width / dpr, canvas.value.height / dpr)
    }
    img.src = props.signature
  }
}

function onResize () {
  const data = pad && !pad.isEmpty() ? pad.toDataURL('image/png') : null
  resizeCanvas()
  if (data && pad) {
    const img = new Image()
    img.onload = () => {
      const dpr = Math.max(window.devicePixelRatio || 1, 1)
      const ctx = canvas.value.getContext('2d')
      ctx.drawImage(img, 0, 0, canvas.value.width / dpr, canvas.value.height / dpr)
      emit('update:signature', pad.toDataURL('image/png'))
    }
    img.src = data
  }
}

onMounted(async () => {
  const mod = await import('signature_pad') // SSR-safe dynamic import
  SignaturePadCtor = mod.default
  resizeCanvas()
  initPad()
  window.addEventListener('resize', onResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
})

// expose helper to parent (optional)
defineExpose({
  getPng: () => (pad && !pad.isEmpty() ? pad.toDataURL('image/png') : '')
})
</script>

<style scoped>
.sig-wrap { width: 100%; max-width: 720px; margin: 12px auto; }
.sig-canvas { width: 100%; height: 220px; border: 1px dashed #bbb; border-radius: 8px; background: #fff; touch-action: none; }
.controls { margin-top: 10px; display: flex; gap: 8px; flex-wrap: wrap; }
.controls button { padding: 8px 12px; border-radius: 6px; border: 1px solid #ddd; background: #f9f9f9; cursor: pointer; }
.controls button:hover { background: #f0f0f0; }
</style>
