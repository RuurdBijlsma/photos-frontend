import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from '@/views/MainLayout.vue'
import PhotosView from '@/views/main/PhotosView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: MainLayout,
      children: [
        {
          path: '/',
          name: 'photos-library',
          component: PhotosView,
        },
        {
          path: '/explore',
          name: 'explore',
          component: () => import('../views/main/ExploreView.vue'),
        },
        {
          path: '/map',
          name: 'map',
          component: () => import('../views/main/MapView.vue'),
        },
      ],
    },
  ],
})

export default router
