<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { useMMarket } from "~/composables/useMMarket";
import { useLocale } from "~/composables/useLocale";
import { useToast } from "~/composables/useToast";

const { currentUser, login, register, logout, refreshCurrentUserOnly, exchangeRate } = useMMarket();
const { locale, setLocale, t } = useLocale();
const { toasts, pushError, removeToast } = useToast();
const ONBOARDING_SEEN_KEY = "p23-market-onboarding-seen";
const ROUND_ANNOUNCEMENT_SEEN_KEY = "holymarket-round-announcement-seen-v2";

const route = useRoute();
const showLogin = ref(false);
const showRegister = ref(false);
const showPanel = ref(false);
const loginUsername = ref("");
const loginPassword = ref("");
const isLoginSubmitting = ref(false);
const isRegisterSubmitting = ref(false);
const isBalanceRefreshing = ref(false);
const showOnboarding = ref(false);
const showRoundAnnouncement = ref(false);
const onboardingStep = ref(0);
const registerName = ref("");
const registerUsername = ref("");
const registerPassword = ref("");
const registerAvatarIndex = ref(0);
const avatarOptions = computed(() => Array.from({ length: 25 }, (_, index) => index));
const onboardingSlides = computed(() => [
  {
    title: t("onboard.step1Title"),
    body: t("onboard.step1Body", { rate: exchangeRate }),
    hint: t("onboard.step1Hint")
  },
  {
    title: t("onboard.step2Title"),
    body: t("onboard.step2Body"),
    hint: t("onboard.step2Hint")
  },
  {
    title: t("onboard.step3Title"),
    body: t("onboard.step3Body"),
    hint: t("onboard.step3Hint")
  }
]);
const isOnboardingLastStep = computed(
  () => onboardingStep.value >= onboardingSlides.value.length - 1
);

const openLogin = () => {
  showRegister.value = false;
  showLogin.value = true;
};

const openRegister = () => {
  showLogin.value = false;
  showRegister.value = true;
};

const markOnboardingSeen = () => {
  if (!process.client) return;
  localStorage.setItem(ONBOARDING_SEEN_KEY, "1");
};

const openOnboarding = (reset = true, rememberSeen = true) => {
  if (reset) onboardingStep.value = 0;
  if (rememberSeen) markOnboardingSeen();
  showOnboarding.value = true;
};

const markRoundAnnouncementSeen = () => {
  if (!process.client) return;
  localStorage.setItem(ROUND_ANNOUNCEMENT_SEEN_KEY, "1");
};

const openRoundAnnouncement = () => {
  showRoundAnnouncement.value = true;
};

const closeRoundAnnouncement = () => {
  showRoundAnnouncement.value = false;
  markRoundAnnouncementSeen();
  if (!process.client) return;
  const seenOnboarding = localStorage.getItem(ONBOARDING_SEEN_KEY) === "1";
  if (!seenOnboarding) openOnboarding(true, true);
};

const closeOnboarding = (remember = true) => {
  showOnboarding.value = false;
  if (!remember) return;
  markOnboardingSeen();
};

const nextOnboarding = () => {
  if (isOnboardingLastStep.value) {
    closeOnboarding(true);
    return;
  }
  onboardingStep.value += 1;
};

const prevOnboarding = () => {
  onboardingStep.value = Math.max(0, onboardingStep.value - 1);
};

const avatarPath = (index: number) => `/images/avatars/${index}.png`;

const submitLogin = async () => {
  if (isLoginSubmitting.value) return;
  isLoginSubmitting.value = true;
  try {
    const result = await login(loginUsername.value, loginPassword.value);
    if (!result.ok) pushError(result.message);
    if (result.ok) {
      showLogin.value = false;
      loginUsername.value = "";
      loginPassword.value = "";
    }
  } finally {
    isLoginSubmitting.value = false;
  }
};

const submitRegister = async () => {
  if (isRegisterSubmitting.value) return;
  isRegisterSubmitting.value = true;
  try {
    const result = await register(
      registerName.value,
      registerUsername.value,
      registerPassword.value,
      registerAvatarIndex.value,
    );
    if (!result.ok) pushError(result.message);
    if (result.ok) {
      showRegister.value = false;
      registerName.value = "";
      registerUsername.value = "";
      registerPassword.value = "";
      registerAvatarIndex.value = 0;
    }
  } finally {
    isRegisterSubmitting.value = false;
  }
};

