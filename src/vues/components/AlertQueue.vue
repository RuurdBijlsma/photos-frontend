<script setup lang="ts">
import { useSnackbarsStore, type AlertAction } from '@/scripts/stores/snackbarStore'

const store = useSnackbarsStore()

const handleAction = async (alertId: string, actionItem: AlertAction) => {
  if (actionItem.action) {
    await actionItem.action()
  }
  store.removeAlert(alertId)
}
</script>

<template>
  <!-- No container needed for positioning as v-dialog is teleported to body -->
  <template v-for="alert in store.alertQueue" :key="alert.id">
    <v-dialog
      :model-value="true"
      @update:model-value="store.removeAlert(alert.id)"
      max-width="500"
      persistent
      class="alert-dialog"
    >
      <v-card>
        <v-card-title class="d-flex align-center bg-surface-variant text-h6 py-3 px-4">
          <v-icon v-if="alert.icon" :icon="alert.icon" class="mr-3" />
          <span>{{ alert.title }}</span>
          <v-spacer />
          <v-btn
            icon="mdi-close"
            variant="text"
            density="comfortable"
            @click="store.removeAlert(alert.id)"
          />
        </v-card-title>

        <v-card-text class="pa-6 text-body-1">
          {{ alert.description }}
        </v-card-text>

        <v-divider />

        <v-card-actions class="pa-3">
          <v-spacer />

          <!-- Default Close Button if no actions provided -->
          <v-btn
            v-if="!alert.actions || alert.actions.length === 0"
            variant="text"
            @click="store.removeAlert(alert.id)"
          >
            Close
          </v-btn>

          <!-- Custom Actions -->
          <v-btn
            v-for="(btn, index) in alert.actions"
            :key="index"
            :color="btn.color || 'primary'"
            variant="text"
            @click="handleAction(alert.id, btn)"
          >
            {{ btn.name }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </template>
</template>

<style scoped>
.alert-dialog :deep(.v-card) {
  border-radius: 18px;
}
</style>
