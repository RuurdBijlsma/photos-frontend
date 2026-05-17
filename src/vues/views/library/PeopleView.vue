<script setup lang="ts">
import MainLayoutContainer from '@/vues/components/MainLayoutContainer.vue'
import { computed } from 'vue'
import { usePeopleStore } from '@/scripts/stores/peopleStore.ts'
import { useTheme } from 'vuetify/framework'

const theme = useTheme()
const peopleStore = usePeopleStore()

const namedPeople = computed(() =>
  peopleStore.people
    .filter((person) => person.name?.trim())
    .sort((a, b) => b.photoCount - a.photoCount),
)
const unnamedPeople = computed(() =>
  peopleStore.people
    .filter((person) => !person.name?.trim())
    .sort((a, b) => b.photoCount - a.photoCount),
)
const totalPeopleCount = computed(() => peopleStore.people.length)

function photoCountText(count: number) {
  return `${count.toLocaleString()} photo${count === 1 ? '' : 's'}`
}

peopleStore.fetchPeople()
</script>

<template>
  <main-layout-container class="people-page">
    <div class="people-header">
      <h1>People</h1>
      <p>
        {{ totalPeopleCount.toLocaleString() }} person{{ totalPeopleCount === 1 ? '' : 's' }}
      </p>
    </div>

    <template v-if="totalPeopleCount > 0">
      <section class="people-section" v-if="namedPeople.length > 0">
        <div class="section-header">
          <h2>Named</h2>
          <p>{{ namedPeople.length.toLocaleString() }}</p>
        </div>
        <div class="people-grid">
          <router-link
            v-for="person in namedPeople"
            :key="person.id"
            :to="`/person/${person.id}`"
            class="person-card"
          >
            <v-avatar class="person-avatar" size="116">
              <img :src="peopleStore.getPhotoThumb(person, theme.current.value.dark)" alt="" />
            </v-avatar>
            <div class="person-copy">
              <p class="person-name">{{ person.name }}</p>
              <p class="person-count">{{ photoCountText(person.photoCount) }}</p>
            </div>
          </router-link>
        </div>
      </section>

      <section class="people-section" v-if="unnamedPeople.length > 0">
        <div class="section-header">
          <h2>Unnamed</h2>
          <p>{{ unnamedPeople.length.toLocaleString() }}</p>
        </div>
        <div class="people-grid">
          <router-link
            v-for="person in unnamedPeople"
            :key="person.id"
            :to="`/person/${person.id}`"
            class="person-card"
          >
            <v-avatar class="person-avatar" size="116">
              <img :src="peopleStore.getPhotoThumb(person, theme.current.value.dark)" alt="" />
            </v-avatar>
            <div class="person-copy">
              <p class="person-name unnamed">Unnamed</p>
              <p class="person-count">{{ photoCountText(person.photoCount) }}</p>
            </div>
          </router-link>
        </div>
      </section>
    </template>

    <div class="empty-people" v-else>
      <v-icon color="on-surface-variant" size="140" icon="mdi-account-search-outline" />
      <h2>No people found</h2>
    </div>
  </main-layout-container>
</template>

<style scoped>
.people-page {
  padding: 34px;
  overflow-y: auto;
}

.people-header {
  margin-bottom: 28px;
}

.people-header h1 {
  font-size: 44px;
  line-height: 1.1;
  font-weight: 500;
  margin: 0;
}

.people-header p {
  margin: 8px 0 0;
  color: rgb(var(--v-theme-on-surface-variant));
}

.people-section {
  margin-bottom: 42px;
}

.section-header {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 14px;
}

.section-header h2 {
  font-size: 24px;
  font-weight: 500;
  margin: 0;
}

.section-header p {
  color: rgb(var(--v-theme-on-surface-variant));
  margin: 0;
}

.people-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 22px;
}

.person-card {
  min-width: 0;
  border-radius: 8px;
  color: rgb(var(--v-theme-on-background));
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 14px 8px 16px;
  text-align: center;
  text-decoration: none;
  transition:
    background-color 150ms ease,
    transform 150ms ease;
}

.person-card:hover {
  background-color: rgba(var(--v-theme-on-background), 0.06);
  transform: translateY(-1px);
}

.person-avatar {
  background-color: rgba(var(--v-theme-on-background), 0.08);
}

.person-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.person-copy {
  min-width: 0;
  width: 100%;
}

.person-name,
.person-count {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.person-name {
  font-weight: 600;
  margin: 0;
}

.person-name.unnamed {
  color: rgb(var(--v-theme-on-surface-variant));
  font-style: italic;
  font-weight: 400;
}

.person-count {
  color: rgb(var(--v-theme-on-surface-variant));
  font-size: 0.9rem;
  margin: 3px 0 0;
}

.empty-people {
  min-height: 520px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  color: rgb(var(--v-theme-on-surface-variant));
}

.empty-people h2 {
  font-weight: 500;
  margin: 0;
}
</style>
