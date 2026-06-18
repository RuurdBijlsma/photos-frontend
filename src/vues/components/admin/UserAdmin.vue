<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useAdminStore } from '@/scripts/stores/adminStore.ts'
import { useAuthStore } from '@/scripts/stores/authStore.ts'
import { usePickFolderStore } from '@/scripts/stores/pickFolderStore.ts'
import { prettyBytes } from '@/scripts/utils.ts'
import type { AdminUserInfo } from '@/scripts/types/api/admin.ts'

import ThumbnailImg from '@/vues/components/ui/ThumbnailImg.vue'
import FullFolderPicker from '@/vues/components/onboarding/FullFolderPicker.vue'
import { useDialogStore } from '@/scripts/stores/dialogStore.ts'

const adminStore = useAdminStore()
const authStore = useAuthStore()
const dialogs = useDialogStore()
const pickFolderStore = usePickFolderStore()

// State for folder modification dialog
const folderPickerDialog = ref(false)
const editingUser = ref<AdminUserInfo | null>(null)
const savingFolder = ref(false)

// State for deletion dialog
const userToDelete = ref<AdminUserInfo | null>(null)
const deletingUser = ref(false)

onMounted(() => {
  adminStore.fetchUsers()
})

const isCurrentUser = (user: AdminUserInfo): boolean => {
  return authStore.user?.id === user.id || authStore.user?.name === user.username
}

// Compute the sum of all users' main drive storage
const totalStorage = computed(() => {
  return adminStore.users.reduce((sum, user) => sum + (user.mainDriveUsed || 0), 0)
})

// Helper to determine percentage of overall storage used
const getStoragePercentage = (used: number) => {
  if (!totalStorage.value) return 0
  return (used / totalStorage.value) * 100
}

// Dialog management for changing user folders
const openFolderPicker = (user: AdminUserInfo) => {
  editingUser.value = user
  pickFolderStore.viewedFolder = user.mediaFolder ? user.mediaFolder.split('/') : []
  pickFolderStore.refreshFolders()
  folderPickerDialog.value = true
}

const closeFolderPicker = () => {
  folderPickerDialog.value = false
  editingUser.value = null
}

const saveUserFolder = async () => {
  if (!editingUser.value) return
  savingFolder.value = true
  try {
    const selectedFolder = pickFolderStore.viewedFolder.join('/')
    await adminStore.updateUserMediaFolder(editingUser.value.id, selectedFolder)
    closeFolderPicker()
  } catch {
    // Error feedback is handled in the store using the snackbars store
  } finally {
    savingFolder.value = false
  }
}

async function deleteUser(user: AdminUserInfo) {
  console.log(user)
  const confirmed = await dialogs.confirm({
    title: 'Are you sure',
    description: `Are you sure you want to delete:<pre>${user.email}</pre>
    You will not be able to recover this user, their albums, or their photo/video metadata.
    Their files will remain on your filesystem until you manually delete them.
    `,
    confirmText: 'Delete',
    color: 'error',
  })
  if (!confirmed) return
  deletingUser.value = true
  try {
    await adminStore.deleteUser(user.id)
    userToDelete.value = null
  } finally {
    deletingUser.value = false
  }
}
</script>

