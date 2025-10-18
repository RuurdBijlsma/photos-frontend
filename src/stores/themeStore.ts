import type { Ref } from 'vue'
import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { ThemeDefinition } from 'vuetify'
import type { DynamicScheme, Palette, Theme } from '@/utils/types/color.ts'

type VuetifyColors = ThemeDefinition['colors']

/**
 * Generates and adds lighten/darken color variations to the theme.
 * @param {VuetifyColors} colors - The colors object to modify. Can be undefined.
 * @param {string} name - The color name ('primary', 'secondary', etc.).
 * @param {Palette} palette - The color's corresponding palette.
 * @param {boolean} isDark - Whether the theme is dark or not.
 */
export function generateColorVariations(
  colors: VuetifyColors,
  name: string,
  palette: Palette,
  isDark: boolean,
) {
  // Ensure colors object exists before modifying it.
  if (!colors) return

  if (isDark) {
    // Dark Theme: The base color is a high tone (e.g., 80).
    colors[`${name}-lighten-1`] = palette.tones['90']
    colors[`${name}-darken-1`] = palette.tones['70']
    colors[`${name}-darken-2`] = palette.tones['60']
    colors[`${name}-darken-3`] = palette.tones['50']
  } else {
    // Light Theme: The base color is a mid-tone (e.g., 40).
    colors[`${name}-lighten-1`] = palette.tones['50']
    colors[`${name}-lighten-2`] = palette.tones['60']
    colors[`${name}-lighten-3`] = palette.tones['70']
    colors[`${name}-darken-1`] = palette.tones['30']
    colors[`${name}-darken-2`] = palette.tones['20']
    colors[`${name}-darken-3`] = palette.tones['10']
  }
}

/**
 * Transforms your backend's scheme into a Vuetify ThemeDefinition object.
 * @param {DynamicScheme} scheme - The light or dark scheme from your types.
 * @returns {ThemeDefinition} A complete Vuetify theme definition.
 */
export function transformToVuetifyTheme(scheme: DynamicScheme, isDark: boolean): ThemeDefinition {
  // Map the scheme from your backend to Vuetify's expected color properties.
  const colors: VuetifyColors = {
    background: scheme.background,
    surface: scheme.surface,
    primary: scheme.primary,
    secondary: scheme.secondary,
    tertiary: scheme.tertiary,
    'on-background': scheme.on_surface, // Map on_surface to on_background
    'on-surface': scheme.on_surface,
    'on-primary': scheme.on_primary,
    'on-secondary': scheme.on_secondary,
    'on-tertiary': scheme.on_tertiary,
    'surface-variant': scheme.surface_variant,
    'on-surface-variant': scheme.on_surface_variant,
    'primary-container': scheme.primary_container,
    'on-primary-container': scheme.on_primary_container,
    'secondary-container': scheme.secondary_container,
    'on-secondary-container': scheme.on_secondary_container,
    'tertiary-container': scheme.tertiary_container,
    'on-tertiary-container': scheme.on_tertiary_container,
    'error-container': scheme.error_container,
    'on-error-container': scheme.on_error_container,
    outline: scheme.outline,
    'outline-variant': scheme.outline_variant,
    scrim: scheme.scrim,
    shadow: scheme.shadow,

    error: scheme.error,
    'on-error': scheme.on_error,
    info: isDark ? '#64B5F6' : '#2196F3',
    'on-info': isDark ? '#0f1b25' : '#d3e6f5',
    success: isDark ? '#81C784' : '#2E7D32',
    'on-success': isDark ? '#203121' : '#e0f3e1',
    warning: isDark ? '#FFD54F' : '#F9A825',
    'on-warning': isDark ? '#211c0a' : '#1c1304',

    'surface-bright': scheme.surface_bright,
    'surface-light': scheme.surface_tint,
  }

  // Generate and inject the lighten/darken variations.
  generateColorVariations(colors, 'primary', scheme.primary_palette, scheme.is_dark)
  generateColorVariations(colors, 'secondary', scheme.secondary_palette, scheme.is_dark)
  generateColorVariations(colors, 'tertiary', scheme.tertiary_palette, scheme.is_dark)

  return {
    dark: scheme.is_dark,
    colors,
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
      'theme-code': scheme.surface,
      'theme-on-code': scheme.on_surface_variant,
    },
  }
}

export const useThemeStore = defineStore('theme', () => {
  // --- STATE ---
  const currentTheme: Ref<{ light: ThemeDefinition; dark: ThemeDefinition } | null> = ref(null)

  // --- HELPER FUNCTIONS ---

  // --- PUBLIC ACTIONS ---

  /**
   * Applies a new theme based on the theme data from your backend.
   * @param {Theme[]} themeData - An array of themes, where the first will be used.
   */
  function setThemesFromJson(themeData: Theme) {
    if (!themeData) {
      console.warn('applyThemeFromJSON called with empty or invalid theme data.')
      return
    }
    const { schemes } = themeData

    // Update the state ref.
    currentTheme.value = {
      light: transformToVuetifyTheme(schemes.light),
      dark: transformToVuetifyTheme(schemes.dark),
    }
  }

  // --- RETURN ---
  // Expose the public state and actions.
  return {
    currentTheme,
    setThemesFromJson,
  }
})
