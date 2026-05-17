<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue'
import { useRoute } from 'vue-router'
import { usePeopleStore } from '@/scripts/stores/peopleStore.ts'
// eslint-disable-next-line
import SimpleTimeline from '@/vues/components/timeline/simple-timeline/SimpleTimeline.vue'
import peopleService from '@/scripts/services/peopleService.ts'
import { useTheme } from 'vuetify/framework'

const theme = useTheme()
const route = useRoute()
const peopleStore = usePeopleStore()
const simpleTimeline = useTemplateRef('simpleTimeline')

const isInitialLoad = ref(true)
const localName = ref<string | null>('')
const isApplyingRemoteName = ref(false)
let saveNameTimeout: number | null = null

const personId = computed(() => {
  const rawId = route.params.personId
  return Array.isArray(rawId) ? rawId[0] : rawId
})

const personResponse = computed(() => {
  if (personId.value === null) return null
  return peopleStore.personMedia.get(personId.value) ?? null
})
const person = computed(() => personResponse.value?.person ?? null)
const items = computed(() => personResponse.value?.items ?? [])
const knownNames = computed(() => {
  const names = new Map<string, string>()
  for (const person of peopleStore.people) {
    const name = person.name?.trim()
    if (name && person.id !== personId.value && !names.has(name.toLocaleLowerCase())) {
      names.set(name.toLocaleLowerCase(), person.id)
    }
  }
  return [...names.entries()].map(([key, id]) => {
    const person = peopleStore.people.find((p) => p.id === id)
    return {
      title: person?.name ?? key,
      value: id,
    }
  })
})

function photoCountText(count: number) {
  return `${count.toLocaleString()} photo${count === 1 ? '' : 's'}`
}

function setLocalNameFromPerson() {
  isApplyingRemoteName.value = true
  localName.value = person.value?.name ?? ''
  nextTick(() => {
    isApplyingRemoteName.value = false
  })
}

async function saveName(name: string | null) {
  if (personId.value === null || person.value === null) return
  const trimmedName = name?.trim() ?? ''
  const currentName = person.value.name ?? ''
  const target = peopleStore.people.find(
    (p) =>
      p.id !== personId.value &&
      p.name?.trim().toLocaleLowerCase() === trimmedName.toLocaleLowerCase(),
  )

  if (target && trimmedName.length > 0) {
    const merged = await peopleStore.mergePerson(personId.value, target.id)
    if (!merged) setLocalNameFromPerson()
    return
  }

  const nextName = trimmedName.length > 0 ? trimmedName : null
  if ((nextName ?? '') === currentName) return
  const updated = await peopleStore.updatePerson(personId.value, { name: nextName })
  if (!updated) setLocalNameFromPerson()
}

function clearPendingNameSave() {
  if (saveNameTimeout === null) return
  clearTimeout(saveNameTimeout)
  saveNameTimeout = null
}

function scheduleNameSave(name: string | null) {
  clearPendingNameSave()
  saveNameTimeout = setTimeout(() => {
    saveNameTimeout = null
    saveName(name)
  }, 500)
}

function onNameBlur() {
  clearPendingNameSave()
  saveName(localName.value)
}

function onNameEnter(e: KeyboardEvent) {
  const target = e.target as HTMLElement
  target.blur()
}

async function unmerge() {
  if (personId.value === null) return
  await peopleStore.unmergePerson(personId.value)
}

watch(person, setLocalNameFromPerson, { immediate: true })

watch(localName, (newValue) => {
  if (isApplyingRemoteName.value) return
  scheduleNameSave(newValue)
})

watch(
  personId,
  () => {
    isInitialLoad.value = true
    simpleTimeline.value?.scrollToTop()
    if (personId.value === null) return
    peopleStore.fetchPeople()
    peopleStore.fetchPersonMedia(personId.value)
  },
  { immediate: true },
)

watch(personResponse, () => {
  if (personResponse.value !== null) isInitialLoad.value = false
})
</script>

<template>
  <div class="person-page">
    <simple-timeline
      ref="simpleTimeline"
      v-if="personId !== null"
      :timeline-items="items"
      :view-link="`/person/${personId}/view/`"
    >
      <div class="person-header">
        <div class="person-header-left">
          <v-avatar class="person-avatar" size="176">
            <img
              :src="peopleStore.getPhotoThumb(person, theme.current.value.dark)"
              alt="Image of person"
              v-if="person"
            />
            <img :src="peopleService.getPersonThumbnail(personId)" alt="Image of person" v-else />
          </v-avatar>
        </div>
        <div class="person-header-right">
          <div class="person-title-row">
            <v-combobox
              v-model="localName"
              :items="knownNames"
              item-title="title"
              item-value="title"
              class="name-combobox"
              variant="plain"
              hide-details
              placeholder="Unnamed"
              autocomplete="off"
              clearable
              @blur="onNameBlur"
              @keydown.enter.prevent="onNameEnter"
            />
            <!-- TODO: replace with avatar per cluster-->
            <v-btn
              v-if="person && person.faceClusterIds.length > 1"
              icon="mdi-account-multiple-remove"
              variant="tonal"
              color="warning"
              density="comfortable"
              v-tooltip:top="'Unmerge face clusters'"
              @click="unmerge"
            />
          </div>
          <p class="person-meta" v-if="person">
            <span>{{ photoCountText(person.photoCount) }}</span>
            <template v-if="person.faceClusterIds.length > 1">
              <span>•</span>
              <span>{{ person.faceClusterIds.length }} merged clusters</span>
            </template>
          </p>
        </div>
      </div>

      <div class="empty-person" v-if="items.length === 0 && !isInitialLoad">
        <v-icon color="on-surface-variant" size="170" icon="mdi-image-search-outline" />
        <h2>No photos found</h2>
      </div>
    </simple-timeline>
  </div>
</template>

<style scoped>
.person-page {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
}

.person-header {
  display: flex;
  width: 100%;
  padding: 24px 10px 34px;
}

.person-header-left {
  padding: 10px;
}

.person-avatar {
  background-color: rgba(var(--v-theme-on-background), 0.08);
}

.person-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.person-header-right {
  min-width: 0;
  flex-grow: 1;
  padding: 22px 10px 0 22px;
}

.person-title-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.name-combobox {
  max-width: 720px;
  min-width: 0;
}

.name-combobox:deep(.v-field__input) {
  font-size: 50px;
  line-height: 1.2;
  font-weight: 500;
  padding: 5px 0;
  min-height: 72px;
}

.name-combobox:deep(.v-field__clearable) {
  align-self: center;
}

.person-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  color: rgb(var(--v-theme-on-surface-variant));
}

.empty-person {
  height: 560px;
  width: 100%;
  display: flex;
  place-items: center;
  place-content: center;
  flex-direction: column;
  color: rgb(var(--v-theme-on-surface-variant));
}

.empty-person h2 {
  font-weight: 500;
  margin: 0;
}

@media (max-width: 720px) {
  .person-header {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .person-header-right {
    padding: 10px;
    width: 100%;
  }

  .person-title-row {
    justify-content: center;
  }

  .name-combobox:deep(.v-field__input) {
    font-size: 34px;
    min-height: 54px;
    text-align: center;
  }

  .person-meta {
    justify-content: center;
  }
}
</style>
