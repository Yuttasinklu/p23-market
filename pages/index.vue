<script setup lang="ts">
import { useMMarket } from "~/composables/useMMarket";
import { useLocale } from "~/composables/useLocale";

const {
  currentUser,
  dashboardRecentTransactions,
  dashboardTotalCoin,
  dashboardTopWinner,
  dashboardTopLoser,
  txLabel,
  formatTime,
  playerById,
} = useMMarket();
const { t } = useLocale();
</script>

<template>
  <div class="dashboard-page">
    <section class="dashboard-hero card">
      <div class="dashboard-hero__hud">
        <h1 class="title">{{ t("dashboard.title") }}</h1>
        <div class="dashboard-hero__meta">
          <p class="subtitle">Play to Earn</p>
          <NuxtLink to="/about" class="btn dashboard-hero__whitepaper">
            {{ t("dashboard.readWhitePaper") }}
            <span class="dashboard-hero__whitepaper-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M4 6.5c0-1.1.9-2 2-2h5c1.3 0 2.5.5 3.4 1.3L15 6.4l.6-.6c.9-.8 2.1-1.3 3.4-1.3h1c1.1 0 2 .9 2 2V18c0 1.1-.9 2-2 2h-1c-1.3 0-2.5.5-3.4 1.3l-.6.6-.6-.6c-.9-.8-2.1-1.3-3.4-1.3H6c-1.1 0-2-.9-2-2V6.5z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
                <path d="M15 6.5V20.8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                <path d="M7.2 9h4.2M7.2 12h4.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
              </svg>
            </span>
          </NuxtLink>
        </div>
      </div>
      <div class="dashboard-hero__side">
        <div class="dashboard-hero__coin-panel">
          <div class="dashboard-hero__coin-wrap">
            <img src="/images/dim-coin.png" alt="coin" class="dashboard-hero__coin" />
            <span class="dashboard-hero__coin-text">{{ t("dashboard.coinArena") }}</span>
          </div>
          <div class="dashboard-hero__market-total">
            <span class="dashboard-hero__market-label">{{ t("dashboard.totalCoin") }}</span>
            <strong class="value value--coin">
              {{ dashboardTotalCoin }}<img src="/images/dim-coin.png" alt="coin" class="coin-unit coin-unit--sm" />
            </strong>
          </div>
        </div>
        <div class="dashboard-hero__quick">
          <article class="dashboard-hero__quick-card">
            <span class="dashboard-hero__quick-label">{{ t("dashboard.topWinner") }}</span>
            <strong>{{ dashboardTopWinner?.displayName || "-" }}</strong>
          </article>
          <article class="dashboard-hero__quick-card">
            <span class="dashboard-hero__quick-label">{{ t("dashboard.topLoser") }}</span>
            <strong>{{ dashboardTopLoser?.displayName || "-" }}</strong>
          </article>
        </div>
      </div>
    </section>

    <section class="card dashboard-vs-stats">
      <article class="dashboard-vs-stats__side is-winner">
        <p class="dashboard-vs-stats__label">{{ t("dashboard.topWinner") }}</p>
        <p class="value">{{ dashboardTopWinner?.displayName || "-" }}</p>
        <p class="dashboard-vs-stats__meta">
          {{ t("common.net") }} {{ dashboardTopWinner?.netWorth || 0 }}<img src="/images/dim-coin.png" alt="coin" class="coin-unit coin-unit--sm" /> • {{ t("dashboard.mvp") }}
        </p>
      </article>
      <article class="dashboard-vs-stats__side is-loser">
        <p class="dashboard-vs-stats__label">{{ t("dashboard.topLoser") }}</p>
        <p class="value">{{ dashboardTopLoser?.displayName || "-" }}</p>
        <p class="dashboard-vs-stats__meta">
          {{ t("common.net") }} {{ dashboardTopLoser?.netWorth || 0 }}<img src="/images/dim-coin.png" alt="coin" class="coin-unit coin-unit--sm" /> • {{ t("dashboard.comeback") }}
        </p>
      </article>
    </section>

    <section class="card dashboard-feed">
      <div class="row">
        <h2>{{ t("dashboard.matchFeed") }}</h2>
        <span class="pill">{{ dashboardRecentTransactions.length }} {{ t("common.events") }}</span>
      </div>
      <div class="list dashboard-feed__list">
        <article
          v-for="tx in dashboardRecentTransactions"
          :key="tx.id"
          class="dashboard-feed__item"
        >
          <div class="dashboard-feed__top">
            <strong class="dashboard-feed__type-pill">{{ txLabel(tx) }}</strong>
            <span class="dashboard-feed__amount">
              {{ tx.amount }}<img src="/images/dim-coin.png" alt="coin" class="coin-unit coin-unit--sm" />
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
