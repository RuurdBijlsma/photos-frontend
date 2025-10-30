import { computed, type Ref, ref } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { CURRENT_YEAR, DAYS, MONTHS } from '@/script/constants.ts'

export function useDateOverlay(rowInViewDate: Ref<Date | null>) {
  const hoverDate = ref<Date | null>(null)
  const scrollOverride = ref(false)
  const restoreOverride = useDebounceFn(() => (scrollOverride.value = false), 500)

  function activateScrollOverride() {
    scrollOverride.value = true
    restoreOverride()
  }

  const dateInViewString = computed(() => {
    const date =
      scrollOverride.value || hoverDate.value === null ? rowInViewDate.value : hoverDate.value
    if (date === null) return null

    const day = DAYS[date.getDay()]!
    const month = MONTHS[date.getMonth()]!
    const year = date.getFullYear() === CURRENT_YEAR ? null : ' ' + date.getFullYear()

    return { date: `${day.substring(0, 3)}, ${date.getDate()} ${month.substring(0, 3)}`, year }
  })

  return { hoverDate, dateInViewString, activateScrollOverride }
}
