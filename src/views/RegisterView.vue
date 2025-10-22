<script setup lang="ts">
import type { VForm } from 'vuetify/components'
import { onMounted, type Ref, ref } from 'vue'
import MyAlert from '@/components/my-theme/MyAlert.vue'
import SetupLayout from '@/components/my-theme/SetupLayout.vue'
import MyMainContainer from '@/components/my-theme/MyMainContainer.vue'
import { useAuthStore } from '@/stores/authStore.ts'
import { useRouter } from 'vue-router'
import { useSnackbarsStore } from '@/stores/snackbarStore.ts'
import { isAxiosError } from 'axios'

const authStore = useAuthStore()
const router = useRouter()
const snackbarStore = useSnackbarsStore()

const userInput: Ref<null | HTMLElement> = ref(null)
const form: Ref<null | VForm> = ref(null)

onMounted(() => {
  userInput.value?.focus()
})

const showPassword = ref(false)
const displayName = ref('')
const email = ref('')
const password1 = ref('')
const password2 = ref('')
const isSubmitted = ref(false)
const errorMessage: Ref<undefined | string> = ref(undefined)
const isLoading = ref(false)

const rules = {
  userRequired: (v: string) => !!v || 'Display name is required.',
  mailRequired: (v: string) => !!v || 'Email is required.',
  passRequired: (v: string) => !!v || 'Password is required.',
  min: (v: string) => v.length >= 6 || `Min 6 characters`,
  noMatch: () => password1.value == password2.value || 'Passwords must match',
}

async function register() {
  errorMessage.value = undefined
  isSubmitted.value = true
  if (password1.value !== password2.value) return
  isLoading.value = true

  try {
    // This will either succeed and navigate away, or throw an error.
    const result = await authStore.register({
      name: displayName.value,
      email: email.value,
      password: password1.value,
    })
    console.log('Register result', result)
    if (result.mediaFolder === null) {
      console.log('Pushing router to setup')
      await router.push({ name: 'setup' })
    } else {
      console.log('Pushing router to home')
      await router.push({ name: 'home' })
    }
  } catch (e) {
    console.log("Is axios error", isAxiosError(e))
    if (isAxiosError(e)) {
      console.log("emv=", e.response?.data.error)
      errorMessage.value = e.response?.data.error
    }else if (e instanceof Error) {
      snackbarStore.error('Could not register: ' + e.message, e as Error)
    }
  } finally {
    // This will run whether the login succeeds or fails.
    isLoading.value = false
  }
}
</script>

<template>
  <my-main-container>
    <div class="register-container">
      <setup-layout :caption-text="false" text="Let's set up your account to get started.">
        <h1 class="nice-h1">Create your account.</h1>
      </setup-layout>

      <v-form class="register-form" @submit.prevent="register()" ref="form">
        <div class="row-input mb-3">
          <v-text-field
            class="text-input"
            prepend-icon="mdi-account-outline"
            variant="outlined"
            ref="userInput"
            rounded
            :rules="isSubmitted ? [rules.userRequired] : []"
            v-model="displayName"
            label="Display Name"
            color="primary"
            base-color="outline"
            placeholder="Ruurd Bijlsma"
            :min-width="280"
            autocomplete="name"
          />
          <v-text-field
            class="text-input ml-5"
            prepend-icon="mdi-email-outline"
            append-icon="empty"
            variant="outlined"
            rounded
            :rules="isSubmitted ? [rules.mailRequired, rules.min] : []"
            v-model="email"
            label="Email"
            color="primary"
            base-color="rgba(0,0,0,0.5)"
            placeholder="user@example.com"
            :min-width="330"
            autocomplete="email"
          />
        </div>
        <div class="row-input">
          <v-text-field
            class="text-input"
            variant="outlined"
            :prepend-icon="showPassword ? 'mdi-lock-open-outline' : 'mdi-lock-outline'"
            :rules="isSubmitted ? [rules.passRequired] : []"
            :type="showPassword ? 'text' : 'password'"
            rounded
            v-model="password1"
            color="primary"
            base-color="outline"
            label="Password"
            :min-width="280"
            autocomplete="new-password"
          ></v-text-field>
          <v-text-field
            class="text-input ml-5"
            variant="outlined"
            prepend-icon="mdi-lock-check-outline"
            :append-icon="showPassword ? 'mdi-eye-outline' : 'mdi-eye-off-outline'"
            @click:append="showPassword = !showPassword"
            :rules="isSubmitted ? [rules.passRequired, rules.noMatch] : []"
            :type="showPassword ? 'text' : 'password'"
            rounded
            v-model="password2"
            color="primary"
            base-color="outline"
            label="Repeat Password"
            :min-width="330"
            autocomplete="new-password"
          ></v-text-field>
        </div>
        <div class="center">
          <v-btn
            class="mt-5"
            type="submit"
            variant="tonal"
            color="primary"
            rounded
            density="default"
            width="240"
            :loading="isLoading"
            >Create Account
          </v-btn>
        </div>
      </v-form>

      <div class="mt-5 login-link text-caption">
        <span class="mr-2">Already have an account?</span>
        <v-btn variant="plain" class="ml-2" color="primary" to="/login" rounded density="compact"
          >Login
        </v-btn>
      </div>

      <my-alert
        v-model="errorMessage"
        icon="mdi-alert-octagon"
        class="mt-8"
        background-color="error-container"
        text-color="on-error-container"
      />
    </div>
  </my-main-container>
</template>

<style scoped>
.register-container {
  padding: 20px;
}

.row-input {
  display: flex;
}

.nice-h1 {
  font-size: 35px;
  font-weight: 600;
  opacity: 0.9;
}

.row-input > *:nth-child(1) {
  width: 46%;
}

.row-input > *:nth-child(2) {
  width: 54%;
}

.center {
  display: flex;
  justify-content: center;
}

.rotating {
  animation: rotate 2s ease-in-out infinite;
}

@keyframes rotate {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.login-link {
  display: flex;
  justify-content: center;
  color: rgba(var(--v-theme-on-surface), 0.7);
  vertical-align: middle;
  line-height: 24px;
}
</style>