<template>
  <div class="admin-settings-layout">
    <!-- Main User List Section -->
    <section class="config-panel">
      <v-card class="settings-card" flat border>
        <div class="card-header">
          <span class="card-title">User Accounts</span>
          <v-icon color="primary" size="large">mdi-account-multiple-outline</v-icon>
        </div>

        <div class="card-body">
          <!-- Loading State -->
          <div v-if="adminStore.isUsersLoading" class="loading-state">
            <v-progress-circular indeterminate color="primary" size="48" />
            <p class="loading-text">Loading users list...</p>
          </div>

          <!-- Empty State -->
          <div v-else-if="adminStore.users.length === 0" class="empty-state">
            <v-icon size="64" color="on-surface-variant">mdi-account-search-outline</v-icon>
            <p class="empty-text">No registered users found on this server.</p>
          </div>

          <!-- Users Directory List -->
          <div v-else class="user-list">
            <div v-for="user in adminStore.users" :key="user.id" class="user-item">
              <!-- Avatar & Details -->
              <div class="user-info-section">
                <div class="avatar-container">
                  <thumbnail-img
                    v-if="user.avatarId"
                    :media-item-id="user.avatarId"
                    class="user-avatar-thumb"
                    cover
                  />
                  <v-avatar
                    v-else
                    color="surface-container-highest"
                    size="52"
                    class="border-fallback"
                  >
                    <v-icon color="primary" size="x-large">mdi-account-outline</v-icon>
                  </v-avatar>
                </div>

                <div class="user-details">
                  <div class="username-row">
                    <span class="username-text">{{ user.username }}</span>
                    <v-chip
                      v-if="isCurrentUser(user)"
                      color="primary"
                      size="x-small"
                      class="ml-2 px-2"
                      variant="tonal"
                    >
                      Active
                    </v-chip>
                  </div>
                  <span class="email-text">{{ user.email }}</span>
                </div>
              </div>

              <!-- Media Directory Selector -->
              <div class="user-folder-section">
                <span class="section-subtitle">Media Directory</span>
                <div class="folder-display-row">
                  <v-icon icon="mdi-folder-outline" size="small" class="mr-1 color-primary" />
                  <span class="folder-path" :title="user.mediaFolder || 'Root'">
                    {{ user.mediaFolder || 'Root' }}
                  </span>
                  <v-btn
                    icon="mdi-folder-edit-outline"
                    variant="text"
                    density="comfortable"
                    color="primary"
                    class="ml-1 change-folder-btn"
                    title="Change Media Folder"
                    @click="openFolderPicker(user)"
                  />
                </div>
              </div>

              <!-- Disk Storage Usage Info -->
              <div class="user-storage-section">
                <span class="section-subtitle">Storage Footprint</span>

                <div class="storage-row">
                  <v-icon icon="mdi-harddisk" size="small" class="mr-2" color="primary" />
                  <span class="storage-text font-weight-bold">
                    {{ prettyBytes(user.mainDriveUsed) }}
                  </span>
                  <span class="storage-percentage ml-2 text-caption text-medium-emphasis">
                    ({{ getStoragePercentage(user.mainDriveUsed).toFixed(1) }}%)
                  </span>
                </div>

                <!-- Horizontal bar indicating portion of total storage -->
                <v-progress-linear
                  :model-value="getStoragePercentage(user.mainDriveUsed)"
                  color="primary"
                  height="6"
                  rounded
                  class="mt-2"
                />
              </div>

              <!-- Delete Actions (Prevent deleting current session user) -->
              <div class="user-actions-section">
                <v-btn
                  v-if="!isCurrentUser(user)"
                  icon="mdi-delete-outline"
                  variant="text"
                  color="error"
                  density="comfortable"
                  title="Delete User"
                  @click="deleteUser(user)"
                />
              </div>
            </div>
          </div>
        </div>
      </v-card>
    </section>

    <!-- Dialog: Interactive Directory Chooser -->
    <v-dialog v-model="folderPickerDialog" max-width="850" persistent>
      <v-card class="pick-folder-dialog" rounded="xl" color="surface-container-highest">
        <v-card-title class="dialog-header-row">
          <div class="dialog-title">
            <v-icon icon="mdi-folder-edit-outline" class="mr-2" color="primary" />
            Update Media Folder for: {{ editingUser?.username }}
          </div>
        </v-card-title>
        <v-card-text class="dialog-scroll-body">
          <p class="dialog-desc">
            Pick a default media subdirectory below to scan images. A preview of compatible elements
            will load automatically.
          </p>
          <full-folder-picker />
        </v-card-text>
        <v-card-actions class="px-6 pb-6">
          <v-spacer />
          <v-btn variant="text" rounded @click="closeFolderPicker" class="px-5">Cancel</v-btn>
          <v-btn
            color="primary"
            variant="tonal"
            rounded
            class="px-5"
            :loading="savingFolder"
            @click="saveUserFolder"
          >
            Confirm Path
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.admin-settings-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
}

.settings-card {
  background-color: rgb(var(--v-theme-surface-container-low)) !important;
  border-radius: 24px !important;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity)) !important;
}

.card-header {
  background-color: rgb(var(--v-theme-surface-container-high));
  padding: 16px 24px;
  border-top-left-radius: 24px;
  border-top-right-radius: 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.card-title {
  font-size: 1.25rem;
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface));
}

.card-body {
  padding: 24px;
}

/* User List Item Styling */
.user-list {
  display: flex;
  flex-direction: column;
}

.user-item {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px 0;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.15);
}

.user-item:first-child {
  padding-top: 0;
}

.user-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

@media (min-width: 768px) {
  .user-item {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}

/* User details */
.user-info-section {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1.2;
  min-width: 220px;
}

.avatar-container {
  position: relative;
  width: 52px;
  height: 52px;
}

.user-avatar-thumb {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: 2px solid rgb(var(--v-theme-primary));
  object-fit: cover;
}

.border-fallback {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.user-details {
  display: flex;
  flex-direction: column;
}

.username-row {
  display: flex;
  align-items: center;
}

.username-text {
  font-size: 1.05rem;
  font-weight: 700;
  color: rgb(var(--v-theme-on-surface));
}

.email-text {
  font-size: 0.85rem;
  color: rgb(var(--v-theme-on-surface-variant));
  word-break: break-all;
}

/* User Directory Section */
.user-folder-section {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 200px;
}

.section-subtitle {
  font-size: 0.725rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgb(var(--v-theme-secondary));
  margin-bottom: 4px;
}

.folder-display-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.folder-path {
  font-family: monospace;
  font-size: 0.85rem;
  color: rgb(var(--v-theme-on-surface));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 170px;
}

.change-folder-btn {
  opacity: 0.8;
  transition: opacity 0.2s;
}

.change-folder-btn:hover {
  opacity: 1;
}

/* User Storage Footprint */
.user-storage-section {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 180px;
}

.storage-row {
  display: flex;
  align-items: center;
}

.storage-text {
  font-size: 0.85rem;
  color: rgb(var(--v-theme-on-surface));
}

.storage-percentage {
  color: rgb(var(--v-theme-on-surface-variant));
}

/* User actions column */
.user-actions-section {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  min-width: 50px;
}

/* loading / empty generic modules */
.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
  text-align: center;
}

.loading-text,
.empty-text {
  margin-top: 16px;
  font-size: 0.9rem;
  color: rgb(var(--v-theme-on-surface-variant));
}

/* Dialog customizations */
.pick-folder-dialog {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity)) !important;
}

.dialog-header-row {
  border-bottom: 1px solid rgba(var(--v-border-color), 0.15);
  padding: 20px 24px !important;
}

.dialog-title {
  display: flex;
  align-items: center;
  font-size: 1.25rem;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
}

.dialog-scroll-body {
  max-height: 60vh;
  overflow-y: auto;
  padding: 24px !important;
}

.dialog-desc {
  font-size: 0.875rem;
  color: rgb(var(--v-theme-on-surface-variant));
  margin-bottom: 16px;
}
</style>
