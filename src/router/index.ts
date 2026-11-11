import { createRouter, createWebHistory } from 'vue-router'

import BlackjackView from '@/views/BlackjackView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'blackjack', component: BlackjackView },
    { path: '/poker', name: 'poker', component: () => import('@/views/PokerView.vue') },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

export default router
