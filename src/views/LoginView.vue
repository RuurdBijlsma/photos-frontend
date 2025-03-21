<template>
  <v-main class="login-main">
    <div class="login-container">
      <div class="left-pane">
        <div :class="{ rotating: auth.loginLoading }" class="big-image"></div>
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
            :prepend-icon="
              showPassword ? 'mdi-lock-open-outline' : 'mdi-lock-outline'
            "
            :append-icon="
              showPassword ? 'mdi-eye-outline' : 'mdi-eye-off-outline'
            "
            @click:append="showPassword = !showPassword"
            :rules="isSubmitted ? [rules.passRequired, rules.authError] : []"
            :type="showPassword ? 'text' : 'password'"
            rounded
            v-model="password"
            color="primary"
            base-color="rgba(0,0,0,0.5)"
            label="Password"
          ></v-text-field>
          <v-btn
            class="mt-4"
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
      </div>
    </div>
  </v-main>
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
const showPassword = ref(false)
const email = ref('')
const password = ref('')
const isSubmitted = ref(false)

async function login() {
  isSubmitted.value = true

  const result = await auth.login(email.value, password.value)
  if (result) {
    await router.push('/')
  } else {
    await form.value?.validate()
  }
}
</script>

<style scoped>
.login-main {
  position: fixed;
  width: 100%;
  height: 100%;
  background-color: rgb(220, 220, 239);
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
