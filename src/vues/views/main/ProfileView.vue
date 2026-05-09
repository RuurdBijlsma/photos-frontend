<script setup lang="ts">
import MainLayoutContainer from '@/vues/components/MainLayoutContainer.vue'
import { useAuthStore } from '@/scripts/stores/authStore.ts'
import { computed, watch } from 'vue'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()

const user = computed(() => authStore.user!)

watch(
  user,
  () => {
    if (user.value === null) {
      router.push('/login')
    }
  },
  { immediate: true },
)
</script>

<template>
  <main-layout-container class="profile">
    <h1>Hi {{user.name}}</h1>
  </main-layout-container>
</template>

<style scoped></style>
