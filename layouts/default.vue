<script setup lang="ts">
import { ref } from "vue";
import { useRoute } from "vue-router";
import { useMMarket } from "~/composables/useMMarket";
import { useLocale } from "~/composables/useLocale";

const { currentUser, login, register, logout } = useMMarket();
const { locale, setLocale, t } = useLocale();

const route = useRoute();
const showLogin = ref(false);
const showRegister = ref(false);
const showPanel = ref(false);
const loginUsername = ref("");
const loginPassword = ref("");
const registerName = ref("");
const registerUsername = ref("");
const registerPassword = ref("");
const authMessage = ref("");

const openLogin = () => {
  authMessage.value = "";
  showRegister.value = false;
  showLogin.value = true;
};

const openRegister = () => {
  authMessage.value = "";
  showLogin.value = false;
  showRegister.value = true;
};

const submitLogin = () => {
  const result = login(loginUsername.value, loginPassword.value);
  authMessage.value = result.message;
  if (result.ok) {
    showLogin.value = false;
    loginUsername.value = "";
    loginPassword.value = "";
  }
};

const submitRegister = () => {
  const result = register(registerName.value, registerUsername.value, registerPassword.value);
  authMessage.value = result.message;
  if (result.ok) {
    showRegister.value = false;
    registerName.value = "";
    registerUsername.value = "";
    registerPassword.value = "";
  }
};

const signOut = () => {
  logout();
  authMessage.value = t("auth.loggedOut");
};

