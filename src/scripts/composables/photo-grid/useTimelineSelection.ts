import { computed, onMounted, onUnmounted, ref, shallowRef } from 'vue'
import type { GenericTimeline } from '@/scripts/services/timeline/GenericTimeline'
import type { useSelectionStore } from '@/scripts/stores/selectionStore'

export function useTimelineSelection(
  store: ReturnType<typeof useSelectionStore>,
  timeline: GenericTimeline,
) {
  // --- Local Interaction State ---
  const anchorId = ref<string | null>(null)
  const lastShiftedIds = shallowRef(new Set<string>())
  const isShiftDown = ref(false)

  // --- Hover / Preview State ---
  const hoveredId = ref<string | null>(null)
  let rafId: number | null = null
  let pendingHoverId: string | null = null

  // --- Optimization: ID Lookup ---
  const idToIdx = computed(() => {
    const map = new Map<string, number>()
    timeline.ids.forEach((id, i) => map.set(id, i))
    return map
  })

  const getRange = (idA: string, idB: string): [number, number] | null => {
    const idxA = idToIdx.value.get(idA)
    const idxB = idToIdx.value.get(idB)
    return idxA === undefined || idxB === undefined
      ? null
      : [Math.min(idxA, idxB), Math.max(idxA, idxB)]
  }

  // --- Computed Preview ---
  const previewState = computed(() => {
    const empty = { add: new Set<string>(), remove: new Set<string>() }
    if (!isShiftDown.value || !anchorId.value || !hoveredId.value) return empty

    const range = getRange(anchorId.value, hoveredId.value)
    if (!range) return empty

    const [start, end] = range
    const toAdd = new Set<string>()
    const toRemove = new Set<string>()

    // 1. Items to Add
    for (let i = start; i <= end; i++) {
      const id = timeline.ids[i]!
      if (!store.isSelected(id)) toAdd.add(id)
    }

    // 2. Items to Remove (shrinkage)
    for (const oldId of lastShiftedIds.value) {
      const idx = idToIdx.value.get(oldId)
      if (idx !== undefined && (idx < start || idx > end)) {
        toRemove.add(oldId)
      }
    }

    return { add: toAdd, remove: toRemove }
  })

  // --- Actions ---
  function selectAll() {
    store.replaceAll([...timeline.ids])
    anchorId.value = null
    lastShiftedIds.value.clear()
    store.commit()
  }

  function deselectAll() {
    store.replaceAll([])
    anchorId.value = null
    lastShiftedIds.value.clear()
    store.commit()
  }

  function selectItem(e: PointerEvent, id: string) {
    // 1. Shift Selection
    if (e.shiftKey && anchorId.value) {
      const range = getRange(anchorId.value, id)
      if (!range) return

      const [start, end] = range
      const rangeIds = timeline.ids.slice(start, end + 1)
      const rangeSet = new Set(rangeIds)
      const nextSelection = new Set(store.selectedIds)

      // Remove items from previous shift that are no longer in range
      lastShiftedIds.value.forEach((old) => {
        if (!rangeSet.has(old)) nextSelection.delete(old)
      })

      // Add current range items
      rangeIds.forEach((newId) => nextSelection.add(newId))

      store.replaceAll(nextSelection)
      lastShiftedIds.value = rangeSet
    }
    // 2. Normal Toggle
    else {
      store.toggleSelected(id)
      anchorId.value = store.isSelected(id) ? id : null
      lastShiftedIds.value.clear()
    }

    // Defer history commit slightly to keep UI click response snappy
    requestAnimationFrame(() => store.commit())
  }

  // --- Event Handlers ---
  function setHoveredId(id: string | null) {
    if (!isShiftDown.value || !anchorId.value) {
      hoveredId.value = null
      return
    }
    pendingHoverId = id
    if (!rafId) {
      rafId = requestAnimationFrame(() => {
        if (hoveredId.value !== pendingHoverId) hoveredId.value = pendingHoverId
        rafId = null
      })
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Shift') isShiftDown.value = true

    const isCmd = e.ctrlKey || e.metaKey
    if (!isCmd && e.key !== 'Escape') return

    switch (e.key.toLowerCase()) {
      case 'z':
        e.preventDefault()
        if (e.shiftKey) {
          store.redo()
        } else {
          store.undo()
        }
        break
      case 'a':
        e.preventDefault()
        selectAll()
        break
      case 'escape':
        e.preventDefault()
        deselectAll()
        break
    }
  }

  // --- Lifecycle ---
  onMounted(() => {
    window.addEventListener('keydown', handleKeydown)
    window.addEventListener('keyup', (e) => e.key === 'Shift' && (isShiftDown.value = false))
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown)
    if (rafId) cancelAnimationFrame(rafId)
  })

  return {
    selectItem,
    selectAll,
    deselectAll,
    setHoveredId,
    previewAddIds: computed(() => previewState.value.add),
    previewRemoveIds: computed(() => previewState.value.remove),
  }
}
