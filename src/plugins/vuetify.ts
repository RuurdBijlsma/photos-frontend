import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import { createVuetify } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi'
import themeJson from '@/assets/themes/etna-theme.json'
import { transformToVuetifyTheme } from '@/stores/themeStore.ts'
import type { Theme } from '@/script/types/themeColor.ts'
import {Tooltip} from 'vuetify/directives'

const theme: Theme = themeJson
const lightDefinition = transformToVuetifyTheme(theme.schemes?.light, false)
const darkDefinition = transformToVuetifyTheme(theme.schemes?.dark, true)

export const vuetify = createVuetify({
  directives: { Tooltip },
  theme: {
    defaultTheme: 'system',
    themes: {
      light: lightDefinition,
      dark: darkDefinition,
      lightView: lightDefinition,
      darkView: darkDefinition,
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
