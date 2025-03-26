<script setup lang="ts">
import { computed, ref } from 'vue'
import type { DynamicSchemeCollection } from '@/utils/types/color'

const props = defineProps<{
  schemes: DynamicSchemeCollection
  dark: boolean
}>()

const scheme = computed(() => props.schemes[props.dark ? 'dark' : 'light'])

// Mock data for tasks
interface Task {
  label: string
  description: string
  done: boolean
}

interface RoomTasks {
  name: string
  tasks: Task[]
}

// Example tasks per room
const rooms = ref<RoomTasks[]>([
  {
    name: 'Living Room',
    tasks: [
      { label: 'Water', description: 'hoya australis', done: false },
      { label: 'Feed ', description: 'monstera siltepecana', done: false },
    ],
  },
  {
    name: 'Kitchen',
    tasks: [
      { label: 'Water', description: 'pilea peperomioides', done: false },
      { label: 'Water', description: 'hoya australis', done: false },
    ],
  },
  {
    name: 'Bedroom',
    tasks: [
      { label: 'Feed', description: 'monstera siltepecana', done: false },
      { label: 'Water', description: 'philodendron brandi', done: false },
    ],
  },
])
</script>

<template>
  <div>
    <v-theme-provider :theme="dark ? 'dark' : 'light'">
      <v-container
        fluid
        class="pt-4 fake-phone"
        :style="{
          backgroundColor: scheme.surface_container_low,
          color: scheme.on_surface,
        }"
      >
        <!-- Title / Top Info -->
        <v-row class="mx-2">
          <div class="top-buttons">
            <h1
              class="text-h4 serif-font"
              :style="{ color: scheme.on_surface, fontSize: '44px !important' }"
            >
              Today
            </h1>
            <v-btn icon="mdi-account" variant="tonal" :color="scheme.primary" />
          </div>
          <v-col cols="12">
            <v-alert
              type="info"
              icon="mdi-lightbulb"
              class="rounded-xl text-caption"
              :color="scheme.tertiary_container"
              dense
            >
              During the winter your plants slow down and need less water
            </v-alert>
          </v-col>
        </v-row>

        <!-- Task Cards -->
        <div class="cards">
          <v-card
            :color="scheme.surface_container_high"
            v-for="room in rooms"
            :key="room.name"
            class="pa-4 flex-grow-1 rounded-xl"
            variant="flat"
          >
            <v-card-title
              :style="{ color: scheme.on_surface }"
              class="serif-font"
            >
              {{ room.name }}
            </v-card-title>
            <v-list-item
              density="compact"
              v-for="task in room.tasks"
              :key="task.label"
              class="list-item"
            >
              <v-checkbox
                class="mr-4"
                v-model="task.done"
                :color="scheme.primary"
                hide-details
              />
              <div class="list-content">
                <v-list-item-title>{{ task.label }}</v-list-item-title>
                <v-list-item-subtitle
                  >{{ task.description }}
                </v-list-item-subtitle>
              </div>
            </v-list-item>
          </v-card>
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
  box-shadow: 0 10px 40px 0 rgba(0, 0, 0, 0.2);
}

.cards {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.top-buttons {
  width: 100%;
  padding: 60px 10px 15px;
  display: flex;
  justify-content: space-between;
}

.list-item:deep(.v-list-item__content) {
  display: flex;
  flex-direction: row;
}

.list-content {
  cursor: pointer;
  transform: translateY(8px);
}

.serif-font {
  font-family: 'Times New Roman', Times, serif;
  font-size: 23px;
}
</style>
