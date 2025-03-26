<script setup lang="ts">
import { type Ref, ref } from 'vue'
import type { Theme } from '@/utils/types/color'
import themeJson from '@/assets/themes-v3.json'
import ThemePhoneTodo from '@/components/mock-ui/ThemePhoneTodo.vue'

const themes: Ref<Theme[]> = ref(themeJson)
const currentTheme = ref(0)
const dark = ref(false)
</script>

<template>
  <div class="main">
    <v-btn @click="currentTheme = 0">Theme 1</v-btn>
    <v-btn @click="currentTheme = 1">Theme 2</v-btn>
    <v-btn @click="currentTheme = 2">Theme 3</v-btn>
    <v-btn @click="dark = !dark">Toggle Dark</v-btn>
<!--    <theme-phone-todo-->
<!--      class="phone"-->
<!--      :schemes="themes[currentTheme].schemes"-->
<!--      :dark="dark"-->
<!--    />-->
  </div>
</template>

<style scoped>
.main {
  padding: 30px;
}

.phone {
  margin: 30px 30px 30px 60px;
}
</style>
