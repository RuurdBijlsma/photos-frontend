import { defineStore } from 'pinia'
import { computed, shallowRef, triggerRef } from 'vue'

export const useSelectionStore = defineStore('selection', () => {
  const allIds = shallowRef<string[]>([])
  const selection = shallowRef(new Set<string>())
  const isSelecting = computed(() => selection.value.size > 0)
  let anchorId: string | null = null

  function toggleSelection(id: string) {
    if (selection.value.has(id)) selection.value.delete(id)
    else selection.value.add(id)
    anchorId = id
    triggerRef(selection)
  }

  function selectAll() {
    selection.value = new Set(allIds.value)
    anchorId = null
  }

  function deselectAll() {
    selection.value = new Set()
    anchorId = null
  }

  function selectSpan(id: string) {
    if (anchorId === null) return toggleSelection(id)

    let indexA = allIds.value.indexOf(id)
    let indexB = allIds.value.indexOf(anchorId)
    if (indexA > indexB) {
      ;[indexA, indexB] = [indexB, indexA]
    }
    anchorId = id
    const selectionSlice = allIds.value.slice(indexA, indexB + 1)
    let allSelected = true
    for (const spanId of selectionSlice) {
      if (!selection.value.has(spanId)) {
        allSelected = false
        break
      }
    }
    if (!allSelected)
      for (const spanId of selectionSlice) {
        selection.value.add(spanId)
      }
    else {
      for (const spanId of selectionSlice) {
        selection.value.delete(spanId)
      }
      selection.value.add(id)
    }
    triggerRef(selection)
  }

  return {
    allIds,
    selection,
    isSelecting,

    toggleSelection,
    selectAll,
    deselectAll,
    selectSpan,
  }
})
