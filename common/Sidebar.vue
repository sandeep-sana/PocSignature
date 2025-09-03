<template>
    <aside class="sidebar">
        <h2>Sidebar</h2>
        <router-link to="/">Dashboard</router-link>
        <router-link to="/enrol">Enrol</router-link>
        <router-link to="/stamp">Stamp</router-link>
        <router-link to="/validate-compare">Validate Compare</router-link>
    </aside>
</template>

<script setup></script>

<style scoped>
.sidebar {
    position: fixed;
    top: 0;
    left: 0;
    width: 220px;
    height: 100vh;
    background: #0f172a;
    color: #fff;
    padding: 1rem;
}

.sidebar a {
    display: block;
    margin: 0.5rem 0;
    color: inherit;
    text-decoration: none;
}

.sidebar a.router-link-active {
    font-weight: bold;
    color: #22c55e;
}
</style>
