<script setup lang="ts">
import MainLayoutContainer from '@/vues/components/MainLayoutContainer.vue'
import authService from '@/scripts/services/authService.ts'
import { useDialogStore } from '@/scripts/stores/dialogStore.ts'
import FullFolderPicker from '@/vues/components/onboarding/FullFolderPicker.vue'
import { computed } from 'vue'
import { usePickFolderStore } from '@/scripts/stores/pickFolderStore.ts'
import { useAuthStore } from '@/scripts/stores/authStore.ts'
import { copyToClipboard } from '@/scripts/utils.ts'

const dialogs = useDialogStore()
const folderStore = usePickFolderStore()
const authStore = useAuthStore()

const userFolder = computed(() => folderStore.viewedFolder.join('/'))
const invalidFolderSelected = computed(() => userFolder.value === authStore.user?.mediaFolder)

async function generateInvite() {
  if (invalidFolderSelected.value) return
  const invite = await authService.generateInvite(userFolder.value)
  const inviteUrl = `${location.origin}/register?token=${invite.data.token}`
  await dialogs.alert({
    title: 'Invite a friend',
    description: `Share this token with someone to let them create an account on this server.
    <br>
    <br>
    <a href="${inviteUrl}" target="_blank">${inviteUrl}</a>
    `,
    actions: [
      { action: () => copyToClipboard(inviteUrl), name: 'Copy invite' },
      { action: () => ({}), name: 'Done' },
    ],
  })
  console.log(invite)
}
</script>

<template>
  <main-layout-container class="admin">
    <h1>Admin!</h1>

    <v-dialog max-width="1000">
      <template v-slot:activator="{ props: activatorProps }">
        <v-btn variant="tonal" color="primary" rounded v-bind="activatorProps"
          >Invite a friend to this server</v-btn
        >
      </template>

      <template v-slot:default="{ isActive }">
        <v-card class="pick-folder-ui" rounded="xl" color="surface-container-highest">
          <v-card-title>Invite a friend</v-card-title>
          <p class="text-body-medium pick-folder-text">
            When inviting a user, you need to pick a folder for their media to be stored. It must be
            a different folder than your media folder.
          </p>
          <full-folder-picker />
          <v-alert
            v-if="invalidFolderSelected"
            type="error"
            text="Media folder is already in use."
          ></v-alert>
          <v-card-actions v-else>
            <v-btn @click="isActive.value = false" class="mr-3" variant="plain" rounded>
              Cancel
            </v-btn>
            <v-btn
              color="primary"
              variant="tonal"
              rounded
              prepend-icon="mdi-share"
              @click="generateInvite"
              >Generate Invite</v-btn
            >
          </v-card-actions>
        </v-card>
      </template>
    </v-dialog>
  </main-layout-container>
</template>

<style scoped>
.pick-folder-ui {
  max-width: 700px;
  padding: 20px;
}

.pick-folder-text {
  margin: 10px 20px;
}
</style>
