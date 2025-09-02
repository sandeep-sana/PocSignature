<template>
    <div class="modal-backdrop" v-if="show">
        <div class="modal">
            <div class="modal-header">
                <h2>Add Signature</h2>
                <button class="close-btn" @click="close()">✕</button>
            </div>
            <form @submit="save">
                <div class="form-grid">
                    <Field name="empId" type="text" placeholder="Employee Id" class="form-input"
                        :class="{ error: errors.empId }" />
                    <ErrorMessage name="empId" class="error-message" />
                    <Field name="name" type="text" placeholder="name" class="form-input"
                        :class="{ error: errors.name }" />
                    <ErrorMessage name="name" class="error-message" />
                    <Field name="dept" type="text" placeholder="dept" class="form-input"
                        :class="{ error: errors.dept }" />
                    <ErrorMessage name="dept" class="error-message" />
                    <Field name="email" type="text" placeholder="email" class="form-input"
                        :class="{ error: errors.email }" />
                    <ErrorMessage name="email" class="error-message" />
                    <label for="consent">I consent to store my specimen signature</label>
                    <Field name="consent" type="checkbox" placeholder="consent" class="form-input"
                        :class="{ error: errors.consent }" value="true" />
                    <ErrorMessage name="consent" class="error-message" />
                </div>

                <div class="mode-switch">
                    <button type="button" :class="['tab', mode === 'draw' && 'active']"
                        @click="mode = 'draw'">Draw</button>
                    <button type="button" :class="['tab', mode === 'upload' && 'active']"
                        @click="mode = 'upload'">Upload</button>
                </div>

                <ClientOnly v-if="mode === 'draw'">
                    <div class="signature-section">
                        <p>Draw Signature:</p>
                        <div class="sig-wrap">
                            <canvas ref="canvas" class="sig-canvas"></canvas>
                        </div>
                        <div class="sig-actions">
                            <button type="button" @click="clear">Clear</button>
                        </div>
                    </div>
                </ClientOnly>

                <div v-else class="signature-section">
                    <p>Upload Signature (PNG/JPEG):</p>
                    <input type="file" accept="image/*" @change="onSignatureFile" />
                    <div v-if="signaturePreview" class="preview">
                        <img :src="signaturePreview" alt="Signature preview" />
                    </div>
                </div>

                <div class="signature-section">
                    <p>Upload Photo (optional):</p>
                    <input type="file" @change="onPhoto" accept="image/*" />
                    <div v-if="photoPreview" class="preview">
                        <img :src="photoPreview" alt="Photo preview" />
                    </div>
                </div>

                <div v-if="versions.length" class="versions">
                    <h3>Saved Versions</h3>
                    <ul>
                        <li v-for="(v, i) in versions" :key="i">
                            Version {{ v.version }} — {{ v.timestamp }}
                        </li>
                    </ul>
                </div>

                <div class="actions">
                    <button type="submit" class="primary">Save</button>
                    <button type="button" @click="close()" class="secondary">Cancel</button>
                </div>
            </form>
        </div>
    </div>
</template>

<script setup>
import * as yup from "yup";
import SignaturePad from 'signature_pad';
import VEE_VALIDATION_MESSAGE from '../validation-message';
import { Field, ErrorMessage, useForm } from "vee-validate";
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';

const props = defineProps({ show: Boolean })
const emit = defineEmits(['close', 'saved'])

const { handleSubmit, errors } = useForm({
    validationSchema: yup.object({
        empId: yup
            .string()
            .trim()
            .required(VEE_VALIDATION_MESSAGE.EMPLOYEE_ID_REQUIRED)
            .max(50, VEE_VALIDATION_MESSAGE.EMPLOYEE_ID_MAX_50),
        name: yup
            .string()
            .trim()
            .required(VEE_VALIDATION_MESSAGE.NAME_REQUIRED)
            .max(50, VEE_VALIDATION_MESSAGE.NAME_MAX_50),

        email: yup
            .string()
            .trim()
            .required(VEE_VALIDATION_MESSAGE.EMAIL_REQUIRED)
            .email(VEE_VALIDATION_MESSAGE.EMAIL_INVALID)
            .max(100, VEE_VALIDATION_MESSAGE.EMAIL_MAX_100),

        dept: yup
            .string()
            .required(VEE_VALIDATION_MESSAGE.DEPT_REQUIRED),

        consent: yup
            .string()
            .required(VEE_VALIDATION_MESSAGE.CONSENT_REQUIRED),
    }),
    initialValues: {
        empId: '',
        name: '',
        dept: '',
        email: '',
        consent: '',
    },
});


const save = handleSubmit (async (values) => {

})


/* ---------- Modes: draw or upload ---------- */
const mode = ref('draw') // 'draw' | 'upload'

/* ---------- Signature Pad ---------- */
const canvas = ref(null)
let pad = null

