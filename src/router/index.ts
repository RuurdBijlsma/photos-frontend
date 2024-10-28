import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from '@/views/main/MainLayout.vue'
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
          component: PhotosView
        },
        {
          path: '/explore',
          name: 'explore',
          component: () => import('../views/main/ExploreView.vue')
        }
      ]
    },
    {
      path: '/about',
      name: 'about',
      component: () => import('../views/other-layout/AboutView.vue')
    }
  ]
})

export default router
