<template>
  <div v-if="isLoginPage" class="layout login-layout">
    <NuxtPage />
  </div>
  <div v-else class="layout">
    <Sidebar />
    <div class="content">
      <NuxtLayout>
        <NuxtPage />
      </NuxtLayout>
    </div>
  </div>
</template>

<script setup>
import Sidebar from '../common/Sidebar.vue'

const route = useRoute()
const isLoginPage = computed(() => route.path === '/login')
</script>

<style scoped>
.layout {
  display: flex;
  min-height: 100vh;
  padding: 10px;
}

/* Push main content to the right of sidebar */
.content {
  flex: 1;
  padding: 1rem;
  margin-left: 220px; /* same as Sidebar width */
}

.login-layout {
  margin-left: 0;
}
</style>
