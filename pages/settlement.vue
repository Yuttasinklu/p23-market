<script setup lang="ts">
import { computed, ref } from "vue"
import { useMMarket } from "~/composables/useMMarket"
import { useLocale } from "~/composables/useLocale"
import { useToast } from "~/composables/useToast"

const { currentUser, runSettlement, settlementRuns, playerById, formatTime, isAuthenticated } = useMMarket()
const { t } = useLocale()
const { pushError, pushSuccess } = useToast()
const isRunningSettlement = ref(false)

const latestRun = computed(() => settlementRuns.value[0] || null)

const latestPlayers = computed(() =>
  latestRun.value
    ? [...latestRun.value.players].sort((a, b) => b.net - a.net)
    : []
)

const settlementSummary = computed(() => {
  const players = latestRun.value?.players || []
  return {
    winners: players.filter((item) => item.net > 0).length,
    losers: players.filter((item) => item.net < 0).length,
    cleared: players.filter((item) => item.net === 0).length
  }
})

const payoutInstructions = computed(() => {
  if (!latestRun.value) return []

  const creditors = latestRun.value.players
    .filter((item) => item.net > 0)
    .map((item) => ({ playerId: item.playerId, remaining: item.net }))

  const debtors = latestRun.value.players
    .filter((item) => item.net < 0)
    .map((item) => ({ playerId: item.playerId, remaining: Math.abs(item.net) }))

  const instructions: Array<{ fromId: string; toId: string; amount: number }> = []
  let i = 0
  let j = 0

  while (i < debtors.length && j < creditors.length) {
    const payAmount = Math.min(debtors[i].remaining, creditors[j].remaining)

    instructions.push({
      fromId: debtors[i].playerId,
      toId: creditors[j].playerId,
      amount: payAmount
    })

    debtors[i].remaining -= payAmount
    creditors[j].remaining -= payAmount

    if (debtors[i].remaining === 0) i += 1
    if (creditors[j].remaining === 0) j += 1
  }

  return instructions
})

const handleRun = async () => {
  if (isRunningSettlement.value) return
  if (!isAuthenticated.value) {
    pushError(t("common.loginRequiredView"))
    return
  }
  isRunningSettlement.value = true
  try {
    const result = await runSettlement()
    if (!result.ok) {
      pushError(result.message)
      return
    }
    pushSuccess(result.message)
  } finally {
    isRunningSettlement.value = false
  }
}
</script>

<template>
  <div class="settlement-page">
    <section v-if="!isAuthenticated" class="card settlement-control">
      <h1 class="title">{{ t("settlement.title") }}</h1>
      <p class="muted">{{ t("common.loginRequiredView") }}</p>
    </section>

    <template v-else>
    <section class="card settlement-control">
      <div class="row">
        <h1 class="title">{{ t("settlement.title") }}</h1>
        <span class="pill">{{ t("settlement.adminAction") }}</span>
      </div>
      <p class="muted">{{ t("settlement.manualOneButton") }}</p>
      <div class="settlement-control__actions">
        <button
          class="btn btn--primary settlement-run-btn"
          type="button"
          :disabled="currentUser?.role !== 'admin' || isRunningSettlement"
          @click="handleRun"
        >
          {{ isRunningSettlement ? "Running..." : t("settlement.run") }}
        </button>
      </div>
    </section>

    <section class="card settlement-result">
      <div class="row">
        <h2>{{ t("settlement.latestResult") }}</h2>
        <span v-if="latestRun" class="pill">{{ formatTime(latestRun.createdAt) }}</span>
      </div>

      <template v-if="latestRun">
        <p class="muted">
          {{ t("common.by") }} {{ playerById(latestRun.runByUserId)?.displayName }} •
          {{ latestRun.players.length }} {{ t("common.player") }}
        </p>

        <div class="settlement-summary-grid">
          <article class="settlement-summary settlement-summary--win">
            <p class="settlement-summary__label">{{ t("settlement.winner") }}</p>
            <p class="value">{{ settlementSummary.winners }}</p>
          </article>
          <article class="settlement-summary settlement-summary--lose">
            <p class="settlement-summary__label">{{ t("settlement.loser") }}</p>
            <p class="value">{{ settlementSummary.losers }}</p>
          </article>
          <article class="settlement-summary">
            <p class="settlement-summary__label">{{ t("settlement.cleared") }}</p>
            <p class="value">{{ settlementSummary.cleared }}</p>
          </article>
        </div>

        <div class="table-wrap settlement-table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>{{ t("common.player") }}</th>
                <th>{{ t("common.coin") }}</th>
                <th>{{ t("common.debt") }}</th>
                <th>{{ t("common.net") }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in latestPlayers" :key="item.playerId">
                <td>{{ playerById(item.playerId)?.displayName }}</td>
                <td>{{ item.coin }}<img src="/images/m-coin.svg" alt="coin" class="coin-unit coin-unit--sm" /></td>
                <td>{{ item.bankDebt }}<img src="/images/m-coin.svg" alt="coin" class="coin-unit coin-unit--sm" /></td>
                <td :class="item.net >= 0 ? 'value--coin' : 'value--danger'">
                  {{ item.net }}<img src="/images/m-coin.svg" alt="coin" class="coin-unit coin-unit--sm" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="settlement-payout">
          <h3 class="settlement-payout__title">{{ t("settlement.payoutInstructions") }}</h3>
          <div v-if="payoutInstructions.length" class="list settlement-payout__list">
            <p v-for="(item, index) in payoutInstructions" :key="`${item.fromId}-${item.toId}-${index}`" class="settlement-payout__item">
              <span>{{ playerById(item.fromId)?.displayName }}</span>
              <span class="settlement-payout__arrow">-&gt;</span>
              <span>{{ playerById(item.toId)?.displayName }}</span>
              <strong class="value--coin">{{ item.amount }}<img src="/images/m-coin.svg" alt="coin" class="coin-unit coin-unit--sm" /></strong>
            </p>
          </div>
          <p v-else class="muted">{{ t("common.noData") }}</p>
        </div>
      </template>

      <p v-else class="muted">{{ t("settlement.none") }}</p>
    </section>

    <section class="card settlement-history">
      <h2>{{ t("settlement.history") }}</h2>
      <div v-if="settlementRuns.length" class="list settlement-history__list">
        <article v-for="run in settlementRuns.slice(0, 5)" :key="run.id" class="settlement-history__item">
          <p class="muted">
            {{ formatTime(run.createdAt) }} {{ t("common.by") }} {{ playerById(run.runByUserId)?.displayName }}
          </p>
          <p class="settlement-history__meta">
            {{ run.players.length }} {{ t("common.player") }} •
            {{ run.players.filter((item) => item.net > 0).length }} {{ t("settlement.winner") }} •
            {{ run.players.filter((item) => item.net < 0).length }} {{ t("settlement.loser") }}
          </p>
        </article>
      </div>
      <p v-else class="muted">{{ t("settlement.none") }}</p>
    </section>
    </template>
  </div>
</template>
