<template>
  <v-main class="main">
    <div class="container">
      <div class="title-box">
        <div class="left-title">
          <div class="big-image"></div>
        </div>
        <div class="right-title">
          <h1>Set Up <span>Ruurd Photos</span></h1>
          <h3>Now, let's configure your library and settings.</h3>
          <p class="mt-2">
            Select your photo folder and adjust additional preferences, like an
            email server and Google Photos album imports.
          </p>
        </div>
      </div>

      <v-divider class="mt-10 mb-5"></v-divider>

      <!-- todo make custom folder browser (browse on server)-->
    </div>
  </v-main>
</template>

<script setup lang="ts"></script>

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
