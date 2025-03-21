<template>
  <v-main class="main">
    <div class="container">
      <div class="title-box">
        <div class="left-title">
          <div
            :class="{ rotating: auth.registerLoading }"
            class="big-image"
          ></div>
        </div>
        <div class="right-title">
          <h1>Welcome to <span>Ruurd Photos</span></h1>
          <h3>Let's set up your account to get started.</h3>
        </div>
      </div>

      <v-divider class="mt-10 mb-5"></v-divider>

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
            base-color="rgba(0,0,0,0.5)"
            placeholder="Ruurd Bijlsma"
          />
          <v-text-field
            class="text-input ml-5"
            prepend-icon="mdi-email-outline"
            append-icon="empty"
            variant="outlined"
            rounded
            :rules="
              isSubmitted
                ? [rules.mailRequired, rules.min, rules.authError]
                : []
            "
            v-model="email"
            label="Email"
            color="primary"
            base-color="rgba(0,0,0,0.5)"
            placeholder="user@example.com"
          />
        </div>
        <div class="row-input">
          <v-text-field
            class="text-input"
            variant="outlined"
            :prepend-icon="
              showPassword ? 'mdi-lock-open-outline' : 'mdi-lock-outline'
            "
            :rules="isSubmitted ? [rules.passRequired] : []"
            :type="showPassword ? 'text' : 'password'"
            rounded
            v-model="password1"
            color="primary"
            base-color="rgba(0,0,0,0.5)"
            label="Password"
          ></v-text-field>
          <v-text-field
            class="text-input ml-5"
            variant="outlined"
            prepend-icon="mdi-lock-check-outline"
            :append-icon="
              showPassword ? 'mdi-eye-outline' : 'mdi-eye-off-outline'
            "
            @click:append="showPassword = !showPassword"
            :rules="isSubmitted ? [rules.passRequired, rules.noMatch] : []"
            :type="showPassword ? 'text' : 'password'"
            rounded
            v-model="password2"
            color="primary"
            base-color="rgba(0,0,0,0.5)"
            label="Repeat Password"
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
            :loading="auth.registerLoading"
            >Create Account
          </v-btn>
        </div>
      </v-form>
    </div>
  </v-main>
</template>

<script setup lang="ts">
import type { VForm } from 'vuetify/components'
import { useAuthStore } from '@/stores/auth'
import { onMounted, type Ref, ref } from 'vue'
import router from '@/plugins/router'

const auth = useAuthStore()
const userInput: Ref<null | HTMLElement> = ref(null)
const form: Ref<null | VForm> = ref(null)

onMounted(() => {
  console.log(userInput.value?.focus())
})

const showPassword = ref(false)
const displayName = ref('')
const email = ref('')
const password1 = ref('')
const password2 = ref('')
const isSubmitted = ref(false)

const rules = {
  userRequired: (v: string) => !!v || 'Display name is required.',
  mailRequired: (v: string) => !!v || 'Email is required.',
  passRequired: (v: string) => !!v || 'Password is required.',
  min: (v: string) => v.length >= 6 || `Min 6 characters`,
  authError: () => !auth.registerError || auth.registerError.description,
  noMatch: () => password1.value == password2.value || 'Passwords must match',
}

async function register() {
  isSubmitted.value = true
  if (password1.value !== password2.value) return

  const result = await auth.register(
    displayName.value,
    email.value,
    password1.value,
  )
  if (result) {
    await router.push('/setup')
  } else {
    await form.value?.validate()
  }
}
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
  opacity: 0.6;
}

.container span {
  font-weight: 600;
}

.container h3 {
  font-weight: 300;
  font-size: 20px;
}

.row-input {
  display: flex;
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
</style>
