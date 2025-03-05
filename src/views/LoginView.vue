<template>
  <div class="login-background">
    <div class="blur-bg"></div>
    <v-main class="login-main">
      <v-card class="login-app-bar" color="transparent" flat>
        <div class="login-app-icon" />
        <p class="app-name">Ruurd Photos</p>
      </v-card>
      <div class="login-container">
        <h1>Log In</h1>
        <v-form class="login-form" @submit.prevent="login()" ref="form">
          <v-text-field
            class="mt-7 text-input"
            prepend-icon="mdi-account-outline"
            append-icon="empty"
            variant="outlined"
            ref="emailInput"
            rounded
            :rules="[rules.required, rules.min]"
            v-model="email"
            label="Email"
            color="primary"
            base-color="rgba(0,0,0,0.5)"
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
            class="text-input"
            variant="outlined"
            :prepend-icon="show ? 'mdi-lock-open-outline' : 'mdi-lock-outline'"
            :append-icon="show ? 'mdi-eye-outline' : 'mdi-eye-off-outline'"
            @click:append="show = !show"
            :rules="[rules.required, rules.authError]"
            :type="show ? 'text' : 'password'"
            rounded
            v-model="password"
            color="primary"
            base-color="rgba(0,0,0,0.5)"
            label="Password"
          ></v-text-field>
          <v-btn
            type="submit"
            variant="flat"
            color="primary"
            rounded
            density="default"
            :loading="auth.loginLoading"
            width="150"
            >Login
          </v-btn>
        </v-form>
        <div class="register-container">
          <p>Don't have an account?</p>
          <v-btn
            variant="outlined"
            base-color="rgba(0,0,0,0.5)"
            width="150"
            rounded
            density="default"
            >Sign up
          </v-btn>
        </div>
      </div>
    </v-main>
  </div>
</template>

<script setup lang="ts">
import { onMounted, type Ref, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import router from '@/plugins/router'
import type { VForm } from 'vuetify/components'

const auth = useAuthStore()
const emailInput: Ref<null | HTMLElement> = ref(null)
const form: Ref<null | VForm> = ref(null)

onMounted(() => {
  console.log(emailInput.value?.focus())
})

const rules = {
  required: (v: string) => !!v || 'Required.',
  min: (v: string) => v.length >= 6 || `Min 6 characters`,
  authError: () => !auth.hasError || `Credentials don't match.`,
}
const show = ref(false)
const email = ref('')
const password = ref('')

async function login() {
  const result = await auth.login(email.value, password.value)
  if (result) {
    await router.push('/')
  } else {
    await form.value?.validate()
  }
}
</script>

<style scoped>
.login-background {
  position: fixed;
  width: 100%;
  height: 100%;
  background-image: url('img/sahara.jpg');
  background-size: cover;
  background-position: center;
}

.blur-bg {
  position: fixed;
  width: 100%;
  height: 100%;
  backdrop-filter: blur(15px);
}

.login-app-bar {
  display: flex;
  flex-direction: row;
  align-items: center;
  width: 100%;
  justify-content: center;
  height: 80px;
}

.login-app-icon {
  background-image: url('img/white-border-512.png');
  --size: 40px;
  height: var(--size);
  width: var(--size);
  background-size: contain;
  background-position: center;
  border-radius: 100%;
  box-shadow:
    0 0 0 2px white,
    0 4px 5px 0 rgba(0, 0, 0, 0.3);
}

.app-name {
  font-size: var(--font-size-big);
  margin-left: 20px;
}

.login-container {
  background: rgb(227, 222, 255, 0.7);
  background: linear-gradient(
    0deg,
    rgb(234, 222, 255, 0.5) 0%,
    rgb(255, 248, 252, 0.8) 100%
  );
  backdrop-filter: blur(20px) contrast(110%) brightness(110%) saturate(150%);
  flex-grow: 1;
  border-radius: 30px;
  overflow: hidden;
  box-shadow: 0 10px 20px 0 rgba(0, 0, 0, 0.1);
  max-width: 500px;
  margin: 0 auto;
  padding: 30px;
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

.register-container {
  display: flex;
  align-items: center;
  flex-direction: column;
  gap: 0.8rem;
  margin-top: 2rem;
}

.register-container > p {
  opacity: 0.7;
  font-size: var(--font-size-normal);
}
</style>
