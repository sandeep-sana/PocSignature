<!-- components/AddSignatureModal.vue -->
<template>
    <div class="sig-backdrop" aria-modal="true" role="dialog" aria-labelledby="sigModalTitle">
        <div class="sig-modal card shadow-lg">
            <!-- Header -->
            <div class="card-header d-flex align-items-center justify-content-between bg-white">
                <h2 id="sigModalTitle" class="h5 mb-0">Add Signature</h2>
                <button type="button" class="btn-close" aria-label="Close" @click="close()"></button>
            </div>

            <!-- Body -->
            <div class="card-body">
                <form @submit="save" novalidate>
                    <!-- Basic Details -->
                    <div class="container-fluid px-0">
                        <div class="row g-3">
                            <div class="col-md-6">
                                <label class="form-label" for="empId">Employee ID</label>
                                <Field id="empId" name="empId" type="text" placeholder="Employee ID"
                                    class="form-control" :class="{ 'is-invalid': errors.empId }" />
                                <ErrorMessage name="empId" class="invalid-feedback d-block" />
                            </div>

                            <div class="col-md-6">
                                <label class="form-label" for="name">Name</label>
                                <Field id="name" name="name" type="text" placeholder="Full name" class="form-control"
                                    :class="{ 'is-invalid': errors.name }" />
                                <ErrorMessage name="name" class="invalid-feedback d-block" />
                            </div>

                            <div class="col-md-6">
                                <label class="form-label" for="dept">Department / Site</label>
                                <Field id="dept" name="dept" type="text" placeholder="e.g. Finance / Chennai"
                                    class="form-control" :class="{ 'is-invalid': errors.dept }" />
                                <ErrorMessage name="dept" class="invalid-feedback d-block" />
                            </div>

                            <div class="col-md-6">
                                <label class="form-label" for="email">Email</label>
                                <Field id="email" name="email" type="email" placeholder="name@company.com"
                                    class="form-control" :class="{ 'is-invalid': errors.email }" autocomplete="email" />
                                <ErrorMessage name="email" class="invalid-feedback d-block" />
                            </div>

                            <div class="col-12">
                                <div class="form-check">
                                    <Field id="consent" name="consent" type="checkbox" class="form-check-input"
                                        :class="{ 'is-invalid': errors.consent }" value="true" />
                                    <label for="consent" class="form-check-label">
                                        I consent to store my specimen signature
                                    </label>
                                </div>
                                <ErrorMessage name="consent" class="invalid-feedback d-block" />
                            </div>
                        </div>
                    </div>

                    <!-- Mode Switch -->
                    <div class="d-flex flex-wrap align-items-center gap-2 my-4">
                        <div class="btn-group sig-segment" role="group" aria-label="Signature mode switch">
                            <button type="button" class="btn"
                                :class="mode === 'draw' ? 'btn-primary' : 'btn-outline-primary'" @click="mode = 'draw'">
                                Draw
                            </button>
                            <button type="button" class="btn"
                                :class="mode === 'upload' ? 'btn-primary' : 'btn-outline-primary'"
                                @click="mode = 'upload'">
                                Upload
                            </button>
                        </div>
                        <small class="text-muted">Choose how you want to provide your signature</small>
                    </div>

                    <!-- Draw Mode -->
                    <ClientOnly v-if="mode === 'draw'">
                        <ErrorMessage name="signature" class="error-message" />
                        <SignaturePad :canvas="values.signature" @saved="signature" />
                    </ClientOnly>

                    <!-- Upload Mode -->
                    <div v-else class="sig-section">
                        <label class="form-label mb-2">Upload Signature (PNG/JPEG)</label>

                        <div class="input-group">
                            <input type="file" class="form-control" accept="image/*" @change="onSignatureFile"
                                aria-label="Upload signature image" />
                        </div>

                        <div v-if="signaturePreview" class="sig-preview mt-3">
                            <div class="card sig-preview-card">
                                <div class="card-body d-flex align-items-center justify-content-center p-2">
                                    <img :src="signaturePreview" alt="Signature preview" class="img-fluid" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div v-for="s in values.signatures">
                        {{ s.createdAt }}
                        <img :src="s.signature" alt="">
                    </div>

                    <!-- Versions -->
                    <div v-if="versions.length" class="mt-4">
                        <h3 class="h6 mb-2">Saved Versions</h3>
                        <ul class="list-group small">
                            <li v-for="(v, i) in versions" :key="i"
                                class="list-group-item d-flex justify-content-between">
                                <span>Version {{ v.version }}</span>
                                <span class="text-muted">{{ v.timestamp }}</span>
                            </li>
                        </ul>
                    </div>

                    <!-- Actions -->
                    <div class="d-flex justify-content-end gap-2 mt-4">
                        <button type="submit" class="btn btn-success px-4">
                            Save
                        </button>
                        <button type="button" class="btn btn-outline-secondary" @click="close()">
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
            <!-- /Body -->
        </div>
    </div>
