<script setup lang="ts">
import { useSetupStore } from '@/stores/setupStore.ts'
import { usePickFolderStore } from '@/stores/pickFolderStore.ts'

const setupStore = useSetupStore()
const pickFolderStore = usePickFolderStore()
</script>

<template>
  <v-card class="folder-card" variant="text" rounded color="primary">
    <v-card-title class="d-flex align-center card-title">
      <v-icon icon="mdi-rocket-launch" class="mr-2"></v-icon>
      Process media library
    </v-card-title>
    <v-card-text>
      <v-table striped="odd">
        <tbody>
          <tr>
            <td class="table-left">Media folder</td>
            <td class="table-right">{{ setupStore.disks?.media_folder?.folder }}</td>
          </tr>
          <tr>
            <td class="table-left">Thumbnails folder</td>
            <td class="table-right">{{ setupStore.disks?.thumbnails_folder?.folder }}</td>
          </tr>
          <tr>
            <td class="table-left">User folder</td>
            <td class="table-right">{{ '/' + pickFolderStore.viewedFolder.join('/') }}</td>
          </tr>
        </tbody>
      </v-table>
    </v-card-text>
  </v-card>
</template>

<style scoped>
.table-left{
  font-weight: 500;
}
.table-right {
  font-weight: 400;
}
</style>
