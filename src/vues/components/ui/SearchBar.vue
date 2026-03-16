<script setup lang="ts"></script>

<template>
  <label class="search-bar">
    <span class="search-icon-div">
      <v-icon class="search-icon" icon="mdi-magnify"></v-icon>
    </span>
    <v-text-field
      class="search-text-field"
      placeholder="Search..."
      rounded
      autocomplete="off"
      hide-details
      clearable
    />
  </label>
</template>

<style scoped>
.search-bar {
  cursor: text;
  height: 50px;
  width: calc(100% - 800px);
  max-width: 700px;
  border-radius: 25px;
  background-color: rgba(var(--v-theme-on-background), 0.06);
  display: flex;
  flex-direction: row;
}

.search-bar:has(.search-text-field input:focus) {
  background-color: white;
  color: black;
  box-shadow: 0 2px 2px 0 rgba(0, 0, 0, 0.2);
}

.search-icon-div {
  width: 40px;
  height: 50px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
}

.search-text-field {
  margin-top: -3px;
}

.search-bar:deep(.v-field__overlay) {
  display: none;
}

.search-bar:deep(.v-field__outline) {
  display: none;
}
</style>
