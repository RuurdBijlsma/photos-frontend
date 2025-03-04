<script setup lang="ts"></script>

<template>
  <v-app-bar
    density="comfortable"
    title="Ruurd Photos"
    :height="70"
    class="header"
    color="transparent"
    elevation="0"
  >
    <template v-slot:prepend>
      <v-avatar>
        <v-img class="ml-2" src="img/white-border-512.png"></v-img>
      </v-avatar>
    </template>
    <v-spacer />
  </v-app-bar>
  <v-main class="layout-body">
    <div class="login-container">
      <h1>Logdin</h1>
    </div>
  </v-main>
</template>

<style scoped>
.layout-body {
  display: flex;
  width: 100vw;
  height: 100%;
}

.login-container {
  background: rgb(227, 222, 255);
  background: linear-gradient(
    0deg,
    rgb(234, 222, 255) 0%,
    rgb(255, 248, 252) 100%
  );
  flex-grow: 1;
  border-top-left-radius: 60px;
  border-top-right-radius: 60px;
  overflow: hidden;
  box-shadow: 0 10px 20px 0 rgba(0, 0, 0, 0.1);
  max-width: calc(100% - 100px);
  margin-left: 50px;
}
</style>
