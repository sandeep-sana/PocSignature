<template>
  <div class="layout">
    <!-- Sidebar fixed on the left -->
    <Sidebar />

    <!-- Main content area -->
    <div class="content">
      <NuxtLayout>
        <NuxtPage />
      </NuxtLayout>
    </div>
  </div>
</template>

<script setup>
import Sidebar from '../common/Sidebar.vue'
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
</style>
