import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import type { ThemeDefinition } from 'vuetify'
import { createVuetify } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi'
import themeJson from '@/assets/themes/themes-v6.json'
import type { Theme } from '@/utils/types/color'
import { transformToVuetifyTheme } from '@/stores/themeStore.ts'

const themes: Theme[] = themeJson
const lightDefinition = transformToVuetifyTheme(themes[0]?.schemes?.light!)
const darkDefinition = transformToVuetifyTheme(themes[0]?.schemes?.dark!)
//
// // Map your dynamic scheme values to Vuetify's theme colors.
// // Adjust these mappings according to your design system.
// const lightTheme: ThemeDefinition = {
//   dark,
//   colors: {
//     background: scheme.background,
//     surface: scheme.surface_container,
//     'surface-bright': scheme.surface_bright,
//     'surface-light': scheme.surface_dim,
//     'surface-variant': scheme.surface_variant,
//     'on-surface-variant': scheme.on_surface_variant,
//     primary: scheme.primary,
//     'primary-lighten-1': scheme.primary_palette.tones['50'],
//     'primary-lighten-2': scheme.primary_palette.tones['60'],
//     'primary-darken-1': scheme.primary_palette.tones['30'],
//     'primary-darken-2': scheme.primary_palette.tones['20'],
//     secondary: scheme.secondary,
//     'secondary-lighten-1': scheme.secondary_palette.tones['50'],
//     'secondary-lighten-2': scheme.secondary_palette.tones['60'],
//     'secondary-darken-1': scheme.secondary_palette.tones['30'],
//     'secondary-darken-2': scheme.secondary_palette.tones['20'],
//     tertiary: scheme.tertiary,
//     'tertiary-lighten-1': scheme.tertiary_palette.tones['50'],
//     'tertiary-lighten-2': scheme.tertiary_palette.tones['60'],
//     'tertiary-darken-1': scheme.tertiary_palette.tones['30'],
//     'tertiary-darken-2': scheme.tertiary_palette.tones['20'],
//     error: scheme.error,
//   },
//   variables: {
//     'border-color': scheme.outline,
//     'border-opacity': 0.12,
//     'high-emphasis-opacity': 0.87,
//     'medium-emphasis-opacity': 0.6,
//     'disabled-opacity': 0.38,
//     'idle-opacity': 0.04,
//     'hover-opacity': 0.04,
//     'focus-opacity': 0.12,
//     'selected-opacity': 0.08,
//     'activated-opacity': 0.12,
//     'pressed-opacity': 0.12,
//     'dragged-opacity': 0.08,
//     'theme-kbd': scheme.on_surface,
//     'theme-on-kbd': scheme.on_surface_variant,
//   },
// }

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
