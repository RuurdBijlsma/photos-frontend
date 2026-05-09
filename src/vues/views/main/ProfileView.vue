<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MainLayoutContainer from '@/vues/components/MainLayoutContainer.vue'
import UserAvatar from '@/vues/components/ui/UserAvatar.vue'
import { useAuthStore } from '@/scripts/stores/authStore.ts'
import { useSnackbarsStore } from '@/scripts/stores/snackbarStore.ts'
import userService from '@/scripts/services/userService.ts'
import type { UserProfile } from '@/scripts/types/api/user.ts'
import { useDate } from 'vuetify'

const authStore = useAuthStore()
const snackbars = useSnackbarsStore()
const router = useRouter()
const route = useRoute()
const date = useDate()

const loading = ref(true)
const profile = ref<UserProfile | null>(null)

const isCurrentUser = computed(() => {
  return authStore.user?.id === Number(route.params.userId)
})

async function loadProfile() {
  loading.value = true
  try {
    const userId = Number(route.params.userId)
    if (isNaN(userId)) throw new Error('Invalid User ID')
    const response = await userService.getUserProfile(userId)
    profile.value = response.data
  } catch (error) {
    snackbars.error('Failed to load profile')
    console.error(error)
  } finally {
    loading.value = false
  }
}

function formatDate(dateStr: string) {
  if (!dateStr) return ''
  return date.format(new Date(dateStr), 'monthAndYear')
}

watch(
  () => route.params.userId,
  () => {
    loadProfile()
  },
  { immediate: true },
)

const statCards = computed(() => [
  {
    title: 'Photos',
    value: profile.value?.stats.photoCount ?? 0,
    icon: 'mdi-image-multiple',
    color: 'primary',
  },
  {
    title: 'Videos',
    value: profile.value?.stats.videoCount ?? 0,
    icon: 'mdi-video',
    color: 'secondary',
  },
  {
    title: 'Albums',
    value: profile.value?.stats.albumCount ?? 0,
    icon: 'mdi-image-album',
    color: 'tertiary',
  },
  {
    title: 'Shared',
    value: profile.value?.stats.sharedAlbumCount ?? 0,
    icon: 'mdi-share-variant',
    color: 'info',
  },
])
</script>

<template>
  <main-layout-container class="profile-view">
    <div v-if="loading" class="d-flex align-center justify-center fill-height">
      <v-progress-circular indeterminate color="primary" size="64" />
    </div>

    <div v-else-if="profile" class="profile-content">
      <!-- Header Section -->
      <section class="profile-header d-flex align-end mb-12">
        <user-avatar
          :name="profile.name"
          :avatar-id="profile.avatarId"
          :size="150"
          class="mr-8"
          elevation="4"
        />

        <div class="user-info-container flex-grow-1">
          <div class="d-flex align-center justify-between mb-2">
            <h1 class="text-h2 font-weight-bold mb-0">{{ profile.name }}</h1>
            <v-spacer />
            <v-btn
              v-if="isCurrentUser"
              prepend-icon="mdi-pencil"
              variant="tonal"
              rounded="xl"
              class="text-none"
              color="primary"
            >
              Edit Profile
            </v-btn>
          </div>
          <p v-if="profile.email" class="text-subtitle-1 opacity-70 mb-2">{{ profile.email }}</p>
          <div class="d-flex align-center opacity-60">
            <v-icon icon="mdi-calendar-range" size="small" class="mr-2" />
            <span>Joined {{ formatDate(profile.createdAt) }}</span>
          </div>
        </div>
      </section>

      <!-- Stats Section -->
      <section class="stats-section mb-12">
        <v-row>
          <v-col v-for="stat in statCards" :key="stat.title" cols="12" sm="6" md="3">
            <v-card class="stat-card rounded-xl pa-4" elevation="2">
              <div class="d-flex align-center">
                <v-avatar :color="stat.color" variant="tonal" class="mr-4" rounded="lg">
                  <v-icon :icon="stat.icon" />
                </v-avatar>
                <div>
                  <div class="text-h4 font-weight-bold">{{ stat.value.toLocaleString() }}</div>
                  <div class="text-caption text-uppercase font-weight-medium opacity-60">
                    {{ stat.title }}
                  </div>
                </div>
              </div>
            </v-card>
          </v-col>
        </v-row>
      </section>
    </div>

    <div v-else class="d-flex align-center justify-center fill-height flex-column">
      <v-icon icon="mdi-account-off" size="100" class="mb-4 opacity-20" />
      <h2 class="text-h4">User not found</h2>
      <v-btn color="primary" variant="tonal" rounded class="mt-6" @click="router.push('/')">
        Go Home
      </v-btn>
    </div>
  </main-layout-container>
</template>

<style scoped>
.profile-view {
  padding: 40px;
}

.profile-content {
  max-width: 1200px;
  margin: 0 auto;
}

.stat-card {
  transition:
    transform 0.3s ease,
    box-shadow 0.3s ease;
  background: rgba(var(--v-theme-surface-variant), 0.3);
}

.stat-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 12px 20px -10px rgba(0, 0, 0, 0.2);
}

.opacity-70 {
  opacity: 0.7;
}

.opacity-60 {
  opacity: 0.6;
}

.opacity-20 {
  opacity: 0.2;
}
</style>
