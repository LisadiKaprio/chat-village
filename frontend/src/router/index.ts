import { createRouter, createWebHistory } from 'vue-router'
import WalkWidgetView from '../views/WalkWidgetView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: WalkWidgetView,
    },
    {
      path: '/walk-widget/:channel',
      props: true,
      name: 'walk-widget',
      component: WalkWidgetView,
    },
  ],
})

export default router
