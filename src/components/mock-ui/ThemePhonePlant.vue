<script setup lang="ts">
import { ref, computed } from 'vue'
import type { DynamicSchemeCollection } from '@/utils/types/color'

const props = defineProps<{
  schemes: DynamicSchemeCollection
  dark: boolean
}>()

const scheme = computed(() => props.schemes[props.dark ? 'dark' : 'light'])

// Mock data for the detail page “cards” under the image
interface PlantCard {
  title: string
  subtitle: string
  icon: string
}

interface TextIcon {
  text: string
  icon: string
}

const infoCards = ref<PlantCard[]>([
  {
    title: 'Most Popular',
    subtitle: 'This is a popular plant in our store',
    icon: 'mdi-creation',
  },
  {
    title: 'Easy Care',
    subtitle: 'This is a popular plant in our store',
    icon: 'mdi-water',
  },
  {
    title: 'Faux Avail',
    subtitle: 'This is a popular plant in our store',
    icon: 'mdi-flower-outline',
  },
])

// Care / About data
const careItems = ref<TextIcon[]>([
  { text: 'Water every Tuesday', icon: 'mdi-waves' },
  { text: 'Feed once monthly', icon: 'mdi-leaf' },
])
const aboutItems = ref<string[]>(['Moderate light'])
</script>

<template>
  <!-- Some quick buttons to swap themes -->
  <div>
    <v-theme-provider :theme="dark ? 'dark' : 'light'">
      <v-container
        fluid
        class="fake-phone pa-0"
        :style="{
          backgroundColor: scheme.surface_container_low,
          color: scheme.on_surface,
        }"
      >
        <div class="pa-5 pb-0">
          <!-- Top bar with 3-dot menu -->
          <v-row class="align-center justify-end px-2 py-1">
            <v-btn
              icon="mdi-dots-vertical"
              variant="text"
              :color="scheme.on_surface"
            />
          </v-row>

          <!-- Main Content -->
          <!-- Title -->
          <v-col cols="12">
            <h1
              class="text-h3 serif-font page-title"
              :style="{
                color: scheme.primary,
              }"
            >
              Monstera Unique
            </h1>
          </v-col>

          <!-- Plant image -->
          <v-col cols="12" class="d-flex justify-center mb-4">
            <div class="plant-image-container">
              <!-- Replace with your actual image path -->
              <img
                :src="`img/monstera.png`"
                alt="Monstera"
                class="plant-image"
              />
            </div>
          </v-col>
        </div>

        <!-- Info Cards -->
        <div class="info-cards">
          <v-card
            v-for="(card, index) in infoCards"
            :key="index"
            :color="scheme.secondary_container"
            class="info-card pb-8"
            variant="flat"
          >
            <v-icon
              :icon="card.icon"
              size="24"
              class="mb-2"
            />
            <div
              class="text-body-1 serif-font"
            >
              {{ card.title }}
            </div>
            <div
              class="text-body-2 text-caption"
            >
              {{ card.subtitle }}
            </div>
          </v-card>
        </div>

        <div class="pa-5 pt-0">
          <!-- Care Section -->
          <v-col cols="12" class="mt-4">
            <h2
              class="serif-font text-h6 mb-2"
              :style="{ color: scheme.on_surface }"
            >
              Care
            </h2>
            <v-list-item
              v-for="(item, idx) in careItems"
              :key="idx"
              :prepend-icon="item.icon"
              :style="{ color: scheme.on_surface }"
            >
              <v-list-item-title>{{ item.text }}</v-list-item-title>
            </v-list-item>
          </v-col>

          <!-- About Section -->
          <v-col cols="12" class="mt-2">
            <h2
              class="serif-font text-h6 mb-2"
              :style="{ color: scheme.on_surface }"
            >
              About
            </h2>
            <v-list-item
              v-for="(item, idx) in aboutItems"
              :key="idx"
              prepend-icon="mdi-weather-sunny"
              :style="{ color: scheme.on_surface }"
            >
              <v-list-item-title>{{ item }}</v-list-item-title>
            </v-list-item>
          </v-col>
        </div>
      </v-container>
    </v-theme-provider>
  </div>
</template>

<style scoped>
.fake-phone {
  width: 500px;
  height: 800px;
  border-radius: 20px;
  overflow: hidden;
  overflow-y: auto;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.serif-font {
  font-family: 'Times New Roman', serif;
}

.page-title {
  font-size: 60px;
  text-align: center;
}

.plant-image-container {
  width: 100%;
  height: 270px;
  filter: brightness(120%) saturate(110%);
  max-width: 300px;
  border-radius: 90px;
  overflow: hidden;
}

.plant-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.info-cards {
  overflow-x: auto;
  white-space: nowrap;
  gap: 20px;
  display: flex;
  padding: 0 30px;
}

.info-card {
  padding: 15px;
  flex: 0 0 auto;
  border-radius: 30px;
  width: 130px;
  white-space: normal;
  display: inline-block;
}

.info-cards::-webkit-scrollbar {
  display: none;
}
</style>
