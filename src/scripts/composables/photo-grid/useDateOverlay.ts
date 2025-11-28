import { computed, type Ref, ref } from 'vue'
import { useDebounceFn, useThrottleFn } from '@vueuse/core'
import { CURRENT_YEAR, DAYS, MONTHS } from '@/scripts/constants.ts'

export function useDateOverlay(rowInViewDate: Ref<Date | null>) {
  const hoverDate = ref<Date | null>(null)
  const scrollOverride = ref(false)
  const scrollTop = ref(0)
  const restoreOverride = useDebounceFn(() => (scrollOverride.value = false), 500)
  const hideDateOverlay = computed(() => scrollTop.value < 400)

  const activateScrollOverride = useThrottleFn((e: WheelEvent) => {
    //@ts-expect-error It does exist on there!
    scrollTop.value = e.target?.scrollTop

    scrollOverride.value = true
    restoreOverride()
  }, 25)

  const dateInView = computed(() => {
    if (hideDateOverlay.value) return null
    const date =
      scrollOverride.value || hoverDate.value === null ? rowInViewDate.value : hoverDate.value
    if (date === null) return null

    return date
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
