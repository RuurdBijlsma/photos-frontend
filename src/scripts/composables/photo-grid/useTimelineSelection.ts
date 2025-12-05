import { onMounted, onUnmounted, ref } from 'vue'
import type { GenericTimeline } from '@/scripts/services/timeline/GenericTimeline'
import type { useSelectionStore } from '@/scripts/stores/selectionStore'

/**
 * Manages selection logic including:
 * - Simple Click: Select single (reset others)
 * - Ctrl+Click: Toggle selection
 * - Shift+Click: Range selection
 * - Undo/Redo history stack via Keyboard (Ctrl+Z / Ctrl+Shift+Z)
 */
export function useTimelineSelection(
  selectionStore: ReturnType<typeof useSelectionStore>,
  timelineController: GenericTimeline
) {
  // --- State ---
  const anchorId = ref<string | null>(null)
  const lastShiftedIds = ref<Set<string>>(new Set())

  // History State
  // Initialize with current selection to ensure we have a base state
  const history = ref<string[][]>([[...selectionStore.selectedIds]])
  const historyIndex = ref(0)

  // --- History Management ---

  /**
   * Saves the current state of the selection store to history.
   * Should be called BEFORE modifying the selection.
   */
  function recordHistory() {
    // 1. If we are in the middle of the history stack (due to undos),
    //    we discard the "future" states before adding a new one.
    if (historyIndex.value < history.value.length - 1) {
      history.value = history.value.slice(0, historyIndex.value + 1)
    }

    // 2. Push the current state (clone the array)
    history.value.push([...selectionStore.selectedIds])

    // 3. Move pointer to end
    historyIndex.value++
  }

  function applyHistoryState() {
    // Restore selection from history
    selectionStore.selectedIds = history.value[historyIndex.value]!

    // Reset shift-click logic variables to prevent ghost anchors
    anchorId.value = null
    lastShiftedIds.value.clear()

    // Ensure UI reacts
    selectionStore.trigger()
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

  // --- Selection Logic ---

  function selectItem(e: PointerEvent, id: string) {
    // 1. Save state BEFORE changing anything
    recordHistory()

    // 2. Shift Selection Logic
    if (e.shiftKey && anchorId.value) {
      const currentIndex = timelineController.ids.indexOf(id)
      const anchorIndex = timelineController.ids.indexOf(anchorId.value)

      if (currentIndex !== -1 && anchorIndex !== -1) {
        const start = Math.min(currentIndex, anchorIndex)
        const end = Math.max(currentIndex, anchorIndex)

        // Get the slice of IDs between the anchor and current click
        const newRange = timelineController.ids.slice(start, end + 1)
        const newRangeSet = new Set(newRange)

        // Deselect items that were part of the previous shift-selection
        // but are NOT part of the new range (user shrank the range)
        lastShiftedIds.value.forEach((oldId) => {
          if (!newRangeSet.has(oldId)) {
            selectionStore.deselect(oldId)
          }
        })

        // Select the new range
        selectionStore.selectMany(newRange)
        lastShiftedIds.value = newRangeSet
      }
    }
    // 3. Ctrl / Meta Selection Logic (Toggle specific item, keep others)
    else if (e.ctrlKey || e.metaKey) {
      selectionStore.toggleSelected(id)
      anchorId.value = id
      lastShiftedIds.value.clear()
    }
    // 4. Normal Selection Logic (Reset all, select specific item)
    else {
      // Clear existing selection and select only this one
      selectionStore.selectedIds = [id]
      anchorId.value = id
      lastShiftedIds.value.clear()
    }

    selectionStore.trigger()
  }

  // --- Keyboard Listeners ---

  function handleKeydown(e: KeyboardEvent) {
    // Check for Ctrl (Windows/Linux) or Command (Mac)
    const isCmdOrCtrl = e.ctrlKey || e.metaKey

    if (isCmdOrCtrl && e.key.toLowerCase() === 'z') {
      e.preventDefault() // Prevent browser native undo

      if (e.shiftKey) {
        redo()
      } else {
        undo()
      }
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeydown)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown)
  })

  return {
    selectItem,
    undo,
    redo
  }
}
