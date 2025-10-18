import type { Ref } from 'vue'
import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { ThemeDefinition } from 'vuetify'
import { useTheme } from 'vuetify'
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
export function transformToVuetifyTheme(scheme: DynamicScheme): ThemeDefinition {
  // Map the scheme from your backend to Vuetify's expected color properties.
  const colors: VuetifyColors = {
    background: scheme.background,
    surface: scheme.surface,
    primary: scheme.primary,
    secondary: scheme.secondary,
    tertiary: scheme.tertiary,
    error: scheme.error,
    'on-background': scheme.on_surface, // Map on_surface to on_background
    'on-surface': scheme.on_surface,
    'on-primary': scheme.on_primary,
    'on-secondary': scheme.on_secondary,
    'on-tertiary': scheme.on_tertiary,
    'on-error': scheme.on_error,
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
  }

  // Generate and inject the lighten/darken variations.
  generateColorVariations(colors, 'primary', scheme.primary_palette, scheme.is_dark)
  generateColorVariations(colors, 'secondary', scheme.secondary_palette, scheme.is_dark)
  generateColorVariations(colors, 'tertiary', scheme.tertiary_palette, scheme.is_dark)

  return {
    dark: scheme.is_dark,
    colors,
  }
}

export const useThemeStore = defineStore('theme', () => {
  // --- STATE ---
  const currentThemes: Ref<{ light: ThemeDefinition; dark: ThemeDefinition } | null> = ref(null)

  // --- HELPER FUNCTIONS ---

  // --- PUBLIC ACTIONS ---

  /**
   * Applies a new theme based on the theme data from your backend.
   * @param {Theme[]} themeData - An array of themes, where the first will be used.
   */
  function applyThemeFromJSON(themeData: Theme) {
    if (!themeData) {
      console.warn('applyThemeFromJSON called with empty or invalid theme data.')
      return
    }
    const { schemes } = themeData

    const vuetifyThemes = {
      light: transformToVuetifyTheme(schemes.light),
      dark: transformToVuetifyTheme(schemes.dark),
    }

    // Update the state ref.
    currentThemes.value = vuetifyThemes

    // Dynamically update the themes in the Vuetify instance.
    const vuetifyTheme = useTheme()
    vuetifyTheme.themes.value.dark = vuetifyThemes.dark
    vuetifyTheme.themes.value.light = vuetifyThemes.light
  }

  // --- RETURN ---
  // Expose the public state and actions.
  return {
    currentThemes,
    applyThemeFromJSON,
  }
})
