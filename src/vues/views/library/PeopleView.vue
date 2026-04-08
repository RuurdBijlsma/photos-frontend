<script setup lang="ts">
import MainLayoutContainer from '@/vues/components/MainLayoutContainer.vue'
import peopleService from '@/scripts/services/peopleService.ts'
import { ref } from 'vue'
import type { PersonInfo } from '@/scripts/types/generated/timeline.ts'
import mediaItemService from '@/scripts/services/mediaItemService.ts'

const people = ref<PersonInfo[]>([])

async function init() {
  const listPeeps = await peopleService.list()
  people.value = listPeeps.people
  console.log(people)

  for (const person of people.value) {
    const j = await peopleService.get(person.id)
    console.log(j)
  }
}
init()
</script>

<template>
  <main-layout-container class="people">
    <h1>People!</h1>
    <div class="people-list">
      <v-card variant="tonal" rounded="xl" v-for="person in people" :key="person.id" class="person">
        <img :src="mediaItemService.getFaceThumbnail(person.id)" class="person-img" alt="face" />
        <div>
          <p v-if="person.name">{{ person.name }}</p>
          <p>{{ person.photoCount }} photo{{ person.photoCount === 1 ? '' : 's' }}</p>
        </div>
      </v-card>
    </div>
  </main-layout-container>
</template>

<style scoped>
.person {
  align-items: center;
  gap: 20px;
  padding: 10px;
  flex-direction: column;
  width: 120px;
  display: inline-block;
  height: 190px;
  margin-right: 10px;
}

.person-img {
  height: 100px;
  width: 100px;
  border-radius: 50%;
  background-color: rgba(var(--v-theme-on-background), 0.1);
}
</style>
