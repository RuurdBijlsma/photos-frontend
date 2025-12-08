import { defineStore } from 'pinia'
import { computed, shallowRef, triggerRef } from 'vue'

export const useSelectionStore = defineStore('selection', () => {
  // 1. State: Use shallowRef for maximum performance with large collections
  const ids = shallowRef(new Set<string>())

  // 2. Getters
  const size = computed(() => ids.value.size)

  // Efficient check for templates
  const isSelected = (id: string) => ids.value.has(id)

  // 3. Actions

  // Replaces the entire selection (Used for History Undo/Redo, Select All)
  function replaceAll(newIds: string[] | Set<string>) {
    // Directly assign if it is a set, otherwise construct
    if (newIds instanceof Set) {
      ids.value = newIds
    } else {
      ids.value = new Set(newIds)
    }
    triggerRef(ids)
  }

  function toggleSelected(id: string) {
    if (ids.value.has(id)) {
      ids.value.delete(id)
    } else {
      ids.value.add(id)
    }
    triggerRef(ids)
  }

  function selectMany(items: string[]) {
    let changed = false
    const s = ids.value
    for (const id of items) {
      if (!s.has(id)) {
        s.add(id)
        changed = true
      }
    }
    if (changed) triggerRef(ids)
  }

  function deselect(id: string) {
    if (ids.value.has(id)) {
      ids.value.delete(id)
      triggerRef(ids)
    }
  }

  // Force a UI update manually (rarely needed)
  function trigger() {
    triggerRef(ids)
  }

  return {
    selectedIds: ids, // Expose the Ref directly
    size,
    isSelected,
    replaceAll,
    toggleSelected,
    selectMany,
    deselect,
    trigger,
  }
})
