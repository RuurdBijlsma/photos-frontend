import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from '@/views/MainLayout.vue'
import PhotosView from '@/views/main/PhotosView.vue'
import { useSnackbarsStore } from '@/stores/snackbarStore.ts'
import { useAuthStore } from '@/stores/authStore.ts'
import { useSetupStore } from '@/stores/setupStore.ts'

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
  const authStore = useAuthStore()
  const snackbarsStore = useSnackbarsStore()
  const setupStore = useSetupStore()
  const snackbarStore = useSnackbarsStore()

  // --- Global Navigation Guard ---
  router.beforeEach(async (to, from, next) => {
    const accessToken = authStore.accessToken

    // Handle Initial App Load
    if (accessToken && !authStore.user) {
      try {
        await authStore.fetchCurrentUser()
      } catch (error) {
        // If fetching the user fails (e.g., token is invalid),
        // the authStore's interceptor should handle logout.
        // We'll proceed with the navigation, and subsequent checks will redirect to login.
        snackbarStore.error('Session could not be restored. Redirecting to login.', error)
        return next({ name: 'login' })
      }
    }

    const isAuthenticated = authStore.isAuthenticated
    const isAdmin = authStore.isAdmin
    const needsSetup = isAdmin && authStore.user?.media_folder === null

    console.log({ isAdmin, media_folder: authStore.user?.media_folder, needsSetup })
    if (needsSetup) {
      // setup needed
      if (to.name !== 'setup') {
        return next({ name: 'setup' })
      }
    }

    // --- Logic for Admin Routes ---
    if (to.meta.requiresAdmin) {
      if (isAuthenticated && isAdmin) {
        return next() // User is authenticated and an admin, allow access.
      } else {
        snackbarsStore.error("You don't have permission to access this page.")
        // Redirect to a safe page, like home.
        return next({ name: 'home' })
      }
    }

    // --- Logic for Authenticated Routes ---
    if (to.meta.requiresAuth) {
      if (isAuthenticated) {
        return next() // User is authenticated, allow access.
      } else {
        // User is not authenticated, redirect to the login page.
        return next({ name: 'login' })
      }
    }

    // --- Logic for Guest Routes ---
    if (to.meta.guest) {
      if (isAuthenticated) {
        // User is already logged in, redirect them away from login/register.
        return next({ name: 'home' })
      } else {
        return next() // User is not logged in, allow access to guest page.
      }
    }

    // --- For all other public routes ---
    return next() // No specific meta field, so it's a public route.
  })
}

export default router
