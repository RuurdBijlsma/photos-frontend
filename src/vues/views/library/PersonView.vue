<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useTheme } from 'vuetify/framework'
import { usePeopleStore } from '@/scripts/stores/peopleStore.ts'
import type { PersonInfo } from '@/scripts/types/generated/timeline.ts'
// eslint-disable-next-line
import SimpleTimeline from '@/vues/components/timeline/simple-timeline/SimpleTimeline.vue'
import peopleService from '@/scripts/services/peopleService.ts'

const theme = useTheme()
const route = useRoute()
const peopleStore = usePeopleStore()
const simpleTimeline = useTemplateRef('simpleTimeline')

const isInitialLoad = ref(true)
const fetched = ref(false)
const nameDialogVisible = ref(false)
const mergeDialogVisible = ref(false)
const draftName = ref<string | PersonInfo | null>('')
const pendingMergeTarget = ref<PersonInfo | null>(null)
const isSavingName = ref(false)
const isMerging = ref(false)

const personId = computed(() => {
  const rawId = route.params.personId
  return Array.isArray(rawId) ? rawId[0] : rawId
})

const personResponse = computed(() => {
  if (!personId.value) return null
  return peopleStore.personMedia.get(personId.value) ?? null
})
const person = computed(() => personResponse.value?.person ?? null)
const items = computed(() => personResponse.value?.items ?? [])
const namedPeople = computed(() => {
  return peopleStore.people
    .filter((person) => person.id !== personId.value && person.name?.trim())
    .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
})

function photoCountText(count: number) {
  return `${count.toLocaleString()} photo${count === 1 ? '' : 's'}`
}

function openNameDialog() {
  draftName.value = person.value?.name ?? ''
  pendingMergeTarget.value = null
  nameDialogVisible.value = true
}

function closeNameDialog() {
  nameDialogVisible.value = false
  pendingMergeTarget.value = null
  draftName.value = person.value?.name ?? ''
}

function getDraftName() {
  if (typeof draftName.value === 'string') return draftName.value.trim()
  return draftName.value?.name?.trim() ?? ''
}

function suggestionItemProps(props: Record<string, unknown>) {
  const itemProps = { ...props }
  delete itemProps.title
  delete itemProps.subtitle
  return itemProps
}

async function submitNameDialog() {
  if (!personId.value || !person.value || isSavingName.value) return

  const trimmedName = getDraftName()
  const currentName = person.value.name ?? ''
  const target = namedPeople.value.find(
    (person) => person.name?.trim().toLocaleLowerCase() === trimmedName.toLocaleLowerCase(),
  )

  const nextName = trimmedName.length > 0 ? trimmedName : null
  if ((nextName ?? '') === currentName) {
    closeNameDialog()
    return
  }

  isSavingName.value = true
  const updated = await peopleStore.updatePerson(personId.value, { name: nextName })
  isSavingName.value = false

  if (target && trimmedName.length > 0) {
    pendingMergeTarget.value = target
    nameDialogVisible.value = false
    mergeDialogVisible.value = true
    return
  }
  if (updated) closeNameDialog()
}

async function cancelMerge() {
  if (!personId.value || !person.value || isSavingName.value) return
  const trimmedName = getDraftName()
  const currentName = person.value.name ?? ''
  const nextName = trimmedName.length > 0 ? trimmedName : null

  if ((nextName ?? '') !== currentName) {
    isSavingName.value = true
    const updated = await peopleStore.updatePerson(personId.value, { name: nextName })
    isSavingName.value = false
    if (!updated) return
  }

  mergeDialogVisible.value = false
  pendingMergeTarget.value = null
}

async function confirmMerge() {
  if (!personId.value || !pendingMergeTarget.value || isMerging.value) return
  isMerging.value = true
  const merged = await peopleStore.mergePerson(personId.value, pendingMergeTarget.value.id)
  isMerging.value = false
  if (merged) {
    mergeDialogVisible.value = false
    pendingMergeTarget.value = null
  }
}

async function unmerge() {
  if (!personId.value) return
  await peopleStore.unmergePerson(personId.value)
}

async function setMainPhoto(clusterId: string) {
  if (!personId.value || !person.value || person.value.faceThumbId === clusterId) return
  await peopleStore.updatePerson(personId.value, { faceThumbId: clusterId })
}

