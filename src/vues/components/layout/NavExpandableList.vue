<script setup lang="ts" generic="T extends { id: string }">
import { computed, ref } from 'vue'

const props = defineProps<{
  items: T[]
  expanded: boolean
}>()

const maxShown = ref(5)

const truncatedItems = computed(() => props.items.slice(0, maxShown.value))
const hasMore = computed(() => props.items.length > maxShown.value)
</script>

<template>
  <v-expand-transition v-if="items.length > 0">
    <div v-show="expanded" class="expandable-list-container">
      <div class="expandable-list-branch">
        <slot name="item" v-for="item in truncatedItems" :key="item.id" :item="item"></slot>

        <v-btn
          density="compact"
          variant="plain"
          rounded
          color="secondary"
          v-if="hasMore"
          class="show-more-less-button ms-4"
          @click="maxShown += 5"
          >Show more</v-btn
        >
        <v-btn
          density="compact"
          variant="plain"
          rounded
          color="secondary"
          v-else-if="maxShown > 5"
          class="show-more-less-button ms-4"
          @click="maxShown = 5"
          >Show less</v-btn
        >
      </div>
    </div>
  </v-expand-transition>
</template>

<style scoped>
.expandable-list-branch {
  margin-left: 20px;
  padding-left: 5px;
  border-left: 1px solid rgba(var(--v-border-color), 0.12);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.show-more-less-button {
  font-size: 11px;
  text-transform: none;
  justify-content: start;
  width: fit-content;
}
</style>
