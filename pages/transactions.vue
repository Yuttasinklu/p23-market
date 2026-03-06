<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { useMMarket } from "~/composables/useMMarket"
import { useLocale } from "~/composables/useLocale"

const { allPlayers, recentTransactions, playerById, formatTime, txLabel, refreshTransactionsOnly, isAuthenticated } = useMMarket()
const { t } = useLocale()
const isRefreshing = ref(false)
const selectedPlayerId = ref("all")

const playerOptions = computed(() =>
  [...allPlayers.value].sort((a, b) => a.displayName.localeCompare(b.displayName))
)

const selectedApiPlayerId = computed(() =>
  selectedPlayerId.value && selectedPlayerId.value !== "all" ? selectedPlayerId.value : undefined
)

const displayTransactions = computed(() => recentTransactions.value.slice(0, 100))

const refreshPage = async (playerId = selectedApiPlayerId.value) => {
  if (!isAuthenticated.value || isRefreshing.value) return
  isRefreshing.value = true
  try {
    await refreshTransactionsOnly(playerId)
  } finally {
    isRefreshing.value = false
  }
}

watch(selectedPlayerId, async () => {
  if (!isAuthenticated.value) return
  await refreshPage()
})

watch(isAuthenticated, async (isAuth) => {
  if (!isAuth) return
  await refreshPage()
})
</script>

<template>
  <section class="transactions-page">
    <div class="card transactions-head">
      <div class="transactions-head__intro">
        <h1 class="title">{{ t("transactions.title") }}</h1>
      </div>
      <div class="transactions-head__filter">
        <label for="player-filter">{{ t("transactions.filterPlayer") }}</label>
        <select id="player-filter" v-model="selectedPlayerId" class="input" :disabled="!isAuthenticated">
          <option value="all">{{ t("transactions.filterAllPlayers") }}</option>
          <option v-for="player in playerOptions" :key="player.id" :value="player.id">
            {{ player.displayName }}
          </option>
        </select>
      </div>
      <button type="button" class="btn transactions-head__refresh" :disabled="!isAuthenticated || isRefreshing" @click="refreshPage">
        {{ isRefreshing ? "Loading..." : "Refresh" }}
      </button>
    </div>

    <div v-if="!isAuthenticated" class="card transactions-empty">
      <p class="muted">{{ t("common.loginRequiredView") }}</p>
    </div>

    <div v-else class="transactions-list">
      <article v-for="tx in displayTransactions" :key="tx.id" class="transactions-card">
        <div class="transactions-card__meta">
          <p class="transactions-time">{{ formatTime(tx.createdAt) }}</p>
        </div>
        <div class="transactions-card__top">
          <p class="transactions-route">
            <span v-if="playerById(tx.fromUserId)?.displayName" class="transactions-player">
              <span class="transactions-player__avatar transactions-player__avatar--profile" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="8" r="3.2" stroke="currentColor" stroke-width="1.8" />
                  <path d="M5 19c0-3.2 2.9-5.2 7-5.2s7 2 7 5.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                </svg>
              </span>
              <span class="transactions-player__name">{{ playerById(tx.fromUserId)?.displayName }}</span>
            </span>
            <span v-else class="transactions-player transactions-player--bank" :aria-label="t('common.bank')" :title="t('common.bank')">
              <span class="transactions-player__avatar transactions-player__avatar--bank">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M3 9L12 4l9 5v2H3V9z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" />
                  <path d="M5 11v7M9 11v7M15 11v7M19 11v7M3 20h18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                </svg>
              </span>
              <span class="transactions-player__name">{{ t("common.bank") }}</span>
            </span>
            <span class="transactions-arrow">-&gt;</span>
            <span v-if="playerById(tx.toUserId)?.displayName" class="transactions-player">
              <span class="transactions-player__avatar transactions-player__avatar--profile" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="8" r="3.2" stroke="currentColor" stroke-width="1.8" />
                  <path d="M5 19c0-3.2 2.9-5.2 7-5.2s7 2 7 5.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                </svg>
              </span>
              <span class="transactions-player__name">{{ playerById(tx.toUserId)?.displayName }}</span>
            </span>
            <span v-else class="transactions-player transactions-player--bank" :aria-label="t('common.bank')" :title="t('common.bank')">
              <span class="transactions-player__avatar transactions-player__avatar--bank">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M3 9L12 4l9 5v2H3V9z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" />
                  <path d="M5 11v7M9 11v7M15 11v7M19 11v7M3 20h18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                </svg>
              </span>
              <span class="transactions-player__name">{{ t("common.bank") }}</span>
            </span>
          </p>
          <p class="transactions-amount value--coin">
            {{ tx.amount }}<img src="/images/dim-coin.png" alt="coin" class="coin-unit coin-unit--sm" />
          </p>
        </div>
        <p class="transactions-note" :class="{ 'is-empty': !tx.note }">
          <span class="transactions-note__label">{{ t("common.note") }}:</span>
          <span class="transactions-note__text">{{ tx.note || "-" }}</span>
        </p>
      </article>
      <p v-if="displayTransactions.length === 0" class="muted">{{ t("common.noData") }}</p>
    </div>
  </section>
</template>
