import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import SettingsView from '../views/SettingsView.vue'
import WalkWidgetView from '../views/WalkWidgetView.vue'
import EventWidgetView from '../views/EventWidgetView.vue'
import FishWidgetView from '../views/FishWidgetView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/settings',
      name: 'settings',
      component: SettingsView,
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
    {
      path: '/fish-widget/:channel',
      props: true,
      name: 'fish-widget',
      component: FishWidgetView,
    },
  ],
})

export default router
