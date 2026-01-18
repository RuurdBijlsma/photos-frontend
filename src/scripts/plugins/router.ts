import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from '@/vues/layouts/MainLayout.vue'
import TimelineView from '@/vues/views/main/TimelineView.vue'
import { useSnackbarsStore } from '@/scripts/stores/snackbarStore.ts'
import { useAuthStore } from '@/scripts/stores/authStore.ts'
import ViewPhoto from '@/vues/views/main/ViewPhoto.vue'
import { useTimelineStore } from '@/scripts/stores/timeline/timelineStore.ts'

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
          path: '',
          name: 'timeline',
          component: TimelineView,
          children: [
            {
              path: 'view/:mediaId',
              name: 'view-photo-timeline',
              component: ViewPhoto,
            },
          ],
        },
        {
          path: 'explore',
          name: 'explore',
          component: () => import('@/vues/views/main/ExploreView.vue'),
        },
        {
          path: 'map',
          name: 'map',
          component: () => import('@/vues/views/main/MapView.vue'),
        },
        {
          path: 'albums',
          name: 'albums',
          component: () => import('@/vues/views/library/AlbumsLibrary.vue'),
        },
        {
          path: 'album/:albumId',
          name: 'album-view',
          component: () => import('@/vues/views/library/AlbumView.vue'),
          children: [
            {
              path: 'view/:mediaId',
              name: 'view-photo-album',
              component: ViewPhoto,
            },
          ],
        },
      ],
    },
    {
      path: '/login',
      name: 'login',
      meta: { guest: true },
      component: () => import('@/vues/views/auth/LoginView.vue'),
    },
    {
      path: '/register',
      name: 'register',
      meta: { guest: true },
      component: () => import('@/vues/views/auth/RegisterView.vue'),
    },
    {
      path: '/onboarding',
      name: 'onboarding',
      meta: { requiresAuth: true, requiresAdmin: true },
      component: () => import('@/vues/views/OnboardingView.vue'),
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/vues/views/NotFoundView.vue'),
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

    // --- "Onboarding Needed" Redirect Logic ---
    const needsOnboarding =
      isAdmin && (authStore.user?.mediaFolder === null || authStore.user?.mediaFolder === undefined)
    console.log({ needsOnboarding, isAdmin, mf: authStore.user?.mediaFolder })
    if (needsOnboarding && to.name !== 'onboarding') {
      return next({ name: 'onboarding' })
    }
    // If onboarding is needed, and we are already going to the onboarding page, allow it.
    if (needsOnboarding && to.name === 'onboarding') {
      return next()
    }

    // Slightly faster load time for timeline
    if (to.name === 'timeline') {
      const timelineStore = useTimelineStore()
      timelineStore.initialize().then()
    }

    // --- Admin Route Logic ---
    if (to.meta.requiresAdmin) {
      if (isAuthenticated && isAdmin) {
        return next()
      } else {
        snackbarsStore.error("You don't have permission to access this page.")
        return next(isAuthenticated ? { name: 'timeline' } : { name: 'login' })
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
        return next({ name: 'timeline' })
      } else {
        return next()
      }
    }

    // --- Fallback for public routes ---
    return next()
  })
}

export default router