watch(
  personId,
  () => {
    isInitialLoad.value = true
    simpleTimeline.value?.scrollToTop()
    if (!personId.value) return
    peopleStore.fetchPeople()
    peopleStore.fetchPersonMedia(personId.value).then(() => (fetched.value = true))
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
      v-if="personId"
      :timeline-items="items"
      :view-link="`/person/${personId}/view/`"
    >
      <div class="person-header" v-if="fetched">
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
            <h1
              :class="{ unnamed: !person?.name, clickable: !person?.name }"
              @click="!person?.name ? openNameDialog() : undefined"
            >
              {{ person?.name || 'Unnamed' }}
            </h1>
            <v-btn
              icon="mdi-pencil"
              variant="tonal"
              color="primary"
              density="comfortable"
              v-tooltip:top="person?.name ? 'Edit name' : 'Set name'"
              @click="openNameDialog"
            />
          </div>
          <p class="person-meta" v-if="person">
            <span>{{ photoCountText(person.photoCount) }}</span>
          </p>

          <div class="subclusters" v-if="person && person.faceClusterIds.length > 1">
            <v-avatar
              v-for="clusterId in person.faceClusterIds"
              :key="clusterId"
              size="42"
              class="subcluster-avatar"
              :class="{ 'avatar-pointer': person.faceThumbId !== clusterId }"
              v-tooltip="{
                location: 'top',
                text: 'Use as main photo',
                disabled: person.faceThumbId === clusterId,
              }"
              v-ripple="person.faceThumbId !== clusterId"
              @click="person.faceThumbId === clusterId ? undefined : setMainPhoto(clusterId)"
            >
              <img
                :style="{ pointerEvents: 'none' }"
                :src="peopleService.getFaceThumbnail(clusterId)"
                alt=""
              />
            </v-avatar>
            <v-btn
              size="42"
              v-if="person && person.faceClusterIds.length > 1"
              icon="mdi-account-multiple-remove"
              variant="tonal"
              color="tertiary"
              density="comfortable"
              v-tooltip:top="'Separate merged people'"
              @click="unmerge"
            />
          </div>
        </div>
      </div>
      <div v-else class="loading-header">
        <v-lazy>
          <div class="center-loading">
            <v-progress-circular color="primary" indeterminate size="70" />
            <h2>Loading...</h2>
          </div>
        </v-lazy>
      </div>

      <div class="empty-person" v-if="items.length === 0 && !isInitialLoad">
        <v-icon color="on-surface-variant" size="170" icon="mdi-image-search-outline" />
        <h2>No photos found</h2>
      </div>
    </simple-timeline>

    <v-dialog v-model="nameDialogVisible" max-width="520">
      <v-card rounded="xl" color="surface-container" class="name-dialog">
        <v-card-title class="dialog-title">
          <v-icon icon="mdi-account-edit" class="dialog-title-icon" />
          <span>Edit person name</span>
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" density="comfortable" @click="closeNameDialog" />
        </v-card-title>

        <v-card-text class="dialog-content">
          <v-combobox
            v-model="draftName"
            :items="namedPeople"
            item-title="name"
            item-value="name"
            label="Name"
            placeholder="Unnamed"
            name="person-name-edit"
            autocomplete="off"
            autofocus
            clearable
            color="primary"
            variant="outlined"
            hide-details
            @keydown.enter.prevent="submitNameDialog"
          >
            <template v-slot:item="{ props, item }">
              <v-list-item v-bind="suggestionItemProps(props)" class="person-suggestion">
                <template v-slot:prepend>
                  <v-avatar size="36">
                    <img :src="peopleStore.getPhotoThumb(item, theme.current.value.dark)" alt="" />
                  </v-avatar>
                </template>
                <v-list-item-title>{{ item.name }}</v-list-item-title>
                <v-list-item-subtitle>
                  {{ photoCountText(item.photoCount) }}
                </v-list-item-subtitle>
              </v-list-item>
            </template>
          </v-combobox>
        </v-card-text>

        <v-divider />

        <v-card-actions class="dialog-actions">
          <v-spacer />
          <v-btn variant="text" rounded="lg" @click="closeNameDialog">Cancel</v-btn>
          <v-btn
            color="primary"
            variant="tonal"
            rounded="lg"
            :loading="isSavingName"
            @click="submitNameDialog"
          >
            Save
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="mergeDialogVisible" max-width="460" persistent>
      <v-card rounded="xl" color="surface-container" v-if="pendingMergeTarget">
        <v-card-title class="dialog-title">
          <v-icon icon="mdi-account-multiple-plus" class="dialog-title-icon" />
          <span>Merge people?</span>
        </v-card-title>

        <v-card-text class="dialog-content merge-dialog-body">
          <v-avatar size="82">
            <img
              :src="peopleStore.getPhotoThumb(pendingMergeTarget, theme.current.value.dark)"
              alt=""
            />
          </v-avatar>
          <div>
            <p>
              Do you want to merge this person with
              <strong>{{ pendingMergeTarget.name }}</strong
              >?
            </p>
            <p class="merge-subtitle">{{ photoCountText(pendingMergeTarget.photoCount) }}</p>
          </div>
        </v-card-text>

        <v-divider />

        <v-card-actions class="dialog-actions">
          <v-spacer />
          <v-btn variant="text" rounded="lg" @click="cancelMerge">No</v-btn>
          <v-btn
            color="primary"
            variant="tonal"
            rounded="lg"
            :loading="isMerging"
            @click="confirmMerge"
          >
            Yes, merge
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
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
  margin-bottom: 12px;
}

