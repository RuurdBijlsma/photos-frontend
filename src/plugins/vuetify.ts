import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import { createVuetify } from 'vuetify'
import type { ThemeDefinition } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi'
import themeJson from '@/assets/themes/themes-v6.json'
import type { Theme } from '@/utils/types/color'

const themes: Theme[] = themeJson
console.log(themes)
export const scheme = themes[2].schemes.light

// Map your dynamic scheme values to Vuetify's theme colors.
// Adjust these mappings according to your design system.
const lightTheme: ThemeDefinition = {
  dark: false,
  colors: {
    background: scheme.background,
    surface: scheme.surface_container,
    'surface-bright': scheme.surface_bright,
    'surface-light': scheme.surface_dim,
    'surface-variant': scheme.surface_variant,
    'on-surface-variant': scheme.on_surface_variant,
    primary: scheme.primary,
    'primary-darken-1': scheme.primary_fixed_dim,
    secondary: scheme.secondary,
    'secondary-darken-1': scheme.secondary_fixed_dim,
    error: scheme.error,
  },
  variables: {
    'border-color': scheme.outline,
    'border-opacity': 0.12,
    'high-emphasis-opacity': 0.87,
    'medium-emphasis-opacity': 0.6,
    'disabled-opacity': 0.38,
    'idle-opacity': 0.04,
    'hover-opacity': 0.04,
    'focus-opacity': 0.12,
    'selected-opacity': 0.08,
    'activated-opacity': 0.12,
    'pressed-opacity': 0.12,
    'dragged-opacity': 0.08,
    'theme-kbd': scheme.on_surface,
    'theme-on-kbd': scheme.on_surface_variant,
  },
}

export const vuetify = createVuetify({
  theme: {
    defaultTheme: 'lightTheme',
    themes: {
      lightTheme,
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
