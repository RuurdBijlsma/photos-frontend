import { onMounted, onUnmounted, ref, shallowRef } from 'vue'
import type { GenericTimeline } from '@/scripts/services/timeline/GenericTimeline'
import type { useSelectionStore } from '@/scripts/stores/selectionStore'

export function useTimelineSelection(
  selectionStore: ReturnType<typeof useSelectionStore>,
  timelineController: GenericTimeline,
) {
  const anchorId = ref<string | null>(null)
  const lastShiftedIds = shallowRef(new Set<string>())

  // History state
  const history = shallowRef<string[][]>([[...selectionStore.selectedIds]])
  const historyIndex = ref(0)

  // --- History Management ---

  function recordHistory(snapshot: string[] = [...selectionStore.selectedIds]) {
    // Truncate future history if we are in the middle of the stack
    if (historyIndex.value < history.value.length - 1) {
      history.value = history.value.slice(0, historyIndex.value + 1)
    }
    history.value.push(snapshot)
    historyIndex.value++
  }

  function applyHistory(offset: number) {
    const newIndex = historyIndex.value + offset
    if (newIndex >= 0 && newIndex < history.value.length) {
      historyIndex.value = newIndex
      selectionStore.replaceAll(history.value[newIndex]!)
      anchorId.value = null
      lastShiftedIds.value.clear()
    }
  }

  // --- Actions ---

  function selectAll() {
    const allIds = [...timelineController.ids]
    selectionStore.replaceAll(allIds)
    anchorId.value = null
    lastShiftedIds.value.clear()

    // Defer history recording to keep UI responsive
    requestAnimationFrame(() => recordHistory(allIds))
  }

  function deselectAll() {
    selectionStore.replaceAll([])
    anchorId.value = null
    lastShiftedIds.value.clear()
    recordHistory()
  }

  function selectItem(e: PointerEvent, id: string) {
    // 1. Shift + Click (Range Selection)
    if (e.shiftKey && anchorId.value) {
      const allIds = timelineController.ids
      const idx1 = allIds.indexOf(anchorId.value)
      const idx2 = allIds.indexOf(id)

      if (idx1 !== -1 && idx2 !== -1) {
        const start = Math.min(idx1, idx2)
        const end = Math.max(idx1, idx2)
        const rangeIds = allIds.slice(start, end + 1)
        const rangeSet = new Set(rangeIds)

        // Optimization: Clone current set, remove stale shifted items, add new range
        const nextSelection = new Set(selectionStore.selectedIds)
        lastShiftedIds.value.forEach((old) => !rangeSet.has(old) && nextSelection.delete(old))
        rangeIds.forEach((newId) => nextSelection.add(newId))

        selectionStore.replaceAll(nextSelection)
        lastShiftedIds.value = rangeSet
      }
    }
    // 2. Normal Click (Toggle)
    else {
      selectionStore.toggleSelected(id)
      anchorId.value = selectionStore.isSelected(id) ? id : null
      lastShiftedIds.value.clear()
    }

    recordHistory()
  }

  function handleKeydown(e: KeyboardEvent) {
    const isCmd = e.ctrlKey || e.metaKey
    if (!isCmd && e.key !== 'Escape') return

    const key = e.key.toLowerCase()

    if (key === 'z') {
      e.preventDefault()
      if (e.shiftKey) {
        applyHistory(1)
      } else {
        applyHistory(-1)
      }
    } else if (key === 'a') {
      e.preventDefault()
      selectAll()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      deselectAll()
    }
  }

  onMounted(() => window.addEventListener('keydown', handleKeydown))
  onUnmounted(() => window.removeEventListener('keydown', handleKeydown))

  return {
    selectItem,
    selectAll,
    deselectAll,
    undo: () => applyHistory(-1),
    redo: () => applyHistory(1),
  }
}
