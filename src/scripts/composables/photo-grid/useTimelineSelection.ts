import { onMounted, onUnmounted, ref, shallowRef, nextTick } from 'vue'
import type { GenericTimeline } from '@/scripts/services/timeline/GenericTimeline'
import type { useSelectionStore } from '@/scripts/stores/selectionStore'

export function useTimelineSelection(
  selectionStore: ReturnType<typeof useSelectionStore>,
  timelineController: GenericTimeline,
) {
  const anchorId = ref<string | null>(null)
  const lastShiftedIds = ref<Set<string>>(new Set())

  // History stores Arrays of strings (snapshots)
  const history = shallowRef<string[][]>([[...selectionStore.selectedIds]])
  const historyIndex = ref(0)

  // --- History Management ---

  // Accepts an optional explicit snapshot to avoid re-reading/converting from store
  function recordHistory(explicitSnapshot?: string[]) {
    // If we are undoing/redoing, trim the future history
    if (historyIndex.value < history.value.length - 1) {
      history.value = history.value.slice(0, historyIndex.value + 1)
    }

    // Use provided snapshot or generate one from the store
    const snapshot = explicitSnapshot || [...selectionStore.selectedIds]

    history.value.push(snapshot)
    historyIndex.value++
  }

  function applyHistoryState() {
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
    // 1. Get the source array ONCE.
    // Accessing timelineController.ids might be expensive if it's a getter,
    // so we grab it once and reuse it.
    const allIds = [...timelineController.ids]

    // 2. Update the store immediately so UI updates
    // We assume replaceAll handles conversion to Set internally
    selectionStore.replaceAll(allIds)

    anchorId.value = null
    lastShiftedIds.value.clear()

    // 3. Defer the heavy history operation to the next paint frame.
    // This allows the browser to render the checkmarks immediately,
    // eliminating the perceived freeze.
    requestAnimationFrame(() => {
      // Pass the array we already have to avoid converting Set -> Array again
      recordHistory(allIds)
    })
  }

  function deselectAll() {
    selectionStore.replaceAll([])

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
    } else {
      selectionStore.toggleSelected(id)
      if (selectionStore.isSelected(id)) anchorId.value = id

      lastShiftedIds.value.clear()
    }

    recordHistory()
  }

  // ... (Keep existing handleKeydown logic)
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
