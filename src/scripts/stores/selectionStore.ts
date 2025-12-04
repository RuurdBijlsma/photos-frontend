import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSelectionStore = defineStore('selection', () => {
  const selectedIds = ref<string[]>([])

  function isSelected(id: string): boolean {
    return selectedIds.value.includes(id)
  }

  function selectMany(ids: string[]) {
    ids.forEach(select)
  }

  function deselectMany(ids: string[]) {
    ids.forEach(deselect)
  }

  function select(id: string) {
    if (!isSelected(id)) selectedIds.value.push(id)
  }

  function deselect(id: string) {
    if (isSelected(id)) selectedIds.value.splice(selectedIds.value.indexOf(id), 1)
  }

  function toggleSelected(id: string) {
    if (isSelected(id)) {
      selectedIds.value.splice(selectedIds.value.indexOf(id), 1)
    } else {
      selectedIds.value.push(id)
    }
  }

  return {
    selectedIds,
    select,
    selectMany,
    deselectMany,
    deselect,
    isSelected,
    toggleSelected,
  }
})
