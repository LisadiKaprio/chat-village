import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import WalkWidgetView from '../views/WalkWidgetView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
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
