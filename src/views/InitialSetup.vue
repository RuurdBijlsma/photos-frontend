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

      <!--
      TODO:
      * Check with user if the correct folder is selected, show amount of files and maybe a sample of 10 photos
      * Let user input the url of the server, ie. photos.ruurd.dev, and autofill the current url for easyness.
      -->
    </div>
  </v-main>
</template>

<script setup lang="ts">
import { photosApi } from '@/utils/api/PhotosApi'
import type { ApiError, FileCountResponse } from '@/utils/api/types'
import { type Ref, ref } from 'vue'

const folderSummary: Ref<FileCountResponse | null> = ref(null)

photosApi
  .validateFolders()
  .then((result: FileCountResponse | ApiError) => {
    if ('error' in result) {
      console.warn('error getting validate folders result', result)
    } else {
      console.log(result)
      folderSummary.value = result
    }
  })
</script>

<style scoped>
.main {
  position: fixed;
  width: 100%;
  height: 100%;
  background-color: rgb(220, 220, 239);
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
</style>
