<script setup lang="ts">
import MainLayoutContainer from '@/vues/components/MainLayoutContainer.vue'
import BaseMap from '@/vues/components/map/BaseMap.vue'


</script>

<template>
  <main-layout-container class="images">
    <h1>Map!</h1>
    <base-map :map-options="{
    //   todo
    }"></base-map>
  </main-layout-container>
</template>

<style scoped></style>
