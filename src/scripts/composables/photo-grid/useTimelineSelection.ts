import { onMounted, onUnmounted, ref } from 'vue'
import type { GenericTimeline } from '@/scripts/services/timeline/GenericTimeline'
import type { useSelectionStore } from '@/scripts/stores/selectionStore'

export function useTimelineSelection(
  selectionStore: ReturnType<typeof useSelectionStore>,
  timelineController: GenericTimeline,
) {
  const anchorId = ref<string | null>(null)
  const lastShiftedIds = ref<Set<string>>(new Set())

  // History stores Arrays of strings (snapshots)
  const history = ref<string[][]>([[...selectionStore.selectedIds]])
  const historyIndex = ref(0)

  // --- History Management ---

  function recordHistory() {
    if (historyIndex.value < history.value.length - 1) {
      history.value = history.value.slice(0, historyIndex.value + 1)
    }
    // Convert current Set to Array for storage
    history.value.push([...selectionStore.selectedIds])
    historyIndex.value++
  }

  function applyHistoryState() {
    // Restore: Pass Array to store, store converts to Set
    const previousState = history.value[historyIndex.value]
    if (previousState) {
      selectionStore.replaceAll(previousState)
    }

    anchorId.value = null
    lastShiftedIds.value.clear()
  }

  function undo() {
    if (historyIndex.value > 0) {
      historyIndex.value--
      applyHistoryState()
    }
  }

  function redo() {
    if (historyIndex.value < history.value.length - 1) {
      historyIndex.value++
      applyHistoryState()
    }
  }

  // --- Bulk Selection Logic ---

  function selectAll() {
    // Pass Array to replaceAll
    selectionStore.replaceAll([...timelineController.ids])

    anchorId.value = null
    lastShiftedIds.value.clear()
    recordHistory()
  }

  function deselectAll() {
    selectionStore.replaceAll([]) // Empty array clears the set

    anchorId.value = null
    lastShiftedIds.value.clear()
    recordHistory()
  }

  // --- Item Selection Logic ---

  function selectItem(e: PointerEvent, id: string) {
    if (e.shiftKey && anchorId.value) {
      const currentIndex = timelineController.ids.indexOf(id)
      const anchorIndex = timelineController.ids.indexOf(anchorId.value)

      if (currentIndex !== -1 && anchorIndex !== -1) {
        const start = Math.min(currentIndex, anchorIndex)
        const end = Math.max(currentIndex, anchorIndex)

        const newRange = timelineController.ids.slice(start, end + 1)
        const newRangeSet = new Set(newRange)

        lastShiftedIds.value.forEach((oldId) => {
          if (!newRangeSet.has(oldId)) {
            selectionStore.deselect(oldId)
          }
        })

        selectionStore.selectMany(newRange)
        lastShiftedIds.value = newRangeSet
      }
    } else if (e.ctrlKey || e.metaKey) {
      selectionStore.toggleSelected(id)
      anchorId.value = id
      lastShiftedIds.value.clear()
    } else {
      // Simple click: clear others, select one
      selectionStore.replaceAll([id])
      anchorId.value = id
      lastShiftedIds.value.clear()
    }

    recordHistory()
  }

  function handleKeydown(e: KeyboardEvent) {
    const isCmdOrCtrl = e.ctrlKey || e.metaKey

    if (isCmdOrCtrl && e.key.toLowerCase() === 'z') {
      e.preventDefault()
      if (e.shiftKey) redo()
      else undo()
    }

    if (isCmdOrCtrl && e.key.toLowerCase() === 'a') {
      e.preventDefault()
      selectAll()
    }

    if (e.key === 'Escape') {
      e.preventDefault()
      deselectAll()
    }
  }

  onMounted(() => window.addEventListener('keydown', handleKeydown))
  onUnmounted(() => window.removeEventListener('keydown', handleKeydown))

  return { selectItem, selectAll, deselectAll, undo, redo }
}
