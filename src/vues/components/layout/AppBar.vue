<script setup lang="ts">
import SearchBar from '@/vues/components/ui/SearchBar.vue'
import { useAuthStore } from '@/scripts/stores/authStore.ts'

const authStore = useAuthStore()

async function logout() {
  await authStore.logout()
}
</script>

<template>
  <v-app-bar density="comfortable" :height="70" class="header" color="transparent" elevation="0">
    <h1 class="appbar-title"><span>Ruurd</span> Photos</h1>
    <v-spacer />
    <search-bar />
    <v-spacer />
    <div class="header-buttons">
      <v-btn variant="plain" rounded>
        <v-icon icon="mdi-upload"></v-icon>
        Upload
      </v-btn>
      <v-menu>
        <template v-slot:activator="{ props }">
          <v-btn icon v-bind="props">
            <v-avatar>
              <v-img src="img/avatar.jpg"></v-img>
            </v-avatar>
          </v-btn>
        </template>
        <div>
          <v-sheet color="background">
            <div class="menu-header" v-if="authStore.user">
              <div class="user-icon">
                <v-avatar>
                  <v-img src="img/avatar.jpg"></v-img>
                </v-avatar>
              </div>
              <div class="user-info">
                <p class="user-name">{{ authStore.user.name }}</p>
                <p class="user-email">{{ authStore.user.email }}</p>
              </div>
            </div>
            <v-list color="background">
              <v-list-item prepend-icon="mdi-account-circle" to="/me">
                <v-list-item-title>Profile</v-list-item-title>
              </v-list-item>
              <v-list-item prepend-icon="mdi-logout" @click="logout">
                <v-list-item-title>Sign out</v-list-item-title>
              </v-list-item>
              <v-divider />
              <v-list-item prepend-icon="mdi-security" to="/admin" v-if="authStore.isAdmin">
                <v-list-item-title>Admin</v-list-item-title>
              </v-list-item>
              <v-list-item prepend-icon="mdi-cog" to="/settings">
                <v-list-item-title>Settings</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-sheet>
        </div>
      </v-menu>
    </div>
  </v-app-bar>
</template>

<style scoped>
.appbar-title {
  font-weight: 600;
  font-size: 20px;
  margin-left: 50px;
  opacity: 0.8;
}

.appbar-title > span {
  font-weight: 400;
}

.header-buttons {
  display: flex;
  gap: 20px;
  align-items: center;
}

.menu-header {
  padding: 20px;
  padding-bottom: 0;
  display: flex;
  gap: 20px;
  align-items: center;
}

.user-info p {
  margin: 0;
}

.user-name {
  font-weight: bold;
}

.user-email {
  opacity: 0.7;
}
</style>
