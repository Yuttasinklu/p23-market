<script setup lang="ts">
import { useMMarket } from "~/composables/useMMarket"
import { useLocale } from "~/composables/useLocale"

const { recentTransactions, playerById, formatTime } = useMMarket()
const { t } = useLocale()

const refreshPage = () => {
  if (typeof window !== "undefined") window.location.reload()
}
</script>

<template>
  <section class="transactions-page">
    <div class="transactions-actions">
      <button type="button" class="btn" @click="refreshPage">Refresh</button>
    </div>

    <div class="transactions-list">
      <article v-for="tx in recentTransactions" :key="tx.id" class="transactions-card">
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
        <p class="transactions-time">{{ formatTime(tx.createdAt) }}</p>
      </article>
      <p v-if="recentTransactions.length === 0" class="muted">{{ t("common.noData") }}</p>
    </div>
  </section>
</template>
