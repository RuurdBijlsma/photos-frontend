import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import type { ThemeDefinition } from 'vuetify'
import { createVuetify } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi'
import themeJson from '@/assets/themes/themes-v6.json'
import { transformToVuetifyTheme } from '@/stores/themeStore.ts'
import type { Theme } from '@/script/types/themeColor.ts'

const themes: Theme[] = themeJson
const lightDefinition = transformToVuetifyTheme(themes[0]?.schemes?.light!, false)
const darkDefinition = transformToVuetifyTheme(themes[0]?.schemes?.dark!, true)

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
