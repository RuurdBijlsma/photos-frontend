<script setup lang="ts">
import photoService from '@/scripts/services/photoService.ts'
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useMediaStore } from '@/scripts/stores/mediaStore.ts'
import type { TimelineItem } from '@/scripts/types/generated/timeline.ts'
import { useSelectionStore } from '@/scripts/stores/selectionStore.ts'

const mediaStore = useMediaStore()
const selectionStore = useSelectionStore()
const router = useRouter()

const props = defineProps<{
  mediaItem?: TimelineItem
  height: number
  width: number
}>()

export type SelectionPayload = { event: PointerEvent; id: string }
const emit = defineEmits<{
  (e: 'selectionClick', payload: SelectionPayload): void
}>()

const thumbnail = computed(() =>
  props.mediaItem?.id === null ? '' : photoService.getPhotoThumbnail(props.mediaItem?.id, 240),
)

async function openImage() {
  const id = props.mediaItem?.id
  if (id) await router.push({ path: `/view/${id}` })
}

const isSelected = computed(() => selectionStore.isSelected(props.mediaItem?.id!))

async function selectItem(e: PointerEvent) {
  if (e.button === 0 && !e.ctrlKey) {
    e.preventDefault()
  }
  const id = props.mediaItem?.id
  if (id) emit('selectionClick', { event: e, id })
}
</script>

<template>
  <router-link class="router-link" :to="`/view/${props.mediaItem?.id}`">
    <div
      @click="selectItem"
      @dblclick="openImage"
      @mousedown="mediaStore.fetchItem(props.mediaItem?.id)"
      class="grid-item"
      :class="{
        selected: isSelected,
      }"
      :style="{
        width: (isSelected ? width - 8 : width) + 'px',
        height: (isSelected ? height - 8 : height) + 'px',
        containIntrinsicWidth: width + 'px',
        containIntrinsicHeight: height + 'px',
        backgroundImage: `url(${thumbnail})`,
      }"
    >
      <v-fade-transition>
        <div class="check-icon" v-if="isSelected">
          <v-icon size="15">mdi-check</v-icon>
        </div>
      </v-fade-transition>
    </div>
  </router-link>
</template>

<style scoped>
.grid-item {
  background-color: rgba(255, 255, 255, 0.1);
  background-size: 100%;
  background-position: center;
  display: block;
  cursor: default;

  content-visibility: auto;
  contain: size layout paint;
  transform: translateZ(0);
  transition: 0.15s ease-in-out;
}

.selected {
  box-shadow:
    inset 0 0 0 1.5px rgba(var(--v-theme-secondary), 1),
    0 0 0 4px rgba(var(--v-theme-secondary), 0.4);
  border-radius: 20px;
  margin: 4px;
}

.check-icon {
  position: absolute;
  top: 15px;
  right: 15px;
  background-color: rgba(var(--v-theme-secondary), 1);
  border-radius: 50%;
  color: rgb(var(--v-theme-on-secondary));
  width: 25px;
  height: 25px;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>
