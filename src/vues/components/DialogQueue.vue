<template>
  <v-dialog
    v-model="store.visible"
    :persistent="store.current?.options.persistent"
    max-width="460"
    @click:outside="store.handleCancel"
  >
    <v-card v-if="store.current" rounded="xl" color="surface-container">
      <v-card-item>
        <v-card-title>
          <v-icon
            v-if="store.current.options.icon"
            :color="store.current.options.color || 'primary'"
          >
            {{ store.current.options.icon }}
          </v-icon>
          <span>{{ store.current.options.title }}</span>
        </v-card-title>
      </v-card-item>

      <v-card-text>
        <p v-if="store.current.options.description">
          {{ store.current.options.description }}
        </p>

        <!-- Input field only for prompt -->
        <v-text-field
          v-if="store.current.type === 'prompt'"
          v-model="store.inputValue"
          autofocus
          variant="outlined"
          density="comfortable"
          hide-details
          @keydown.enter="store.handleConfirm"
        />
      </v-card-text>

      <v-divider v-if="store.current.type !== 'alert'"/>

      <v-card-actions >
        <v-spacer />

        <!-- Cancel button: Shown for Confirm and Prompt -->
        <v-btn
          v-if="store.current.type !== 'alert'"
          variant="text"
          rounded="lg"
          @click="store.handleCancel"
        >
          {{ store.current.options.cancelText || 'Cancel' }}
        </v-btn>

        <v-btn
          :color="store.current.options.color || 'primary'"
          variant="tonal"
          rounded="lg"
          @click="store.handleConfirm"
        >
          {{
            store.current.options.confirmText || (store.current.type === 'alert' ? 'OK' : 'Confirm')
          }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { useDialogStore } from '@/scripts/stores/dialogStore'
const store = useDialogStore()
</script>
