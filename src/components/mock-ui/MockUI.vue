<script setup lang="ts">
import { ref } from 'vue'
import type { Theme } from '@/utils/types/color'
import themeJson from '@/assets/themes/themes-v6.json'
import ThemePhoneTodo from '@/components/mock-ui/ThemePhoneTodo.vue'
import ThemePhonePlant from '@/components/mock-ui/ThemePhonePlant.vue'

// Load the theme definitions
const themes: Theme[] = themeJson

// Track which theme index is selected
const currentTheme = ref(0)
const dark = ref(false)
</script>

<template>
  <!-- Some quick buttons to swap themes -->
  <div class="main">
    <div class="mb-8 buttons">
      <v-btn
        v-for="themeIndex in [0, 1, 2]"
        :key="themeIndex"
        :color="themes[themeIndex].source"
        @click="currentTheme = themeIndex"
        variant="elevated"
        >Theme {{ themeIndex + 1 }}
      </v-btn>
      <v-btn @click="dark = !dark" variant="tonal" color="primary"
        >Toggle Dark
      </v-btn>
    </div>

    <div class="phones">
      <theme-phone-todo :schemes="themes[currentTheme].schemes" :dark="dark" />
      <theme-phone-plant :schemes="themes[currentTheme].schemes" :dark="dark" />
    </div>
  </div>
</template>

<style scoped>
.main {
  padding: 30px;
}

.buttons {
  display: flex;
  justify-content: space-evenly;
  width: 700px;
  margin: 0 auto;
}

.phones {
  margin: 0 auto;
  display: flex;
  justify-content: space-evenly;
}
</style>
