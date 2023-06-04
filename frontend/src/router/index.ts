import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import WalkWidgetView from '../views/WalkWidgetView.vue'
import EventWidgetView from '../views/EventWidgetView.vue'

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
    {
      path: '/event-widget/:channel',
      props: true,
      name: 'event-widget',
      component: EventWidgetView,
    },
  ],
})

export default router