function setupCanvas() {
    if (!canvas.value) return
    const c = canvas.value
    // Use CSS size as layout size
    const rect = c.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    c.width = Math.max(1, Math.floor(rect.width * dpr))
    c.height = Math.max(1, Math.floor(rect.height * dpr))
    const ctx = c.getContext('2d')
    ctx.scale(dpr, dpr)
    // (Re)init pad
    pad = new SignaturePad(c, { minWidth: 0.7, maxWidth: 2.2, backgroundColor: '#fff' })
}

function clear() {
    pad?.clear()
}

function handleResize() {
    // keep drawn content? For simplicity, clear on resize
    const data = pad && !pad.isEmpty() ? pad.toDataURL('image/png') : null
    setupCanvas()
    if (data && pad) {
        // redraw saved image
        const img = new Image()
        img.onload = () => {
            const ctx = canvas.value.getContext('2d')
            ctx.drawImage(img, 0, 0, canvas.value.width / (window.devicePixelRatio || 1), canvas.value.height / (window.devicePixelRatio || 1))
        }
        img.src = data
    }
}

onMounted(async () => {
    if (mode.value === 'draw' && props.show) {
        await nextTick()
        setupCanvas()
        window.addEventListener('resize', handleResize)
    }
})
onBeforeUnmount(() => {
    window.removeEventListener('resize', handleResize)
})

// Re-init when modal opens or when switching to draw mode
watch(() => props.show, async (v) => {
    if (v && mode.value === 'draw') {
        await nextTick()
        setupCanvas()
    }
})
watch(mode, async (m) => {
    if (props.show && m === 'draw') {
        await nextTick()
        setupCanvas()
    }
})

/* ---------- Uploads & previews ---------- */
const signatureFile = ref(null)
const signaturePreview = ref(null)
function onSignatureFile(e) {
    const f = e.target.files?.[0]
    signatureFile.value = f || null
    signaturePreview.value = f ? URL.createObjectURL(f) : null
}

const photoFile = ref(null)
const photoPreview = ref(null)
function onPhoto(e) {
    const f = e.target.files?.[0]
    photoFile.value = f || null
    photoPreview.value = f ? URL.createObjectURL(f) : null
}

/* ---------- Save ---------- */
const versions = ref([])

function close() {
    emit('close')
}

// async function save() {
//     let signatureDataUrl = null

//     if (mode.value === 'draw') {
//         if (!pad || pad.isEmpty()) {
//             alert('Please draw a signature before saving.')
//             return
//         }
//         signatureDataUrl = pad.toDataURL('image/png')
//     } else {
//         if (!signatureFile.value) {
//             alert('Please choose a signature image file.')
//             return
//         }
//         // Convert file to dataURL
//         signatureDataUrl = await fileToDataURL(signatureFile.value)
//     }

//     // Fake save: push version
//     versions.value.push({
//         version: versions.value.length + 1,
//         timestamp: new Date().toLocaleString()
//     })

//     // Emit saved payload to parent (you can post to your API here)
//     emit('saved', {
//         ...form.value,
//         signatureDataUrl,
//         photoFile: photoFile.value || null
//     })

//     alert('Signature saved!')
//     close()
// }

function fileToDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(file)
    })
}
</script>

<style scoped>
.modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    display: grid;
    place-items: center;
    z-index: 50;
}

.modal {
    background: #fff;
    width: 640px;
    max-width: 95%;
    border-radius: 8px;
    overflow: hidden;
    padding: 1.25rem 1.5rem 1.5rem;
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: .75rem;
}

.close-btn {
    background: transparent;
    border: none;
    font-size: 1.2rem;
    cursor: pointer;
}

.form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: .75rem;
}

.form-grid label {
    display: flex;
    flex-direction: column;
    font-size: 0.9rem;
}

.consent {
    grid-column: span 2;
}

.mode-switch {
    display: flex;
    gap: 6px;
    margin-top: 1rem;
}

.tab {
    border: 1px solid #e5e7eb;
    background: #f8fafc;
    padding: .375rem .75rem;
    border-radius: 6px;
    cursor: pointer;
}

.tab.active {
    background: #e0f7ec;
    border-color: #22c55e;
}

.signature-section {
    margin-top: 1rem;
}

.sig-wrap {
    width: 100%;
    height: 160px;
}

.sig-canvas {
    width: 100%;
    height: 100%;
    border: 1px solid #cbd5e1;
    border-radius: 4px;
    display: block;
    background: #fff;
    touch-action: none;
    /* allow drawing on touch */
}

.sig-actions {
    margin-top: 0.5rem;
}

.preview {
    margin-top: .5rem;
}

.preview img {
    max-height: 160px;
    border: 1px solid #cbd5e1;
    border-radius: 4px;
}

.versions {
    margin-top: 1rem;
}

.versions ul {
    list-style: none;
    padding: 0;
    margin: 0;
}

.versions li {
    font-size: 0.85rem;
    padding: 0.25rem 0;
}

.actions {
    margin-top: 1.25rem;
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
}

.primary {
    background: #22c55e;
    border: none;
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
}

.secondary {
    background: #e5e7eb;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
}
</style>
