import { computed, type Ref, ref } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { CURRENT_YEAR, DAYS, MONTHS } from '@/scripts/constants.ts'

export function useDateOverlay(rowInViewDate: Ref<Date | null>, rowInViewIndex: Ref<number>) {
  const hoverDate = ref<Date | null>(null)
  const scrollOverride = ref(false)
  const restoreOverride = useDebounceFn(() => (scrollOverride.value = false), 500)

  const activateScrollOverride = () => {
    scrollOverride.value = true
    restoreOverride()
  }

  const dateInView = computed(() => {
    if (rowInViewIndex.value < 10) return null
    return scrollOverride.value || hoverDate.value === null ? rowInViewDate.value : hoverDate.value
  })

  const dateInViewString = computed(() => {
    const date = dateInView.value
    if (date === null) return null

    const day = DAYS[date.getDay()]!
    const month = MONTHS[date.getMonth()]!
    const year = date.getFullYear() === CURRENT_YEAR ? null : ' ' + date.getFullYear()

    return { date: `${day.substring(0, 3)}, ${date.getDate()} ${month.substring(0, 3)}`, year }
  })

  return { hoverDate, dateInViewString, activateScrollOverride }
}