.loading-header {
  height: 196px;
  width: 100%;
  margin-bottom: 12px;
  display: flex;
  place-content: center;
  place-items: center;
}

.center-loading {
  text-align: center;
}

.center-loading h2{
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface-variant));
  font-size: 20px;
  margin-top:10px;
}

.person-header-left {
  padding: 10px;
}

.person-avatar {
  background-color: rgba(var(--v-theme-on-background), 0.08);
}

.person-avatar img,
.subcluster-avatar img,
.person-suggestion img,
.merge-dialog-body img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.person-header-right {
  min-width: 0;
  flex-grow: 1;
  padding: 20px;
}

.person-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.person-title-row h1 {
  min-width: 0;
  font-size: 50px;
  line-height: 1.2;
  font-weight: 500;
  margin: 0;
  overflow-wrap: anywhere;
}

.person-title-row h1.unnamed {
  color: rgb(var(--v-theme-on-surface-variant));
  font-style: italic;
  font-weight: 400;
}

.person-title-row h1.clickable {
  cursor: pointer;
}

.person-title-row h1.clickable:hover {
  color: rgb(var(--v-theme-primary));
}

.person-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 8px 0 0;
  color: rgb(var(--v-theme-on-surface-variant));
}

.subclusters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 18px;
  align-items: center;
}

.subcluster-avatar {
  background-color: rgba(var(--v-theme-on-background), 0.08);
  box-shadow: 0 0 0 2px rgb(var(--v-theme-background));
}

.avatar-pointer {
  cursor: pointer;
}

.dialog-title {
  display: flex;
  align-items: center;
  background-color: rgb(var(--v-theme-surface-variant));
  font-size: 1.25rem;
  font-weight: 500;
  line-height: 2rem;
  padding: 12px 16px;
}

.dialog-title-icon {
  margin-right: 12px;
}

.dialog-content {
  padding: 24px;
}

.dialog-actions {
  padding: 12px;
}

.name-dialog:deep(.v-field__input) {
  min-height: 48px;
}

.name-dialog:deep(.v-field),
.name-dialog:deep(.v-field__input),
.name-dialog:deep(input) {
  cursor: text;
}

.person-suggestion:deep(.v-list-item__content) {
  min-width: 0;
}

.merge-dialog-body {
  display: flex;
  align-items: center;
  gap: 18px;
}

.merge-dialog-body p {
  margin: 0;
}

.merge-subtitle {
  color: rgb(var(--v-theme-on-surface-variant));
  font-size: 0.9rem;
  margin-top: 4px !important;
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
    align-items: center;
    flex-direction: column;
  }

  .person-title-row h1 {
    font-size: 34px;
  }

  .person-meta,
  .subclusters {
    justify-content: center;
  }
}
</style>
