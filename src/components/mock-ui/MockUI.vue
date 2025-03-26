<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Theme } from '@/utils/types/color'
import themeJson from '@/assets/themes-v3.json'

// Load the theme definitions
const theme: Theme[] = themeJson

// Track which theme index is selected
const currentTheme = ref(0)
const dark = ref(false)

// Pick 'light' or 'dark' scheme here (based on your preference/design):
const scheme = computed(
  () => theme[currentTheme.value].schemes[dark.value ? 'dark' : 'light'],
)

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

// Handler to toggle a task's done state
function toggleTask(roomName: string, taskIndex: number) {
  // rooms.value[roomIndex].tasks[taskIndex].done =
  //   !rooms.value[roomIndex].tasks[taskIndex].done
}
</script>

<template>
  <div class="main">
    <v-btn @click="currentTheme = 0">Theme 1</v-btn>
    <v-btn @click="currentTheme = 1">Theme 2</v-btn>
    <v-btn @click="currentTheme = 2">Theme 3</v-btn>
    <v-btn @click="dark = !dark">Toggle Dark</v-btn>

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
              :style="{ color: scheme.on_surface }"
            >
              Today
            </h1>
            <v-btn icon="mdi-account" variant="tonal" :color="scheme.primary" />
          </div>
          <v-col cols="12">
            <v-alert
              type="info"
              icon="mdi-lightbulb"
              class="rounded-xl"
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
              v-for="(task, taskIndex) in room.tasks"
              :key="task.label"
              class="list-item"
            >
              <v-checkbox
                class="mr-4"
                v-model="task.done"
                @click="toggleTask(room.name, taskIndex)"
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
.main {
  padding: 30px;
}

.fake-phone {
  width: 500px;
  height: 800px;
  border-radius: 20px;
  margin: 30px;
  margin-left: 60px;
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

.serif-font {
  font-family: 'Times New Roman', Times, serif;
  font-size: 23px;
}
</style>
