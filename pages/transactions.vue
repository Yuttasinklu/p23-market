<script setup lang="ts">
import { computed } from "vue"
import { useMMarket } from "~/composables/useMMarket"
import { useLocale } from "~/composables/useLocale"

const { recentTransactions, playerById, formatTime, txLabel } = useMMarket()
const { t } = useLocale()
const displayTransactions = computed(() => recentTransactions.value.slice(0, 100))

const refreshPage = () => {
  if (typeof window !== "undefined") window.location.reload()
}
</script>

<template>
  <section class="transactions-page">
    <div class="card transactions-head">
      <div class="transactions-head__intro">
        <h1 class="title">{{ t("transactions.title") }}</h1>
      </div>
      <button type="button" class="btn transactions-head__refresh" @click="refreshPage">Refresh</button>
    </div>

    <div class="transactions-list">
      <article v-for="tx in displayTransactions" :key="tx.id" class="transactions-card">
        <div class="transactions-card__meta">
          <span class="transactions-type">{{ txLabel(tx) }}</span>
          <p class="transactions-time">{{ formatTime(tx.createdAt) }}</p>
        </div>
        <div class="transactions-card__top">
          <p class="transactions-route">
            <span class="transactions-player">{{ playerById(tx.fromUserId)?.displayName || t("common.bank") }}</span>
            <span class="transactions-arrow">-&gt;</span>
            <span class="transactions-player">{{ playerById(tx.toUserId)?.displayName || t("common.bank") }}</span>
          </p>
          <p class="transactions-amount value--coin">
            {{ tx.amount }}<img src="/images/m-coin.svg" alt="coin" class="coin-unit coin-unit--sm" />
          </p>
        </div>
        <p class="transactions-note">{{ tx.note || "-" }}</p>
      </article>
      <p v-if="displayTransactions.length === 0" class="muted">{{ t("common.noData") }}</p>
    </div>
  </section>
</template>
