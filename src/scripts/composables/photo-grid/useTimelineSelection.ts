import { computed, onMounted, onUnmounted, ref, shallowRef } from 'vue'
import type { GenericTimeline } from '@/scripts/services/timeline/GenericTimeline'
import type { useSelectionStore } from '@/scripts/stores/selectionStore'

export function useTimelineSelection(
  selectionStore: ReturnType<typeof useSelectionStore>,
  timelineController: GenericTimeline,
) {
  const anchorId = ref<string | null>(null)
  const lastShiftedIds = shallowRef(new Set<string>())

  // --- New State for Previews ---
  const isShiftDown = ref(false)
  const hoveredId = ref<string | null>(null)

  // rAF State
  let rafId: number | null = null
  let pendingHoverId: string | null = null

  // History state
  const history = shallowRef<string[][]>([[...selectionStore.selectedIds]])
  const historyIndex = ref(0)

  // --- Performance Optimization: ID Lookup Map ---
  const idToIndex = computed(() => {
    const map = new Map<string, number>()
    const ids = timelineController.ids
    for (let i = 0; i < ids.length; i++) {
      map.set(ids[i]!, i)
    }
    return map
  })

  // --- Preview Logic ---
  const previewState = computed(() => {
    // 1. Fast exit checks
    if (!isShiftDown.value || !anchorId.value || !hoveredId.value) {
      return { add: new Set<string>(), remove: new Set<string>() }
    }

    const map = idToIndex.value
    const idx1 = map.get(anchorId.value)
    const idx2 = map.get(hoveredId.value)

    if (idx1 === undefined || idx2 === undefined) {
      return { add: new Set<string>(), remove: new Set<string>() }
    }

    // 2. Determine Range Indices
    const start = Math.min(idx1, idx2)
    const end = Math.max(idx1, idx2)
    const ids = timelineController.ids

    const toAdd = new Set<string>()
    const toRemove = new Set<string>()

    // 3. Calculate "Blue" (Additions)
    for (let i = start; i <= end; i++) {
      const id = ids[i]!
      if (!selectionStore.isSelected(id)) {
        toAdd.add(id)
      }
    }

    // 4. Calculate "Red" (Removals)
    for (const oldId of lastShiftedIds.value) {
      const oldIdx = map.get(oldId)
      if (oldIdx !== undefined && (oldIdx < start || oldIdx > end)) {
        toRemove.add(oldId)
      }
    }

    return { add: toAdd, remove: toRemove }
  })

  // --- History Management ---

  function recordHistory(snapshot: string[] = [...selectionStore.selectedIds]) {
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
      const map = idToIndex.value
      const idx1 = map.get(anchorId.value)
      const idx2 = map.get(id)

      if (idx1 !== undefined && idx2 !== undefined) {
        const start = Math.min(idx1, idx2)
        const end = Math.max(idx1, idx2)

        const allIds = timelineController.ids
        const rangeIds = allIds.slice(start, end + 1)
        const rangeSet = new Set(rangeIds)

        const nextSelection = new Set(selectionStore.selectedIds)

        lastShiftedIds.value.forEach((old) => {
          if (!rangeSet.has(old)) nextSelection.delete(old)
        })

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
    if (e.key === 'Shift') isShiftDown.value = true

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

  function handleKeyup(e: KeyboardEvent) {
    if (e.key === 'Shift') isShiftDown.value = false
  }

  // --- rAF Throttled Hover ---
  function setHoveredId(id: string | null) {
    // If not selecting or no anchor, we can skip the rAF entirely to save frames
    if (!isShiftDown.value || !anchorId.value) {
      hoveredId.value = null
      return
    }

    pendingHoverId = id

    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        // Only trigger reactivity if the ID actually changed
        if (hoveredId.value !== pendingHoverId) {
          hoveredId.value = pendingHoverId
        }
        rafId = null
      })
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeydown)
    window.addEventListener('keyup', handleKeyup)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown)
    window.removeEventListener('keyup', handleKeyup)
    if (rafId !== null) cancelAnimationFrame(rafId)
  })

  return {
    selectItem,
    selectAll,
    deselectAll,
    undo: () => applyHistory(-1),
    redo: () => applyHistory(1),
    setHoveredId,
    previewAddIds: computed(() => previewState.value.add),
    previewRemoveIds: computed(() => previewState.value.remove),
  }
}