const links = [
  { to: "/", labelKey: "nav.home" },
  { to: "/players", labelKey: "nav.players" },
  { to: "/transfer", labelKey: "nav.transfer" },
  { to: "/transactions", labelKey: "nav.history" },
  { to: "/bank", labelKey: "nav.bank" },
  { to: "/settlement", labelKey: "nav.settlement" },
  { to: "/about", labelKey: "nav.about" },
];
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <div class="container topbar__inner">
        <NuxtLink class="brand" to="/">
          <img class="coin-icon" src="/images/m-coin.svg" alt="coin" />
          <span>P23 Market</span>
        </NuxtLink>

        <div class="topbar__right">
          <div class="topbar__actions">
            <button v-if="!currentUser" class="btn" type="button" @click="openLogin">
              {{ t("auth.login") }}
            </button>
            <button v-if="!currentUser" class="btn btn--primary" type="button" @click="openRegister">
              {{ t("auth.register") }}
            </button>
            <button v-if="currentUser" class="btn btn--danger" type="button" @click="signOut">
              {{ t("auth.logout") }}
            </button>
            <button class="btn hamburger-btn" type="button" :aria-label="t('sidebar.menu')" @click="showPanel = true">
              <span></span>
              <span></span>
              <span></span>
            </button>
          </div>
        </div>
      </div>
    </header>

    <main class="container section">
      <nav class="desktop-only row card">
        <NuxtLink
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          class="nav-link"
          :class="{
            muted: route.path !== link.to,
            active: route.path === link.to,
          }"
        >
          {{ t(link.labelKey) }}
        </NuxtLink>
      </nav>

      <slot />
    </main>

    <Transition name="slideover">
      <div v-if="showPanel" class="slideover" @click.self="showPanel = false">
        <aside class="slideover__panel">
          <header class="slideover__header">
            <div class="slideover__title-wrap">
              <img src="/images/m-coin.svg" alt="coin" class="slideover__logo" />
              <div>
                <p class="slideover__kicker">{{ t("sidebar.menu") }}</p>
                <h3 class="slideover__title">P23 Market</h3>
              </div>
            </div>
            <button class="btn slideover__close" type="button" :aria-label="t('sidebar.close')" @click="showPanel = false">
              {{ t("sidebar.close") }}
            </button>
          </header>

          <div class="slideover__body">
            <section class="slideover__block">
              <p class="slideover__label">{{ t("sidebar.profile") }}</p>
              <div v-if="currentUser" class="slideover__profile">
                <div class="slideover__meta-list">
                  <p class="slideover__meta"><span>{{ t("common.coin") }}</span><strong>{{ currentUser.coin }}</strong></p>
                  <p class="slideover__meta"><span>{{ t("common.debt") }}</span><strong>{{ currentUser.bankDebt }}</strong></p>
                </div>
              </div>
              <button
                v-else
                class="btn btn--primary"
                type="button"
                @click="showPanel = false; openLogin()"
              >
                {{ t("auth.login") }}
              </button>
            </section>

            <div class="slideover__menu-wrap">
              <div class="slideover__menu-list">
                <NuxtLink
                  v-for="link in links"
                  :key="`slide-${link.to}`"
                  :to="link.to"
                  class="slideover__menu-item"
                  :class="{ 'is-active': route.path === link.to }"
                  @click="showPanel = false"
                >
                  <span class="slideover__menu-icon" aria-hidden="true">
                    <svg v-if="link.to === '/'" viewBox="0 0 24 24" fill="none">
                      <path d="M3 11.2L12 4l9 7.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                      <path d="M6 10.5V20h12v-9.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                    </svg>
                    <svg v-else-if="link.to === '/players'" viewBox="0 0 24 24" fill="none">
                      <circle cx="8" cy="8.5" r="3" stroke="currentColor" stroke-width="1.8" />
                      <circle cx="16.5" cy="9.5" r="2.5" stroke="currentColor" stroke-width="1.8" />
                      <path d="M3.5 19c0-2.6 2-4.7 4.5-4.7s4.5 2.1 4.5 4.7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                      <path d="M13 19c0-2 1.6-3.7 3.5-3.7S20 17 20 19" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                    </svg>
                    <svg v-else-if="link.to === '/transfer'" viewBox="0 0 24 24" fill="none">
                      <path d="M5 8h14M13 4l6 4-6 4M19 16H5M11 12l-6 4 6 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                    <svg v-else-if="link.to === '/transactions'" viewBox="0 0 24 24" fill="none">
                      <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" stroke-width="1.8" />
                      <path d="M8 9h8M8 13h8M8 17h5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                    </svg>
                    <svg v-else-if="link.to === '/bank'" viewBox="0 0 24 24" fill="none">
                      <path d="M3 9L12 4l9 5v2H3V9z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" />
                      <path d="M5 11v7M9 11v7M15 11v7M19 11v7M3 20h18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                    </svg>
                    <svg v-else-if="link.to === '/settlement'" viewBox="0 0 24 24" fill="none">
                      <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                      <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8" />
                    </svg>
                    <svg v-else viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8" />
                      <path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                    </svg>
                  </span>
                  {{ t(link.labelKey) }}
                </NuxtLink>
              </div>
            </div>

            <div class="slideover__lang-footer">
              <div class="lang-switch slideover__lang" role="group" aria-label="Language">
                <button class="lang-switch__btn" :class="{ 'is-active': locale === 'en' }" type="button" @click="setLocale('en')">EN</button>
                <button class="lang-switch__btn" :class="{ 'is-active': locale === 'th' }" type="button" @click="setLocale('th')">TH</button>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </Transition>

    <footer class="mobile-nav">
      <div class="mobile-nav__dock">
        <div class="mobile-nav__inner">
          <NuxtLink
            class="mobile-nav__item"
            :class="{ 'is-active': route.path === '/' }"
            to="/"
          >
            <span class="mobile-nav__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M3 11.2L12 4l9 7.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                <path d="M6 10.5V20h12v-9.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
              </svg>
            </span>
            <span class="mobile-nav__label">{{ t("nav.home") }}</span>
          </NuxtLink>
          <NuxtLink
            class="mobile-nav__item"
            :class="{ 'is-active': route.path === '/players' }"
            to="/players"
          >
            <span class="mobile-nav__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <circle cx="8" cy="8.5" r="3" stroke="currentColor" stroke-width="1.8" />
                <circle cx="16.5" cy="9.5" r="2.5" stroke="currentColor" stroke-width="1.8" />
                <path d="M3.5 19c0-2.6 2-4.7 4.5-4.7s4.5 2.1 4.5 4.7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                <path d="M13 19c0-2 1.6-3.7 3.5-3.7S20 17 20 19" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
              </svg>
            </span>
            <span class="mobile-nav__label">{{ t("nav.players") }}</span>
          </NuxtLink>
          <NuxtLink
            class="mobile-nav__item mobile-nav__transfer"
            :class="{ 'is-active': route.path === '/transfer' }"
            to="/transfer"
          >
            <span class="mobile-nav__chip">M</span>
            <span class="mobile-nav__label">{{ t("nav.transfer") }}</span>
          </NuxtLink>
          <NuxtLink
            class="mobile-nav__item"
            :class="{ 'is-active': route.path === '/transactions' }"
            to="/transactions"
          >
            <span class="mobile-nav__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" stroke-width="1.8" />
                <path d="M8 9h8M8 13h8M8 17h5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
              </svg>
            </span>
            <span class="mobile-nav__label">{{ t("nav.history") }}</span>
          </NuxtLink>
          <NuxtLink
            class="mobile-nav__item"
            :class="{ 'is-active': route.path === '/bank' }"
            to="/bank"
          >
            <span class="mobile-nav__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M3 9L12 4l9 5v2H3V9z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" />
                <path d="M5 11v7M9 11v7M15 11v7M19 11v7M3 20h18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
              </svg>
            </span>
            <span class="mobile-nav__label">{{ t("nav.bank") }}</span>
          </NuxtLink>
        </div>
      </div>
    </footer>

    <div v-if="showLogin" class="modal" @click.self="showLogin = false">
      <div class="modal__panel auth-modal">
        <header class="auth-modal__head">
          <div class="auth-modal__title-wrap">
            <img src="/images/m-coin.svg" alt="" class="auth-modal__icon" aria-hidden="true" />
            <div>
              <h3 class="auth-modal__title">{{ t("auth.login") }}</h3>
              <p class="auth-modal__subtitle">{{ t("auth.loginHint") }}</p>
            </div>
          </div>
          <button class="btn auth-modal__close" type="button" @click="showLogin = false">✕</button>
        </header>
        <form class="form auth-modal__form" @submit.prevent="submitLogin">
          <div class="field">
            <label for="login-username">{{ t("auth.username") }}</label>
            <input
              id="login-username"
              v-model="loginUsername"
              class="input"
              :placeholder="t('auth.loginPlaceholder')"
              required
            />
          </div>
          <div class="field">
            <label for="login-password">{{ t("auth.password") }}</label>
            <input
              id="login-password"
              v-model="loginPassword"
              class="input"
              type="password"
              :placeholder="t('auth.passwordPlaceholder')"
              required
            />
          </div>
          <button class="btn btn--primary auth-modal__submit" type="submit">{{ t("auth.login") }}</button>
          <button class="btn auth-modal__alt" type="button" @click="showLogin = false; openRegister()">
            {{ t("auth.register") }}
          </button>
        </form>
      </div>
    </div>

    <div v-if="showRegister" class="modal" @click.self="showRegister = false">
      <div class="modal__panel auth-modal">
        <header class="auth-modal__head">
          <div class="auth-modal__title-wrap">
            <img src="/images/m-coin.svg" alt="" class="auth-modal__icon" aria-hidden="true" />
            <div>
              <h3 class="auth-modal__title">{{ t("auth.register") }}</h3>
              <p class="auth-modal__subtitle">{{ t("auth.registerHint") }}</p>
            </div>
          </div>
          <button class="btn auth-modal__close" type="button" @click="showRegister = false">✕</button>
        </header>
        <form class="form auth-modal__form" @submit.prevent="submitRegister">
          <div class="field">
            <label for="register-name">{{ t("auth.displayName") }}</label>
            <input
              id="register-name"
              v-model="registerName"
              class="input"
              :placeholder="t('auth.registerNamePlaceholder')"
              required
            />
          </div>
          <div class="field">
            <label for="register-username">{{ t("auth.username") }}</label>
            <input
              id="register-username"
              v-model="registerUsername"
              class="input"
              :placeholder="t('auth.registerUserPlaceholder')"
              required
            />
          </div>
          <div class="field">
            <label for="register-password">{{ t("auth.password") }}</label>
            <input
              id="register-password"
              v-model="registerPassword"
              class="input"
              type="password"
              :placeholder="t('auth.passwordPlaceholder')"
              required
            />
          </div>
          <button class="btn btn--primary auth-modal__submit" type="submit">{{ t("auth.register") }}</button>
          <button class="btn auth-modal__alt" type="button" @click="showRegister = false; openLogin()">
            {{ t("auth.login") }}
          </button>
        </form>
      </div>
    </div>

    <div v-if="authMessage" class="container">
      <p class="muted">{{ authMessage }}</p>
    </div>
  </div>
</template>
