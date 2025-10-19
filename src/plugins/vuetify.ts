import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import { createVuetify } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi'
import themeJson from '@/assets/themes/etna-theme.json'
import { transformToVuetifyTheme } from '@/stores/themeStore.ts'
import type { Theme } from '@/script/types/themeColor.ts'

const theme: Theme = themeJson
const lightDefinition = transformToVuetifyTheme(theme.schemes?.light, false)
const darkDefinition = transformToVuetifyTheme(theme.schemes?.dark, true)

export const vuetify = createVuetify({
  theme: {
    defaultTheme: 'system',
    themes: {
      light: lightDefinition,
      dark: darkDefinition,
    },
  },
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: {
      mdi,
    },
  },
})
