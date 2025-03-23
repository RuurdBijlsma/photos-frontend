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
        <media-sample :summary="folderSummary" :images="samples" />

        <!-- Unsupported Files -->
        <unsupported-files
          v-if="folderSummary.unsupported_count > 0"
          :summary="folderSummary"
        />

        <!-- Inaccessible Files and Folders -->
        <inaccessible-entries
          v-if="folderSummary.inaccessible_entries.length > 0"
          :summary="folderSummary"
        />
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
import FullFolderStatus from '@/components/setup/FullFolderStatus.vue'
import MediaSample from '@/components/setup/MediaSample.vue'
import UnsupportedFiles from '@/components/setup/UnsupportedFiles.vue'
import InaccessibleEntries from '@/components/setup/InaccessibleEntries.vue'

const folderSummary: Ref<FileCountResponse | null> = ref(null)
const refreshLoading = ref(false)
let N_SAMPLES = 8
const samples: Ref<string[]> = ref(Array(N_SAMPLES))

async function refreshFolderSummary() {
  refreshLoading.value = true
  try {
    const result = await photosApi.validateFolders()
    if ('error' in result) {
      console.warn('error getting validate folders result', result)
    } else {
      console.log(result)
      folderSummary.value = result
      N_SAMPLES = result.samples.length
      let j = 0
      for (let i = 0; i < N_SAMPLES; i++) {
        getImageUrl(result.samples[i]).then(
          imageUrl => (samples.value[j++] = imageUrl),
        )
      }
    }
  } finally {
    refreshLoading.value = false
  }
}

async function getImageUrl(file: string): Promise<string> {
  console.log(file)
  return await photosApi.rawMediaUrl(file)
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

.folder-status-title {
  display: flex;
}

.black-text {
  font-weight: 600;
  color: rgba(79, 49, 26, 0.7);
}
</style>