</template>

<script setup>
import * as yup from "yup";
import VEE_VALIDATION_MESSAGE from '../validation-message';
import { Field, ErrorMessage, useForm } from "vee-validate";
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import SignaturePad from "../common/signature-pad.vue";
import api from "../api.config";
import CONFIG from "../config";

const props = defineProps({ _id: String });
const emit = defineEmits(["close", "saved"]);

const { handleSubmit, errors, values, setValues } = useForm({
    validationSchema: yup.object({
        empId: yup.string().trim().required(VEE_VALIDATION_MESSAGE.EMPLOYEE_ID_REQUIRED).max(50, VEE_VALIDATION_MESSAGE.EMPLOYEE_ID_MAX_50),
        name: yup.string().trim().required(VEE_VALIDATION_MESSAGE.NAME_REQUIRED).max(50, VEE_VALIDATION_MESSAGE.NAME_MAX_50),
        email: yup.string().trim().required(VEE_VALIDATION_MESSAGE.EMAIL_REQUIRED).email(VEE_VALIDATION_MESSAGE.EMAIL_INVALID).max(100, VEE_VALIDATION_MESSAGE.EMAIL_MAX_100),
        dept: yup.string().required(VEE_VALIDATION_MESSAGE.DEPT_REQUIRED),
        consent: yup.string().required(VEE_VALIDATION_MESSAGE.CONSENT_REQUIRED),
        signature: yup.mixed().required(VEE_VALIDATION_MESSAGE.SIGNATURE_REQUIRED),
    }),
    initialValues: {
        empId: '',
        name: '',
        dept: '',
        email: '',
        consent: '',
        signature: '', // will hold base64 (data URL) string
    },
});

const save = handleSubmit(async (values) => {
    delete values.signatures;
    const response = await api.post(`${CONFIG.API}/api/employee/employee`, { ...values });
    console.log('response', response);
    close();

})

const signature = (signature) => {
    // called by your SignaturePad component (already base64 data URL)
    setValues({
        ...values,
        signature: signature.dataUrl,
    })
}

/* ---------- Modes: draw or upload ---------- */
const mode = ref("draw"); // 'draw' | 'upload'

/* ---------- Signature Pad ---------- */
const canvas = ref(null);
let pad = null;

function setupCanvas() {
    if (!canvas.value) return
    const c = canvas.value
    const rect = c.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    c.width = Math.max(1, Math.floor(rect.width * dpr))
    c.height = Math.max(1, Math.floor(rect.height * dpr))
    const ctx = c.getContext('2d')
    ctx.scale(dpr, dpr)
    pad = new SignaturePad(c, { minWidth: 0.7, maxWidth: 2.2, backgroundColor: '#fff' })
}

function clear() {
    pad?.clear();
}

function handleResize() {
    const data = pad && !pad.isEmpty() ? pad.toDataURL('image/png') : null
    setupCanvas()
    if (data && pad) {
        const img = new Image()
        img.onload = () => {
            const ctx = canvas.value.getContext('2d')
            ctx.drawImage(
                img,
                0,
                0,
                canvas.value.width / (window.devicePixelRatio || 1),
                canvas.value.height / (window.devicePixelRatio || 1)
            )
        }
        img.src = data
    }
}

