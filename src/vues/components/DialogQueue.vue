<template>
  <v-dialog
    :model-value="store.visible"
    @update:model-value="(val) => !val && store.handleCancel()"
    :persistent="store.current?.options.persistent"
    max-width="460"
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

        <v-text-field
          v-if="store.current.type === 'prompt'"
          v-model="store.inputValue"
          autofocus
          color="primary"
          density="comfortable"
          hide-details
          @keydown.enter="store.handleConfirm"
        />
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn
          v-if="store.current.type !== 'alert'"
          variant="text"
          rounded="lg"
          @click="store.handleCancel"
        >
          {{ store.current.options.cancelText || 'Cancel' }}
        </v-btn>

        <v-btn
          v-if="!store.current.options.actions"
          :color="store.current.options.color || 'primary'"
          variant="tonal"
          rounded="lg"
          @click="store.handleConfirm"
        >
          {{
            store.current.options.confirmText || (store.current.type === 'alert' ? 'OK' : 'Confirm')
          }}
        </v-btn>

        <v-btn
          v-else
          v-for="(action, i) in store.current.options.actions"
          :key="i"
          @click="action.action"
          :color="action.color || 'default'"
          >{{ action.name }}</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { useDialogStore } from '@/scripts/stores/dialogStore'
const store = useDialogStore()
</script>
