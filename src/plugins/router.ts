import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from '@/views/MainLayout.vue'
import PhotosView from '@/views/main/PhotosView.vue'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  // history: createWebHistory(import.meta.env.BASE_URL),
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: MainLayout,
      meta: { requiresAuth: true },
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
    {
      path: '/view',
      name: 'view-photo',
      component: () => import('../views/PhotoView.vue'),
    },
    {
      path: '/login',
      name: 'login',
      meta: { loggedOut: true },
      component: () => import('../views/LoginView.vue'),
    },
    {
      path: '/welcome',
      name: 'welcome',
      component: () => import('../views/FirstVisitView.vue'),
    },
    {
      path: '/setup',
      name: 'setup',
      meta: { requiresAuth: true },
      component: () => import('../views/SetupView.vue'),
    },
  ],
})

export function registerNavigationGuard() {
  const authStore = useAuthStore()
  // Global Navigation Guard
  router.beforeEach(async (to, from, next) => {
    if (to.meta.requiresAuth) {
      if (!authStore.isLoggedIn) {
        // If we have a token, try to refresh user state
        if (authStore.token) {
          try {
            await authStore.fetchCurrentUser()
            if (authStore.isLoggedIn) return next()
          } catch (error) {
            console.warn('Using token failed', error)
            authStore.logout()
          }
        }
        next('/login')
      } else {
        next()
      }
    } else if (to.meta.loggedOut) {
      if (authStore.isLoggedIn) {
        alert("You're already logged in, you can't go to /login.")
        next('/')
      } else {
        next()
      }
    } else {
      next()
    }
  })
}

export default router
