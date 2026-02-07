<template>
  <div class="login-page">
    <div class="login-card">
      <span class="demo-badge">1</span>
      <h1 class="login-title">User Login</h1>
      <p class="compliance-statement">
        System enforces unique users and role-based access (Admin / Approver).
      </p>

      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-group">
          <label for="username">Username</label>
          <input
            id="username"
            v-model="username"
            type="text"
            autocomplete="username"
            placeholder="admin or approver"
            required
          />
        </div>
        <div class="form-group">
          <label for="password">Password</label>
          <input
            id="password"
            v-model="password"
            type="password"
            autocomplete="current-password"
            placeholder="Enter password"
            required
          />
        </div>

        <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>

        <button type="submit" class="submit-btn" :disabled="loading">
          {{ loading ? 'Signing in…' : 'Sign in' }}
        </button>
      </form>

      <div class="why-it-matters">
        <h3>Why it matters</h3>
        <ul>
          <li><strong>ALCOA+</strong> — Attributable, Legible, Contemporaneous, Original, Accurate (plus Complete, Consistent, Enduring, Available)</li>
          <li><strong>21 CFR Part 11</strong> — Electronic records and signatures; unique user identification and access control</li>
          <li><strong>GAMP basic control</strong> — Access control and user management as foundational GxP requirements</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useAuth } from '../../composables/useAuth'

const { login } = useAuth()
const router = useRouter()
const username = ref('')
const password = ref('')
const errorMessage = ref('')
const loading = ref(false)

async function handleLogin() {
  errorMessage.value = ''
  if (!username.value.trim() || !password.value) {
    errorMessage.value = 'Please enter username and password.'
    return
  }
  loading.value = true
  try {
    const result = await login(username.value, password.value)
    if (result.success) {
      router.push('/')
    } else {
      errorMessage.value = result.message || 'Login failed.'
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(145deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
  padding: 1rem;
}

.login-card {
  position: relative;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
  padding: 2rem 2.5rem;
  max-width: 420px;
  width: 100%;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}
.login-card .demo-badge {
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 1.75rem;
  height: 1.75rem;
  background: #22c55e;
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.9rem;
}

.login-title {
  color: #f8fafc;
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  text-align: center;
}

.compliance-statement {
  color: #94a3b8;
  font-size: 0.9rem;
  text-align: center;
  margin-bottom: 1.5rem;
  line-height: 1.4;
}

.login-form {
  margin-bottom: 0;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  color: #cbd5e1;
  font-size: 0.9rem;
  font-weight: 500;
  margin-bottom: 0.35rem;
}

.form-group input {
  width: 100%;
  padding: 0.6rem 0.75rem;
  border: 2px solid #475569;
  border-radius: 8px;
  background: #0f172a;
  color: #f8fafc;
  font-size: 1rem;
  box-sizing: border-box;
}

.form-group input::placeholder {
  color: #64748b;
}

.form-group input:focus {
  outline: none;
  border-color: #22c55e;
}

.error-message {
  color: #f87171;
  font-size: 0.9rem;
  margin-bottom: 0.75rem;
}

.submit-btn {
  width: 100%;
  padding: 0.75rem 1rem;
  background: #22c55e;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s, opacity 0.2s;
  margin-top: 0.25rem;
}

.submit-btn:hover:not(:disabled) {
  background: #16a34a;
}

.submit-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.why-it-matters {
  margin-top: 1.75rem;
  padding-top: 1.5rem;
  border-top: 1px solid #334155;
}

.why-it-matters h3 {
  color: #94a3b8;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.75rem;
}

.why-it-matters ul {
  margin: 0;
  padding-left: 1.25rem;
  color: #64748b;
  font-size: 0.8rem;
  line-height: 1.5;
}

.why-it-matters li {
  margin-bottom: 0.4rem;
}

.why-it-matters strong {
  color: #94a3b8;
}
</style>
