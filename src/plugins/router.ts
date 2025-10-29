import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from '@/views/MainLayout.vue'
import PhotosView from '@/views/main/PhotosView.vue'
import { useSnackbarsStore } from '@/stores/snackbarStore.ts'
import { useAuthStore } from '@/stores/authStore.ts'

const router = createRouter({
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
      path: '/login',
      name: 'login',
      meta: { guest: true },
      component: () => import('../views/LoginView.vue'),
    },
    {
      path: '/register',
      name: 'register',
      meta: { guest: true },
      component: () => import('../views/RegisterView.vue'),
    },
    {
      path: '/setup',
      name: 'setup',
      meta: { requiresAuth: true, requiresAdmin: true },
      component: () => import('../views/SetupView.vue'),
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('../views/NotFound.vue'),
    },
  ],
})

export function registerNavigationGuard() {
  const snackbarsStore = useSnackbarsStore()

  router.beforeEach(async (to, from, next) => {
    const authStore = useAuthStore()

    // --- Authentication Initialization ---
    // If we have a token but no user data, attempt to fetch it. This is crucial for page reloads.
    if (authStore.accessToken && !authStore.user) {
      try {
        await authStore.fetchCurrentUser()
      } catch (error) {
        // If the token is invalid, the fetch will fail. Log the user out completely.
        console.error('Session restore failed:', error)
        await authStore.logout()
        // No need to proceed further, just go to login.
        return next({ name: 'login' })
      }
    }

    // --- Get Fresh Auth State ---
    // This ensures `isAuthenticated` and `isAdmin` have the most up-to-date values.
    const isAuthenticated = authStore.isAuthenticated
    const isAdmin = authStore.isAdmin

    // --- "Setup Needed" Redirect Logic ---
    const needsSetup = isAdmin && authStore.user?.mediaFolder === null
    if (needsSetup && to.name !== 'setup') {
      return next({ name: 'setup' })
    }
    // If setup is needed and we are already going to the setup page, allow it.
    if (needsSetup && to.name === 'setup') {
      return next()
    }

    // --- Admin Route Logic ---
    if (to.meta.requiresAdmin) {
      if (isAuthenticated && isAdmin) {
        return next()
      } else {
        snackbarsStore.error("You don't have permission to access this page.")
        return next(isAuthenticated ? { name: 'photos-library' } : { name: 'login' })
      }
    }

    // --- Authenticated Route Logic ---
    if (to.meta.requiresAuth) {
      if (isAuthenticated) {
        return next()
      } else {
        return next({ name: 'login' })
      }
    }

    // --- Guest Route Logic (for pages like Login and Register) ---
    if (to.meta.guest) {
      if (isAuthenticated) {
        return next({ name: 'photos-library' })
      } else {
        return next()
      }
    }

    // --- Fallback for public routes ---
    return next()
  })
}

export default router
