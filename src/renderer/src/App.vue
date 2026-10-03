<script setup lang="ts">
import ConfirmDialog from 'primevue/confirmdialog'
import Toast from 'primevue/toast'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <div class="layout">
    <aside class="sidebar">
      <div class="brand">
        <i class="pi pi-wallet" aria-hidden="true" />
        <span>{{ t('app.title') }}</span>
      </div>
      <nav class="nav">
        <RouterLink to="/accounts" class="nav-link">
          <i class="pi pi-credit-card" aria-hidden="true" />
          {{ t('nav.accounts') }}
        </RouterLink>
        <RouterLink to="/members" class="nav-link">
          <i class="pi pi-users" aria-hidden="true" />
          {{ t('nav.members') }}
        </RouterLink>
      </nav>
    </aside>
    <main class="content">
      <RouterView />
    </main>
  </div>
  <Toast position="bottom-right" />
  <ConfirmDialog />
</template>

<style scoped>
.layout {
  display: grid;
  grid-template-columns: 220px 1fr;
  min-height: 100vh;
}

.sidebar {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1.25rem 0.75rem;
  background: var(--p-surface-100);
  border-right: 1px solid var(--p-surface-200);
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0 0.5rem;
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--p-primary-700);
}

.nav {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.55rem 0.75rem;
  border-radius: var(--p-border-radius-md);
  color: var(--p-surface-700);
  text-decoration: none;
}

.nav-link:hover {
  background: var(--p-surface-200);
}

.nav-link.router-link-active {
  background: var(--p-primary-100);
  color: var(--p-primary-800);
  font-weight: 600;
}

.content {
  padding: 1.5rem 2rem;
  min-width: 0;
}
</style>
