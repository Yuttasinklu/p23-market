<script setup lang="ts">
import { computed } from "vue";
import { useMMarket } from "~/composables/useMMarket";
import { useLocale } from "~/composables/useLocale";

const {
  currentUser,
  leaderboard,
  recentTransactions,
  totalCoin,
  txLabel,
  formatTime,
  playerById,
} = useMMarket();
const { t } = useLocale();

const topWinner = computed(() => leaderboard.value[0] || null);
const topLoser = computed(
  () => leaderboard.value[leaderboard.value.length - 1] || null,
);
</script>

<template>
  <div class="dashboard-page">
    <section class="dashboard-hero card">
      <div class="dashboard-hero__hud">
        <h1 class="title">{{ t("dashboard.title") }}</h1>
        <p class="subtitle">{{ t("dashboard.subtitle") }}</p>
      </div>
      <div class="dashboard-hero__side">
        <div class="dashboard-hero__coin-wrap">
          <img src="/images/m-coin.svg" alt="coin" class="dashboard-hero__coin" />
          <span class="dashboard-hero__coin-text">{{ t("dashboard.coinArena") }}</span>
        </div>
        <div class="dashboard-hero__quick">
          <article class="dashboard-hero__quick-card">
            <span class="dashboard-hero__quick-label">{{ t("dashboard.topWinner") }}</span>
            <strong>{{ topWinner?.displayName || "-" }}</strong>
          </article>
          <article class="dashboard-hero__quick-card">
            <span class="dashboard-hero__quick-label">{{ t("dashboard.topLoser") }}</span>
            <strong>{{ topLoser?.displayName || "-" }}</strong>
          </article>
        </div>
      </div>
    </section>

    <section class="dashboard-stats">
      <article class="card dashboard-stat dashboard-stat--coin">
        <p class="dashboard-stat__label">{{ t("dashboard.totalCoin") }}</p>
        <p class="value value--coin">{{ totalCoin }}<img src="/images/m-coin.svg" alt="coin" class="coin-unit" /></p>
      </article>
      <article class="card dashboard-stat dashboard-stat--winner">
        <p class="dashboard-stat__label">{{ t("dashboard.topWinner") }}</p>
        <p class="value">{{ topWinner?.displayName || "-" }}</p>
        <p class="muted">{{ t("common.net") }} {{ topWinner?.netWorth || 0 }}<img src="/images/m-coin.svg" alt="coin" class="coin-unit coin-unit--sm" /> • {{ t("dashboard.mvp") }}</p>
      </article>
      <article class="card dashboard-stat dashboard-stat--danger">
        <p class="dashboard-stat__label">{{ t("dashboard.topLoser") }}</p>
        <p class="value">{{ topLoser?.displayName || "-" }}</p>
        <p class="muted">{{ t("common.net") }} {{ topLoser?.netWorth || 0 }}<img src="/images/m-coin.svg" alt="coin" class="coin-unit coin-unit--sm" /> • {{ t("dashboard.comeback") }}</p>
      </article>
    </section>

    <section class="card dashboard-feed">
      <div class="row">
        <h2>{{ t("dashboard.matchFeed") }}</h2>
        <span class="pill">{{ recentTransactions.length }} {{ t("common.events") }}</span>
      </div>
      <div class="list dashboard-feed__list">
        <article
          v-for="tx in recentTransactions.slice(0, 6)"
          :key="tx.id"
          class="dashboard-feed__item"
        >
          <div class="dashboard-feed__top">
            <strong class="dashboard-feed__type-pill">{{ txLabel(tx) }}</strong>
            <span class="dashboard-feed__amount">
              {{ tx.amount }}<img src="/images/m-coin.svg" alt="coin" class="coin-unit coin-unit--sm" />
            </span>
          </div>
          <p class="dashboard-feed__versus">
            <span class="dashboard-feed__name">{{ playerById(tx.fromUserId)?.displayName || t("common.bank") }}</span>
            <span class="dashboard-feed__vs">-&gt;</span>
            <span class="dashboard-feed__name">{{ playerById(tx.toUserId)?.displayName || t("common.bank") }}</span>
          </p>
          <p class="dashboard-feed__note">{{ tx.note }}</p>
          <p class="dashboard-feed__time">
            <span class="dashboard-feed__time-dot" aria-hidden="true"></span>
            {{ formatTime(tx.createdAt) }}
          </p>
        </article>
      </div>
    </section>

    <section class="card dashboard-status">
      <h2>{{ t("dashboard.playerStatus") }}</h2>
      <p v-if="currentUser" class="muted">
        {{ t("dashboard.activeProfile") }}: <strong>{{ currentUser.displayName }}</strong> •
        {{ t("common.role") }}: {{ t(`role.${currentUser.role}`) }} • {{ t("dashboard.readyMatch") }}
      </p>
      <p v-else class="muted">
        {{ t("dashboard.loginToArena") }}
      </p>
    </section>
  </div>
</template>
