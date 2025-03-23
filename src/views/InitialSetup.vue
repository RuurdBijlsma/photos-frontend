<template>
  <v-main class="main">
    <div class="container">
      <div class="title-box">
        <div class="left-title">
          <div class="big-image"></div>
        </div>
        <div class="right-title">
          <h1>Set Up <span>Ruurd Photos</span></h1>
          <p class="mt-2">
            Now, let's configure your library and settings. Make sure your media
            library is set up correctly, then enter your server URL to continue.
          </p>
        </div>
      </div>

      <v-divider class="mt-10 mb-5" />

      <!-- Folders Status Section -->
      <div class="folder-status-title mb-3">
        <h3>Folder Status</h3>
        <v-spacer />
        <v-btn
          variant="plain"
          density="compact"
          @click="refreshFolderSummary"
          :loading="refreshLoading"
          prepend-icon="mdi-refresh"
        >Refresh
        </v-btn>
      </div>
      <section v-if="folderSummary">

        <!-- Media Folder -->
        <full-folder-status
          :folder="folderSummary.media_folder"
          env-var="MEDIA_DIR"
          title-icon="mdi-camera"
        />

        <!-- Thumbnails Folder -->
        <full-folder-status
          :folder="folderSummary.thumbnails_folder"
          env-var="THUMBNAILS_DIR"
          title-icon="mdi-image-multiple"
        />

        <!-- Media Files Section -->
        <v-card
          class="mb-6"
          variant="tonal"
          color="success"
          v-if="folderSummary.media_folder.read_access"
        >
          <v-card-title>
            <v-icon icon="mdi-image-multiple" class="mr-2"></v-icon>
            Media Files ({{ folderSummary.count }} supported files)
          </v-card-title>
          <v-card-text>
            <p class="text-caption text-medium-emphasis mb-4">
              Found {{ folderSummary.count }} supported media files. Here's a
              sample:
            </p>
            <v-row dense>
              <v-col
                v-for="(file, index) in folderSummary.samples"
                :key="index"
                cols="4"
                sm="3"
                md="2"
              >
                <div
                  class="media-thumbnail pa-2 bg-grey-lighten-3 rounded-lg text-center"
                >
                  <v-icon icon="mdi-file-image" size="40" class="mb-1"></v-icon>
                  <div class="text-caption text-truncate">{{ file }}</div>
                </div>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <!-- Unsupported Files -->
        <v-card class="mb-6 folder-card" variant="text">
          <v-card-title class="d-flex align-center card-title">
            <v-icon icon="mdi-alert-circle-outline" class="mr-2"></v-icon>
            Unsupported Files ({{ folderSummary.unsupported_count }})
          </v-card-title>
          <v-card-text>
            <p class="mt-3 mb-3">
              Files with the following extensions are excluded from the scanning
              process, as they are not compatible with our media processor.
            </p>
            <v-alert
              v-if="folderSummary.unsupported_count > 0"
              type="warning"
              variant="tonal"
            >
              <span class="black-text"
                >Unsupported filetype{{
                  [...Object.keys(folderSummary.unsupported_files)].length === 1
                    ? ''
                    : 's'
                }}
                detected:</span
              >
              <br />
              <v-dialog
                max-width="500"
                v-for="(files, ext) in folderSummary.unsupported_files"
                :key="ext"
              >
                <template v-slot:activator="{ props: activatorProps }">
                  <v-chip
                    @click="console.log(files)"
                    class="ma-1"
                    v-bind="activatorProps"
                  >
                    <span class="black-text">.{{ ext }}</span>
                  </v-chip>
                </template>

                <template v-slot:default="{ isActive }">
                  <v-card :title="`Unsupported ${ext} files`">
                    <v-card-text>
                      <v-list>
                        <v-list-item v-for="(file, i) in files" :key="i">
                          <template v-slot:prepend>
                            <v-icon icon="mdi-file"></v-icon>
                          </template>
                          <v-list-item-title>
                            {{ file }}
                          </v-list-item-title>
                        </v-list-item>
                      </v-list>
                    </v-card-text>

                    <v-card-actions>
                      <v-spacer></v-spacer>

                      <v-btn
                        text="Dismiss"
                        @click="isActive.value = false"
                      ></v-btn>
                    </v-card-actions>
                  </v-card>
                </template>
              </v-dialog>
            </v-alert>
            <v-alert v-else type="success" variant="tonal" rounded>
              No unsupported files found - great job keeping your media library
              clean!
            </v-alert>
          </v-card-text>
        </v-card>
      </section>

      <v-skeleton-loader
        :loading="refreshLoading"
        v-else
        type="card-avatar, heading, paragraph, divider, heading, button, card, article, card"
      ></v-skeleton-loader>

    </div>
  </v-main>
</template>

<script setup lang="ts">
import { photosApi } from '@/utils/api/PhotosApi'
import type { FileCountResponse } from '@/utils/api/types'
import { type Ref, ref } from 'vue'
import FullFolderStatus from '@/components/FullFolderStatus.vue'

const folderSummary: Ref<FileCountResponse | null> = ref(null)
const refreshLoading = ref(false)

async function refreshFolderSummary() {
  refreshLoading.value = true
  try {
    const result = await photosApi.validateFolders()
    if ('error' in result) {
      console.warn('error getting validate folders result', result)
    } else {
      console.log(result)
      folderSummary.value = result
    }
  } finally {
    refreshLoading.value = false
  }
}

refreshFolderSummary().then()
</script>

<style scoped>
.main {
  position: fixed;
  width: 100%;
  height: 100%;
  background-color: rgb(220, 220, 239);
  overflow-y: auto;
  padding-bottom: 100px;
}

.container {
  background: rgb(227, 222, 255, 0.7);
  background: linear-gradient(
    0deg,
    rgba(255, 232, 232, 0.5) 0%,
    rgb(255, 248, 252, 0.8) 100%
  );
  border-radius: 30px;
  overflow: hidden;
  box-shadow: 0 10px 20px 0 rgba(0, 0, 0, 0.07);
  max-width: 800px;
  padding: 50px 60px;
  margin: 100px auto 0;
  transition: box-shadow 0.3s ease;
}

.container:hover {
  box-shadow: 0 10px 30px 0 rgba(0, 0, 0, 0.1);
}

.title-box {
  display: flex;
  gap: 40px;
}

.big-image {
  background-image: url('img/app-no-bg-1024.png');
  width: 100px;
  height: 100px;
  background-size: 90%;
  background-position: center;
}

.right-title {
  height: 100px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.container h1 {
  font-size: 35px;
  font-weight: 400;
  opacity: 0.7;
}

.container span {
  font-weight: 600;
}

.container h3 {
  opacity: 0.7;
  font-weight: 500;
  font-size: 20px;
}

.media-thumbnail {
  height: 100px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  transition: transform 0.2s;
}

.media-thumbnail:hover {
  transform: scale(1.05);
}

.text-error {
  color: #ff5252;
  font-weight: 500;
}

.no-padding {
  padding-top: 0;
}

.folder-status-title {
  display: flex;
}

.black-text {
  font-weight: 600;
  color: rgba(79, 49, 26, 0.7);
}
</style>
