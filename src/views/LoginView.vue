<script setup lang="ts">
import { onMounted, type Ref, ref } from 'vue'
import type { VForm } from 'vuetify/components'
import MyAlert from '@/components/my-theme/MyAlert.vue'
import { useAuthStore } from '@/stores/authStore.ts'
import { useSnackbarsStore } from '@/stores/snackbarStore.ts'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const snackbarStore = useSnackbarsStore()
const router = useRouter()

const emailInput: Ref<null | HTMLElement> = ref(null)
const form: Ref<null | VForm> = ref(null)

onMounted(() => {
  emailInput.value?.focus()
})

const rules = {
  mailRequired: (v: string) => !!v || 'Email is required.',
  passRequired: (v: string) => !!v || 'Password is required.',
  min: (v: string) => v.length >= 6 || `Min 6 characters`,
}

const showPassword = ref(false)
const email = ref('')
const password = ref('')
const isSubmitted = ref(false)
const errorMessage: Ref<string | null> = ref(null)
const isLoading = ref(false)

async function login() {
  isLoading.value = true
  try {
    // This will either succeed and navigate away, or throw an error.
    await authStore.login({
      email: email.value,
      password: password.value,
    })
    await router.push({ name: 'home' })
  } catch (error) {
    // The authStore already showed the snackbar. We just need to handle
    // the UI state here.
    if (error instanceof Error) snackbarStore.error('Login failed. ' + error.message, error)
  } finally {
    // This will run whether the login succeeds or fails.
    isLoading.value = false
  }
}
</script>

<template>
  <v-main class="login-main">
    <div class="login-container">
      <div class="left-pane">
        <div :class="{ rotating: isLoading }" class="big-image"></div>
      </div>
      <div class="right-pane">
        <v-form class="login-form" @submit.prevent="login()" ref="form">
          <v-text-field
            class="text-input"
            prepend-icon="mdi-email-outline"
            append-icon="empty"
            variant="outlined"
            ref="emailInput"
            rounded
            :rules="isSubmitted ? [rules.mailRequired, rules.min] : []"
            v-model="email"
            label="Email"
            color="primary"
            base-color="outline"
            placeholder="user@example.com"
          />
          <v-btn
            variant="plain"
            class="mb-1"
            color="primary"
            rounded
            tabindex="-1"
            density="compact"
            >Forgot password
          </v-btn>
          <v-text-field
            class="text-input mb-1"
            variant="outlined"
            :prepend-icon="showPassword ? 'mdi-lock-open-outline' : 'mdi-lock-outline'"
            :append-icon="showPassword ? 'mdi-eye-outline' : 'mdi-eye-off-outline'"
            @click:append="showPassword = !showPassword"
            :rules="isSubmitted ? [rules.passRequired] : []"
            :type="showPassword ? 'text' : 'password'"
            rounded
            v-model="password"
            color="primary"
            base-color="outline"
            label="Password"
          ></v-text-field>
          <v-btn
            class="mt-4"
            type="submit"
            variant="flat"
            color="primary"
            rounded
            density="default"
            :loading="isLoading"
            width="150"
            >Login
          </v-btn>
        </v-form>

        <my-alert
          v-if="errorMessage"
          :text="errorMessage"
          icon="mdi-alert-octagon"
          class="mt-8"
          background-color="error-container"
          text-color="on-error-container"
        />
      </div>
    </div>
  </v-main>
</template>

<style scoped>
.login-main {
  position: fixed;
  width: 100%;
  height: 100%;
  background-color: rgb(var(--v-theme-surface-variant));
}

.login-container {
  background: rgb(227, 222, 255, 0.7);
  background: linear-gradient(
    0deg,
    rgba(var(--v-theme-background), 0.5) 0%,
    rgb(var(--v-theme-background), 0.8) 100%
  );
  flex-grow: 1;
  border-radius: 30px;
  overflow: hidden;
  box-shadow: 0 10px 20px 0 rgba(0, 0, 0, 0.1);
  max-width: 800px;
  padding: 60px;
  margin: 100px auto 0;
  display: flex;
}

.left-pane {
  width: 300px;
  display: flex;
  flex-direction: column;
}

.big-image {
  background-image: url('img/app-no-bg-1024.png');
  width: 100%;
  height: 100%;
  background-size: 80%;
  background-position: center;
}

.left-pane h1 {
  margin-left: 20px;
  font-size: 20px;
  font-weight: 500;
  opacity: 0.6;
}

.right-pane {
  width: 500px;
  margin-left: 50px;
}

.login-container > h1 {
  text-align: center;
}

.login-form {
  display: flex;
  align-items: center;
  flex-direction: column;
}

.text-input {
  width: 100%;
}

.rotating {
  animation: rotate 1s ease-in-out infinite;
}

@keyframes rotate {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
