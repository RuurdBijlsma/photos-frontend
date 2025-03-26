import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import { createVuetify } from 'vuetify'
import type { ThemeDefinition } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi'
import themeJson from '@/assets/themes-v5.json'
import type { Theme } from '@/utils/types/color'


const themes: Theme[] = themeJson
export const scheme = themes[1].schemes.light

// Map your dynamic scheme values to Vuetify's theme colors.
// Adjust these mappings according to your design system.
const lightTheme: ThemeDefinition = {
  dark: false,
  colors: {
    background: scheme.surface_container,           // use surface_container as background
    surface: scheme.surface_container,              // same for surface
    'surface-bright': scheme.surface_container_highest, // brightest surface
    'surface-light': scheme.surface_container_low,    // lighter surface variant
    'surface-variant': scheme.surface_variant,
    'on-surface-variant': scheme.on_surface_variant,
    primary: scheme.primary,
    'primary-darken-1': scheme.primary_fixed_dim,     // example mapping
    secondary: scheme.secondary,
    'secondary-darken-1': scheme.secondary_fixed_dim, // example mapping
    error: scheme.error,
  },
  variables: {
    // Map additional variables if needed; here we use outline as the border color.
    'border-color': scheme.outline,
    // You can add additional mappings here based on your theme requirements.
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
    'theme-kbd': scheme.on_surface,  // example mapping
    'theme-on-kbd': scheme.on_surface_variant,  // example mapping
    'theme-code': scheme.surface_tint,  // example mapping
    'theme-on-code': scheme.inverse_on_surface,  // example mapping
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
