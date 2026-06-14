import { defineStore } from 'pinia'
import type { DailyCardResponse } from '@/scripts/types/api/dailyCards.ts'
import { computed, ref } from 'vue'
import type { AxiosResponse } from 'axios'
import dailyCardService from '@/scripts/services/dailyCardService.ts'
import { useObjStorage } from '@/scripts/utils.ts'

export const useDailyCardStore = defineStore('dailyCard', () => {
  const cardsByDate = useObjStorage<Record<string, DailyCardResponse[]>>('dailyCardsByDate', {})
  const cardsPromises = new Map<string, Promise<AxiosResponse<DailyCardResponse[]>>>()

  const todayDate = ref(new Date().toISOString().substring(0, 10))
  const todayCards = computed(() => cardsByDate.value[todayDate.value])

  // Delete old daily cards from cache
  requestIdleCallback(() => {
    const currentCards = cardsByDate.value
    const keys = Object.keys(currentCards)
    const keysToKeep = keys.filter((key) => key >= todayDate.value)

    if (keysToKeep.length < keys.length) {
      const updatedCards: Record<string, DailyCardResponse[]> = {}
      for (const key of keysToKeep) {
        updatedCards[key] = currentCards[key]
      }
      cardsByDate.value = updatedCards
    }
  })

  async function fetchDailyCards() {
    const today = new Date().toISOString().substring(0, 10)
    todayDate.value = today
    await fetchCardsForDate(today)
    requestIdleCallback(() => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      fetchCardsForDate(tomorrow.toISOString().substring(0, 10))
    })
  }

  async function fetchCardsForDate(date: string) {
    if (cardsPromises.has(date)) {
      await cardsPromises.get(date)
      return
    }
    if (date in cardsByDate.value) return

    const promise = dailyCardService.getCards(date)
    cardsPromises.set(date, promise)
    const result = await promise
    cardsPromises.delete(date)

    cardsByDate.value = {
      ...cardsByDate.value,
      [date]: result.data,
    }
  }

  return {
    cardsByDate,
    todayDate,
    todayCards,

    fetchDailyCards,
  }
})
