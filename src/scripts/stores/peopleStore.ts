import { defineStore } from 'pinia'
import { shallowRef, watch } from 'vue'
import type { PersonInfo } from '@/scripts/types/generated/timeline.ts'
import { useSnackbarsStore } from '@/scripts/stores/snackbarStore.ts'
import peopleService from '@/scripts/services/peopleService.ts'

export const usePeopleStore = defineStore('people', () => {
  const snackbarStore = useSnackbarsStore()

  const people = shallowRef<PersonInfo[]>(
    localStorage.getItem('userPeople') === null ? [] : JSON.parse(localStorage.userPeople),
  )

  watch(people, () => {
    localStorage.setItem('userPeople', JSON.stringify(people.value))
  })

  async function fetchPeople() {
    try {
      const response = await peopleService.list()
      people.value = response.people
    } catch (e) {
      snackbarStore.error("Can't fetch people", e)
    }
  }

  return {
    people,

    fetchPeople,
  }
})