const fetchEmployee = async () => {
    try {
        const response = await api.get(`${CONFIG.API}/api/employee/employeeId`, {
            params: {
                _id: props._id,
            }
        });
        console.log(response)

        setValues({
            ...values,
            ...response.data.data,

        })

    } catch (error) {
        console.log(error);
    }
}
onMounted(async () => {
    if (mode.value === "draw") {
        await nextTick();
        setupCanvas();
        window.addEventListener("resize", handleResize);
    }
    console.log(props._id)
    if (props._id) {
        fetchEmployee();
    }
});

onBeforeUnmount(() => {
    window.removeEventListener("resize", handleResize);
});

// watch(() => props.show, async (v) => {
//     if (v && mode.value === 'draw') {
//         await nextTick()
//         setupCanvas()
//     }
// });
watch(mode, async (m) => {
    if (m === "draw") {
        await nextTick();
        setupCanvas();
    }
});

/* ---------- Uploads & previews (as base64) ---------- */
const signatureFile = ref(null)
const signaturePreview = ref(null)

async function onSignatureFile(e) {
    const f = e.target.files?.[0] || null
    signatureFile.value = f

    if (!f) {
        signaturePreview.value = null
        setValues({ ...values, signature: '' })
        return
    }

    // Convert file to base64 (data URL)
    const dataUrl = await fileToDataURL(f)
    signaturePreview.value = dataUrl
    // 2) store base64 into your vee-validate form value
    setValues({
        ...values,
        signature: dataUrl,
    })
}

const photoFile = ref(null)
const photoPreview = ref(null)
async function onPhoto(e) {
    const f = e.target.files?.[0] || null
    photoFile.value = f
    photoPreview.value = f ? await fileToDataURL(f) : null
}

/* ---------- Fake versions list (keep your original if needed) ---------- */
const versions = ref([]);

function close() {
    emit("close");
}

/* ---------- Helpers ---------- */
function fileToDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result) // data URL (base64)
        reader.onerror = reject
        reader.readAsDataURL(file)
    })
}
</script>


<style scoped>
/* Backdrop */
.sig-backdrop {
    position: fixed;
    inset: 0;
    z-index: 1055;
    /* above BS navbar/modals if any */
    background: rgba(18, 20, 31, 0.55);
    display: grid;
    place-items: center;
    padding: 1rem;
}

/* Modal container (card) */
.sig-modal {
    width: 760px;
    max-width: 100%;
    border-radius: 0.75rem;
    overflow: hidden;
    border: 0;
    height: calc(80vh);
    overflow-y: auto;
}


/* Segment group look refinement */
.sig-segment .btn {
    min-width: 96px;
}

/* Signature canvas card */
.sig-canvas-card {
    border-color: #e5e7eb;
}

.sig-canvas-wrap {
    width: 100%;
    height: 180px;
}

.sig-canvas {
    display: block;
    width: 100%;
    height: 100%;
    background: #fff;
    border: 1px solid #dfe3ea;
    border-radius: 0.375rem;
    touch-action: none;
    /* allow drawing on touch */

}

/* Preview cards */
.sig-preview-card {
    border-color: #e5e7eb;
}

.sig-preview img {
    max-height: 180px;
    object-fit: contain;
}

/* Optional brand tint (adjust to your palette) */
:root {
    --sig-primary: #3e436d;
    /* matches your preferred blue/indigo */
}

.btn-primary,
.btn-outline-primary:hover,
.btn-outline-primary:focus {
    border-color: var(--sig-primary);
    background-color: var(--sig-primary);
}

.btn-outline-primary {
    color: var(--sig-primary);
    border-color: var(--sig-primary);
    background: transparent;
}

.card-header {
    border-bottom: 1px solid #eef0f5;
}
</style>
