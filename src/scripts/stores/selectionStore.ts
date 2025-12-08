import { defineStore } from 'pinia'
import { computed, shallowRef, triggerRef } from 'vue'

export const useSelectionStore = defineStore('selection', () => {
  const ids = shallowRef(new Set<string>())

  const size = computed(() => ids.value.size)
  const isSelected = (id: string) => ids.value.has(id)

  function replaceAll(items: Iterable<string>) {
    // Assigning to .value automatically triggers shallow reactivity
    ids.value = items instanceof Set ? items : new Set(items)
  }

  function toggleSelected(id: string) {
    const s = ids.value
    if (s.has(id)) {
      s.delete(id)
    } else {
      s.add(id)
    }
    triggerRef(ids)
  }

  function selectMany(items: string[]) {
    const s = ids.value
    const initialSize = s.size
    for (const id of items) s.add(id)

    // Only trigger if size changed to avoid unnecessary renders
    if (s.size !== initialSize) triggerRef(ids)
  }

  function deselect(id: string) {
    // .delete returns true if element existed
    if (ids.value.delete(id)) triggerRef(ids)
  }

  return {
    selectedIds: ids,
    size,
    isSelected,
    replaceAll,
    toggleSelected,
    selectMany,
    deselect,
    trigger: () => triggerRef(ids),
  }
})
