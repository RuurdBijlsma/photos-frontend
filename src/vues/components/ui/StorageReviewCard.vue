<script setup lang="ts">
import { computed } from 'vue'
import type { StorageReviewItem } from '@/scripts/types/generated/timeline.ts'
import mediaItemService from '@/scripts/services/mediaItemService.ts'
import { prettyBytes, toHms } from '@/scripts/utils.ts'

const props = defineProps<{
  item: StorageReviewItem
  basePath: string
  tileWidth: number
  isSelected: boolean
  isDownloading: boolean
  actionLoading: boolean
  batchDownloading: boolean
}>()

const emit = defineEmits(['toggle', 'download', 'delete'])

// Compute formatted string representations once and cache them in Vue
const formattedSize = computed(() => prettyBytes(props.item.sizeBytes))
const formattedDuration = computed(() => toHms((props.item.durationMs ?? 0) / 1000))

const formattedDate = computed(() => {
  const date = new Date(props.item.takenAtLocal)
  if (Number.isNaN(date.getTime())) return 'Unknown date'
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
})

const roundedScore = computed(() =>
  props.item.weightedScore !== undefined ? Math.round(props.item.weightedScore) : null,
)
</script>

<template>
  <article class="review-item" :style="{ width: `${tileWidth}px` }">
    <div class="thumb-container">
      <router-link class="thumb-link" :to="`${basePath}/view/${item.id}`">
        <img
          decoding="async"
          loading="lazy"
          :src="mediaItemService.getPhotoThumbnail(item.id, 240, !item.hasThumbnails)"
          class="thumbnail-img"
        />
        <div class="video-chip" v-if="item.isVideo">
          <v-icon icon="mdi-play" size="16" />
          <span>{{ formattedDuration }}</span>
        </div>
      </router-link>

      <!-- Replaced v-btn with lightweight native button -->
      <button
        type="button"
        class="select-overlay-btn"
        :class="{ 'is-selected': isSelected }"
        @click.stop="emit('toggle')"
      >
        <v-icon
          :icon="isSelected ? 'mdi-checkbox-marked-circle' : 'mdi-checkbox-blank-circle-outline'"
          size="20"
        />
      </button>
    </div>

    <div class="item-info">
      <div class="meta">
        <strong>{{ formattedSize }}</strong>
        <span>{{ item.filename }}</span>
        <span>{{ formattedDate }}</span>
        <span v-if="roundedScore !== null"> Quality {{ roundedScore }} </span>
      </div>
      <div class="item-actions">
        <!-- Native buttons bypass framework wrapper initialization weight -->
        <button
          type="button"
          class="action-btn download"
          :disabled="isDownloading || batchDownloading"
          title="Download original"
          @click="emit('download')"
        >
          <v-icon v-if="!isDownloading" icon="mdi-download" color="primary" size="20" />
          <v-progress-circular v-else indeterminate color="primary" size="16" width="2" />
        </button>
        <button
          type="button"
          class="action-btn delete"
          :disabled="isDownloading || actionLoading || batchDownloading"
          title="Move to bin"
          @click="emit('delete')"
        >
          <v-icon icon="mdi-delete" color="error" size="20" />
        </button>
      </div>
    </div>
  </article>
</template>

<style scoped>
.review-item {
  height: 100%;
  overflow: hidden;
  border-radius: 28px;
  background: rgb(var(--v-theme-surface-container));
  transition:
    background-color 0.16s ease,
    box-shadow 0.16s ease;
}

.thumb-container {
  position: relative;
  height: 210px;
  overflow: hidden;
  border-radius: 28px;
}

.thumb-link {
  display: block;
  height: calc(100% - 16px);
  width: calc(100% - 16px);
  margin: 8px;
  border-radius: 20px;
  overflow: hidden;
  background: rgba(var(--v-theme-on-surface), 0.05);
}

.thumbnail-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.select-overlay-btn {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 2;
  color: rgba(255, 255, 255, 0.85);
  background: rgba(0, 0, 0, 0.35);
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    color 0.15s ease,
    transform 0.15s ease;
}

.select-overlay-btn:hover {
  background: rgba(0, 0, 0, 0.6);
  transform: scale(1.05);
}

.select-overlay-btn.is-selected {
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
}

.video-chip {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  align-items: center;
  gap: 3px;
  color: white;
  background: rgba(0, 0, 0, 0.62);
  border-radius: 999px;
  padding: 4px 9px;
  font-size: 0.78rem;
}

.item-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
}

.meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.meta strong {
  font-size: 1rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.meta span {
  color: rgb(var(--v-theme-on-surface-variant));
  font-size: 0.8rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-actions {
  display: flex;
  flex-shrink: 0;
  gap: 6px;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: transparent;
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}

.action-btn:hover:not(:disabled) {
  background: rgba(var(--v-theme-on-surface), 0.08);
}

.action-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
