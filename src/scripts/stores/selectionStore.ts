import { defineStore } from 'pinia'
import { computed, ref, shallowRef, triggerRef } from 'vue'

export const useSelectionStore = defineStore('selection', () => {
  // --- Selection State ---
  const ids = shallowRef(new Set<string>())

  // --- History State ---
  // Initialize with one empty state
  const history = shallowRef<string[][]>([[]])
  const historyIndex = ref(0)

  // --- Getters ---
  const size = computed(() => ids.value.size)
  const isSelected = (id: string) => ids.value.has(id)
  const canUndo = computed(() => historyIndex.value > 0)
  const canRedo = computed(() => historyIndex.value < history.value.length - 1)

  // --- Core Mutations ---
  function replaceAll(items: Iterable<string> | Set<string>) {
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
    if (s.size !== initialSize) triggerRef(ids)
  }

  function deselect(id: string) {
    if (ids.value.delete(id)) triggerRef(ids)
  }

  // --- History Actions ---
  function commit() {
    // If we are in the middle of history, slice off the future
    if (historyIndex.value < history.value.length - 1) {
      history.value = history.value.slice(0, historyIndex.value + 1)
    }

    // Push new snapshot
    history.value.push([...ids.value])
    historyIndex.value++
  }

  function undo() {
    if (canUndo.value) {
      historyIndex.value--
      replaceAll(history.value[historyIndex.value]!)
    }
  }

  function redo() {
    if (canRedo.value) {
      historyIndex.value++
      replaceAll(history.value[historyIndex.value]!)
    }
  }

  return {
    // State
    selectedIds: ids,
    size,

    // Checks
    isSelected,
    canUndo,
    canRedo,

    // Actions
    replaceAll,
    toggleSelected,
    selectMany,
    deselect,
    trigger: () => triggerRef(ids),

    // History
    commit,
    undo,
    redo,
  }
})