const signOut = async () => {
  await logout();
};

const refreshBalance = async () => {
  if (isBalanceRefreshing.value) return;
  isBalanceRefreshing.value = true;
  try {
    await refreshCurrentUserOnly();
  } finally {
    isBalanceRefreshing.value = false;
  }
};

const links = [
  { to: "/", labelKey: "nav.home" },
  { to: "/players", labelKey: "nav.players" },
  { to: "/transfer", labelKey: "nav.transfer" },
  { to: "/invoices/my", labelKey: "nav.invoices" },
  { to: "/transactions", labelKey: "nav.history" },
  { to: "/bank", labelKey: "nav.bank" },
  { to: "/settlement", labelKey: "nav.settlement" },
  { to: "/about", labelKey: "nav.about" },
];

const desktopPrimaryLinks = [
  { to: "/transfer", labelKey: "nav.transfer", icon: "⇄" },
  { to: "/play", labelKey: "nav.arena", icon: "⚔" },
  { to: "/bank", labelKey: "nav.bank", icon: "🏦" },
];

const desktopSecondaryLinks = links.filter(
  (link) => !["/transfer", "/bank"].includes(link.to),
);

onMounted(() => {
  if (!process.client) return;
  const seenRoundAnnouncement = localStorage.getItem(ROUND_ANNOUNCEMENT_SEEN_KEY) === "1";
  if (!seenRoundAnnouncement) {
    openRoundAnnouncement();
    return;
  }
  const seen = localStorage.getItem(ONBOARDING_SEEN_KEY) === "1";
  if (!seen) openOnboarding(true, true);
});
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <div class="container topbar__inner">
        <NuxtLink class="brand" to="/">
          <img class="coin-icon" src="/images/dim-coin2.png" alt="coin" />
          <span>Holymarket</span>
        </NuxtLink>

        <div class="topbar__right">
          <div class="topbar__actions">
            <button v-if="!currentUser" class="btn" type="button" @click="openLogin">
              {{ t("auth.login") }}
            </button>
            <button v-if="!currentUser" class="btn btn--primary" type="button" @click="openRegister">
              {{ t("auth.register") }}
            </button>
            <div v-if="currentUser" class="topbar__player">
              <img :src="avatarPath(currentUser.avatarIndex || 0)" alt="" class="topbar__avatar" />
              <div class="topbar__player-main">
                <p class="topbar__player-name">{{ currentUser.displayName }}</p>
                <p class="topbar__player-coin">
                  {{ currentUser.coin }} <img src="/images/dim-coin2.png" alt="coin" class="coin-unit coin-unit--sm" />
                </p>
              </div>
              <button
                class="btn topbar__balance-refresh"
                type="button"
                :aria-label="t('sidebar.refreshBalance')"
                :disabled="isBalanceRefreshing"
                @click="refreshBalance"
              >
                {{ isBalanceRefreshing ? "..." : "↻" }}
              </button>
            </div>
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
      <nav class="desktop-only desktop-nav card">
        <div class="desktop-nav__primary">
          <NuxtLink
            v-for="link in desktopPrimaryLinks"
            :key="`desk-primary-${link.to}`"
            :to="link.to"
            class="desktop-nav__feature"
            :class="{ 'is-active': route.path === link.to }"
          >
            <span class="desktop-nav__feature-icon" aria-hidden="true">{{ link.icon }}</span>
            <span>{{ t(link.labelKey) }}</span>
          </NuxtLink>
        </div>
        <div class="desktop-nav__secondary">
          <NuxtLink
            v-for="link in desktopSecondaryLinks"
            :key="`desk-secondary-${link.to}`"
            :to="link.to"
            class="desktop-nav__item"
            :class="{ 'is-active': route.path === link.to }"
          >
            {{ t(link.labelKey) }}
          </NuxtLink>
        </div>
      </nav>

      <slot />
    </main>

    <NuxtLink class="arena-fab" to="/play" :aria-label="t('nav.arena')">
      <span class="arena-fab__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M8.1 7.2h7.8c2 0 3.2.6 3.8 2l1.1 2.7c.6 1.5.5 3.2-.2 4.6l-.7 1.4c-.4.8-1.2 1.3-2.1 1.3-.9 0-1.8-.5-2.2-1.3l-.8-1.5h-5.6l-.8 1.5c-.4.8-1.2 1.3-2.2 1.3-.9 0-1.7-.5-2.1-1.3l-.7-1.4c-.7-1.4-.8-3.1-.2-4.6L4.3 9.2c.6-1.4 1.8-2 3.8-2z" />
          <rect x="5.7" y="10.4" width="3.1" height="1.1" rx=".4" fill="#f5f5f5" />
          <rect x="6.7" y="9.4" width="1.1" height="3.1" rx=".4" fill="#f5f5f5" />
          <circle cx="16.3" cy="10.2" r=".8" fill="#f5f5f5" />
          <circle cx="18.1" cy="11.3" r=".8" fill="#f5f5f5" />
          <circle cx="14.7" cy="11.9" r=".8" fill="#f5f5f5" />
          <circle cx="16.5" cy="13" r=".8" fill="#f5f5f5" />
          <circle cx="10.1" cy="13.2" r="1.1" fill="#f5f5f5" opacity=".95" />
          <circle cx="13.9" cy="13.2" r="1.1" fill="#f5f5f5" opacity=".95" />
        </svg>
      </span>
    </NuxtLink>

    <Transition name="slideover">
      <div v-if="showPanel" class="slideover" @click.self="showPanel = false">
        <aside class="slideover__panel">
          <header class="slideover__header">
            <div class="slideover__title-wrap">
              <img src="/images/dim-coin2.png" alt="coin" class="slideover__logo" />
              <div>
                <p class="slideover__kicker">{{ t("sidebar.menu") }}</p>
                <h3 class="slideover__title">Holymarket</h3>
              </div>
            </div>
            <button class="btn slideover__close" type="button" :aria-label="t('sidebar.close')" @click="showPanel = false">
              {{ t("sidebar.close") }}
            </button>
          </header>

          <div class="slideover__body">
            <section class="slideover__block slideover__block--profile">
              <p class="slideover__label">{{ t("sidebar.profile") }}</p>
              <div v-if="currentUser" class="slideover__profile">
                <div class="slideover__profile-head">
                  <img :src="avatarPath(currentUser.avatarIndex || 0)" alt="" class="slideover__avatar" />
                  <div class="slideover__profile-main">
                    <p class="slideover__name">{{ currentUser.displayName }}</p>
                    <p class="slideover__username">@{{ currentUser.username }}</p>
                  </div>
                </div>
                <div class="slideover__meta-cards">
                  <article class="slideover__meta-card">
                    <span>{{ t("common.coin") }}</span>
                    <strong>{{ currentUser.coin }}</strong>
                  </article>
                  <article class="slideover__meta-card">
                    <span>{{ t("common.debt") }}</span>
                    <strong>{{ currentUser.bankDebt }}</strong>
                  </article>
                </div>
                <div class="slideover__profile-actions">
                  <button
                    class="btn slideover__refresh"
                    type="button"
                    :disabled="isBalanceRefreshing"
                    @click="showPanel = false; refreshBalance()"
                  >
                    {{ isBalanceRefreshing ? "..." : t("sidebar.refreshBalance") }}
                  </button>
                  <button class="btn btn--danger slideover__logout" type="button" @click="showPanel = false; signOut()">
                    {{ t("auth.logout") }}
                  </button>
                </div>
              </div>
              <button
                v-else
                class="btn btn--primary slideover__login"
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
                    <svg v-else-if="link.to === '/invoices/my'" viewBox="0 0 24 24" fill="none">
                      <rect x="4" y="3.5" width="16" height="17" rx="2" stroke="currentColor" stroke-width="1.8" />
                      <path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
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
              <button class="btn slideover__guide" type="button" @click="showPanel = false; openOnboarding(false, false)">
                {{ t("onboard.open") }}
              </button>
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
                <rect x="4" y="12" width="4" height="8" rx="1" stroke="currentColor" stroke-width="1.8" />
                <rect x="10" y="9" width="4" height="11" rx="1" stroke="currentColor" stroke-width="1.8" />
                <rect x="16" y="6" width="4" height="14" rx="1" stroke="currentColor" stroke-width="1.8" />
                <path d="M4 8.5h16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
              </svg>
            </span>
            <span class="mobile-nav__label">{{ t("nav.rank") }}</span>
          </NuxtLink>
          <NuxtLink
            class="mobile-nav__item mobile-nav__transfer"
            :class="{ 'is-active': route.path === '/transfer' }"
            to="/transfer"
          >
            <span class="mobile-nav__chip">D</span>
            <span class="mobile-nav__label">{{ t("nav.transfer") }}</span>
          </NuxtLink>
          <NuxtLink
            class="mobile-nav__item"
            :class="{ 'is-active': route.path === '/invoices/my' }"
            to="/invoices/my"
          >
            <span class="mobile-nav__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <rect x="4" y="3.5" width="16" height="17" rx="2" stroke="currentColor" stroke-width="1.8" />
                <path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
              </svg>
            </span>
            <span class="mobile-nav__label">{{ t("nav.invoices") }}</span>
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

    <TransitionGroup name="toast" tag="div" class="toast-stack">
      <article
        v-for="toast in toasts"
        :key="toast.id"
        class="toast"
        :class="`toast--${toast.type}`"
        role="alert"
      >
        <p>{{ toast.message }}</p>
        <button type="button" class="toast__close" aria-label="close" @click="removeToast(toast.id)">✕</button>
      </article>
    </TransitionGroup>

    <div v-if="showRoundAnnouncement" class="modal" @click.self="closeRoundAnnouncement">
      <div class="modal__panel round-modal">
        <header class="round-modal__head">
          <img src="/images/dim-coin2.png" alt="" class="round-modal__icon" aria-hidden="true" />
          <h3 class="round-modal__title">{{ t("roundPopup.title") }}</h3>
        </header>
        <p class="round-modal__body">{{ t("roundPopup.body1") }}</p>
        <p class="round-modal__body">{{ t("roundPopup.body2") }}</p>
        <button class="btn btn--primary round-modal__cta" type="button" @click="closeRoundAnnouncement">
          {{ t("roundPopup.cta") }}
        </button>
      </div>
    </div>

    <div v-if="showOnboarding" class="modal" @click.self="closeOnboarding(false)">
      <div class="modal__panel onboard-modal">
        <header class="onboard-modal__head">
          <div class="onboard-modal__title-wrap">
            <img src="/images/dim-coin2.png" alt="" class="onboard-modal__icon" aria-hidden="true" />
            <div>
              <h3 class="onboard-modal__title">{{ t("onboard.title") }}</h3>
              <p class="onboard-modal__subtitle">{{ t("onboard.subtitle") }}</p>
            </div>
          </div>
          <div class="onboard-modal__head-actions">
            <div class="lang-switch onboard-modal__lang" role="group" aria-label="Language">
              <button class="lang-switch__btn" :class="{ 'is-active': locale === 'en' }" type="button" @click="setLocale('en')">EN</button>
              <button class="lang-switch__btn" :class="{ 'is-active': locale === 'th' }" type="button" @click="setLocale('th')">TH</button>
            </div>
            <button class="btn onboard-modal__close" type="button" @click="closeOnboarding(true)">✕</button>
          </div>
        </header>

        <div class="onboard-modal__stepper">
          <span
            v-for="(_, index) in onboardingSlides"
            :key="`onboard-dot-${index}`"
            class="onboard-modal__dot"
            :class="{ 'is-active': onboardingStep === index }"
          />
        </div>

        <article class="onboard-slide">
          <div class="onboard-slide__visual" :class="`is-step-${onboardingStep + 1}`">
            <img v-if="onboardingStep === 0" src="/images/dim-coin2.png" alt="DIM-coin" />
            <svg v-else-if="onboardingStep === 1" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M3 9L12 4l9 5v2H3V9z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" />
              <path d="M5 11v7M9 11v7M15 11v7M19 11v7M3 20h18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
            </svg>
            <svg v-else viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8" />
              <path d="M12 7v10M7 12h10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
            </svg>
          </div>
          <h4 class="onboard-slide__title">{{ onboardingSlides[onboardingStep]?.title }}</h4>
          <p class="onboard-slide__body">{{ onboardingSlides[onboardingStep]?.body }}</p>
          <p class="onboard-slide__hint">{{ onboardingSlides[onboardingStep]?.hint }}</p>
        </article>

        <div class="onboard-modal__actions">
          <button class="btn onboard-modal__back" type="button" :disabled="onboardingStep === 0" @click="prevOnboarding">
            {{ t("onboard.back") }}
          </button>
          <button class="btn btn--primary onboard-modal__next" type="button" @click="nextOnboarding">
            {{ isOnboardingLastStep ? t("onboard.done") : t("onboard.next") }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="showLogin" class="modal" @click.self="showLogin = false">
      <div class="modal__panel auth-modal">
        <header class="auth-modal__head">
          <div class="auth-modal__title-wrap">
            <img src="/images/dim-coin2.png" alt="" class="auth-modal__icon" aria-hidden="true" />
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
              :disabled="isLoginSubmitting"
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
              :disabled="isLoginSubmitting"
              required
            />
          </div>
          <button class="btn btn--primary auth-modal__submit" type="submit" :disabled="isLoginSubmitting">
            {{ isLoginSubmitting ? "Logging in..." : t("auth.login") }}
          </button>
          <button class="btn auth-modal__alt" type="button" :disabled="isLoginSubmitting" @click="showLogin = false; openRegister()">
            {{ t("auth.register") }}
          </button>
        </form>
      </div>
    </div>

    <div v-if="showRegister" class="modal" @click.self="showRegister = false">
      <div class="modal__panel auth-modal">
        <header class="auth-modal__head">
          <div class="auth-modal__title-wrap">
            <img src="/images/dim-coin2.png" alt="" class="auth-modal__icon" aria-hidden="true" />
            <div>
              <h3 class="auth-modal__title">{{ t("auth.register") }}</h3>
              <p class="auth-modal__subtitle">{{ t("auth.registerHint") }}</p>
            </div>
          </div>
          <button class="btn auth-modal__close" type="button" :disabled="isRegisterSubmitting" @click="showRegister = false">✕</button>
        </header>
        <form class="form auth-modal__form" @submit.prevent="submitRegister">
          <div class="field">
            <label for="register-name">{{ t("auth.displayName") }}</label>
            <input
              id="register-name"
              v-model="registerName"
              class="input"
              :placeholder="t('auth.registerNamePlaceholder')"
              :disabled="isRegisterSubmitting"
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
              :disabled="isRegisterSubmitting"
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
              :disabled="isRegisterSubmitting"
              required
            />
          </div>
          <div class="field">
            <label>{{ t("auth.avatar") }}</label>
            <p class="muted auth-avatar__hint">{{ t("auth.avatarHint") }}</p>
            <div class="auth-avatar-grid">
              <button
                v-for="index in avatarOptions"
                :key="`avatar-${index}`"
                type="button"
                class="auth-avatar-grid__item"
                :class="{ 'is-active': registerAvatarIndex === index }"
                :aria-label="`${t('auth.avatar')} ${index}`"
                :disabled="isRegisterSubmitting"
                @click="registerAvatarIndex = index"
              >
                <img :src="avatarPath(index)" :alt="`avatar-${index}`" />
              </button>
            </div>
          </div>
          <button class="btn btn--primary auth-modal__submit" type="submit" :disabled="isRegisterSubmitting">
            {{ isRegisterSubmitting ? "Registering..." : t("auth.register") }}
          </button>
          <button class="btn auth-modal__alt" type="button" :disabled="isRegisterSubmitting" @click="showRegister = false; openLogin()">
            {{ t("auth.login") }}
          </button>
        </form>
      </div>
    </div>

  </div>
</template>
