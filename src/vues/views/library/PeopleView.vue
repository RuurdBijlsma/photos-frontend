<script setup lang="ts">
import MainLayoutContainer from '@/vues/components/MainLayoutContainer.vue'
import { computed, ref } from 'vue'
import { usePeopleStore } from '@/scripts/stores/peopleStore.ts'
import { useTheme } from 'vuetify/framework'
import GlowImage from '@/vues/components/ui/GlowImage.vue'
import type { PersonInfo } from '@/scripts/types/generated/timeline.ts'
import { useDialogStore } from '@/scripts/stores/dialogStore.ts'

const theme = useTheme()
const peopleStore = usePeopleStore()
const dialogs = useDialogStore()
const draggedPersonId = ref<string | null>(null)
const dragOverId = ref<string | null>(null)

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

function onDragStart(person: PersonInfo, event: DragEvent) {
  draggedPersonId.value = person.id
  event.dataTransfer?.setData('text/plain', person.id)
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}

function onDragEnd() {
  draggedPersonId.value = null
  dragOverId.value = null
}

async function onDrop(dropPerson: PersonInfo, event: DragEvent) {
  const sourceId = event.dataTransfer?.getData('text/plain') || draggedPersonId.value
  draggedPersonId.value = null
  dragOverId.value = null
  if (!sourceId || sourceId === dropPerson.id) return

  const sourcePerson = peopleStore.people.find((person) => person.id === sourceId)
  if (!sourcePerson) return

  const sourceName = sourcePerson.name?.trim()
  const dropName = dropPerson.name?.trim()
  let mergeSourceId = sourcePerson.id
  let mergeSource = sourcePerson
  let mergeTarget = dropPerson

  if (sourceName && !dropName) {
    mergeSourceId = dropPerson.id
    mergeSource = dropPerson
    mergeTarget = sourcePerson
  } else if (!sourceName && !dropName) {
    const name = await dialogs.prompt({
      title: 'Name merged person',
      description: 'Give this person a name before merging these two groups.',
      confirmText: 'Merge',
    })
    if (!name?.trim()) return
    const updated = await peopleStore.updatePerson(dropPerson.id, { name: name.trim() })
    if (!updated) return
    mergeTarget = {
      ...dropPerson,
      name: name.trim(),
    }
  }

  const confirmed = await dialogs.confirm({
    title: 'Merge people?',
    description: `Merge ${mergeSource.name?.trim() || 'this unnamed person'} into ${mergeTarget.name || 'this person'}?`,
    confirmText: 'Merge',
    icon: 'mdi-account-multiple-plus',
  })
  if (!confirmed) return

  await peopleStore.mergePerson(mergeSourceId, mergeTarget.id)
}

peopleStore.fetchPeople()
</script>

<template>
  <main-layout-container>
    <div class="library-container">
      <header class="library-header">
        <div class="header-left">
          <h1>People</h1>
          <span class="people-count">
            {{ totalPeopleCount.toLocaleString() }} person{{ totalPeopleCount === 1 ? '' : 's' }}
          </span>
        </div>
      </header>

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
              draggable="true"
              @dragstart="onDragStart(person, $event)"
              @dragend="onDragEnd"
              :class="{
                'drag-over-card': dragOverId === person.id && draggedPersonId !== person.id,
                'is-dragging': draggedPersonId !== null,
              }"
              @dragenter="dragOverId = person.id"
              @dragleave="dragOverId = null"
              @dragover.prevent
              @drop.prevent="onDrop(person, $event)"
            >
              <glow-image
                :src="peopleStore.getPhotoThumb(person, theme.current.value.dark)"
                :height="124"
                :width="124"
                border-radius="62px"
                :strength="0.7"
              />
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
              draggable="true"
              @dragstart="onDragStart(person, $event)"
              @dragend="onDragEnd"
              :class="{
                'drag-over-card': dragOverId === person.id && draggedPersonId !== person.id,
                'is-dragging': draggedPersonId !== null,
              }"
              @dragenter="dragOverId = person.id"
              @dragleave="dragOverId = null"
              @dragover.prevent
              @drop.prevent="onDrop(person, $event)"
            >
              <glow-image
                :src="peopleStore.getPhotoThumb(person, theme.current.value.dark)"
                :height="124"
                :width="124"
                border-radius="62px"
                :strength="0.7"
              />
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
    </div>
  </main-layout-container>
</template>

<style scoped>
.library-container {
  padding: 20px;
}

.library-header {
  padding: 0 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.header-left h1 {
  margin: 0;
  font-size: 2.5rem;
  font-weight: 600;
  line-height: 1.2;
}

.people-count {
  font-size: 0.9rem;
  font-weight: 400;
  color: rgb(var(--v-theme-on-surface-variant));
}

.people-section {
  margin-bottom: 42px;
}

.section-header {
  display: flex;
  align-items: baseline;
  gap: 15px;
  margin-bottom: 14px;
  padding: 0 10px;
}

.section-header h2 {
  font-size: 24px;
  font-weight: 500;
  margin: 0;
}

.section-header p {
  color: rgb(var(--v-theme-on-surface-variant));
  font-size: 20px;
  margin: 0;
}

.people-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(132px, 1fr));
  gap: 24px 14px;
  justify-items: center;
}

.person-card {
  min-width: 0;
  border-radius: 8px;
  color: rgb(var(--v-theme-on-background));
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 10px;
  text-align: center;
  text-decoration: none;
  transition:
    background-color 150ms ease,
    transform 150ms ease;
}

.person-card:hover {
  background-color: rgba(var(--v-theme-on-background), 0.06);
  transform: translateY(-2px);
}

.person-card :deep(img) {
  pointer-events: none;
}

.person-card.drag-over-card.is-dragging {
  outline: 2px solid rgb(var(--v-theme-primary)) !important;
  background-color: rgba(var(--v-theme-primary), 0.1);
  border-radius: 12px;
}

.person-card.is-dragging * {
  pointer-events: none;
}

.person-card[draggable='true']:active {
  opacity: 0.4;
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
