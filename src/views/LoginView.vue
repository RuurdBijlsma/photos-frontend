<template>
  <div class="login-background">
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
            :rules="[rules.mailRequired, rules.min]"
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
            class="text-input mb-1"
            variant="outlined"
            :prepend-icon="show ? 'mdi-lock-open-outline' : 'mdi-lock-outline'"
            :append-icon="show ? 'mdi-eye-outline' : 'mdi-eye-off-outline'"
            @click:append="show = !show"
            :rules="[rules.passRequired, rules.authError]"
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
          <p class="opacity-50">Don't have an account?</p>
          <v-btn
            variant="plain"
            base-color="rgba(0,0,0,0.5)"
            width="150"
            color="primary"
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
  mailRequired: (v: string) => !!v || 'Email is required.',
  passRequired: (v: string) => !!v || 'Password is required.',
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
  background-color: rgb(226, 219, 241);
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
  background-image: url('img/transparent-512.png');
  --size: 40px;
  height: var(--size);
  width: var(--size);
  background-color: black;
  background-size: 105%;
  background-position: center;
  border-radius: 100%;
  box-shadow: 0 4px 5px 0 rgba(0, 0, 0, 0.3);
}

.app-name {
  font-size: var(--font-size-big);
  margin-left: 20px;
}

.login-container {
  background: rgb(227, 222, 255, 0.7);
  background: linear-gradient(
    0deg,
    rgba(255, 232, 232, 0.5) 0%,
    rgb(255, 248, 252, 0.8) 100%
  );
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
