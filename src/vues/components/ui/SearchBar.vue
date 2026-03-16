<script setup lang="ts"></script>

<template>
  <div class="search-section">
    <div class="search-centered-section">
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
      <div class="search-suggestions">
        <div class="search-suggestions-inner">
          <div>h3llo</div>
          <div>h3llo</div>
          <div>h3llo</div>
          <div>h3llo</div>
          <div>h3llo</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.search-section {
  position: fixed;
  top: 7px;
  width: 100%;
}

.search-centered-section {
  width: calc(50% - 100px);
  max-width: 700px;
  margin: 0 auto;
  position: relative;
  flex-grow: 1;
}

.search-suggestions {
  color: rgb(var(--v-theme-on-surface-container-high));
  background-color: rgba(var(--v-theme-surface-container-high), 0.7);
  backdrop-filter: brightness(100%) saturate(250%) blur(50px) contrast(100%) !important;
  top: 25px;
  position: absolute;
  z-index: 5;
  width: 100%;
  padding-top:25px;
  border-bottom-right-radius: 25px;
  border-bottom-left-radius: 25px;
}

.search-suggestions-inner{
  padding:15px;
}

.search-bar {
  position: absolute;
  width: 100%;
  cursor: text;
  height: 50px;
  border-radius: 25px;
  background-color: rgba(var(--v-theme-surface-container));
  display: flex;
  flex-direction: row;
  z-index: 10;
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
