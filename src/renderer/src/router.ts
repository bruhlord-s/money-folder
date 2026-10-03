import { createRouter, createWebHashHistory } from 'vue-router'

// Hash history: the packaged app loads index.html from file://.
export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: '/accounts' },
    { path: '/accounts', component: () => import('./pages/AccountsPage.vue') },
    { path: '/members', component: () => import('./pages/MembersPage.vue') }
  ]
})
