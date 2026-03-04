<script setup lang="ts">
import { computed, ref } from "vue"
import { useMMarket } from "~/composables/useMMarket"
import { useLocale } from "~/composables/useLocale"
import { useToast } from "~/composables/useToast"

const { currentUser, borrowFromBank, repayToBank, thbValue, exchangeRate } = useMMarket()
const { t } = useLocale()
const { pushError, pushSuccess } = useToast()

const mode = ref<'borrow' | 'repay'>('borrow')
const amount = ref<number | null>(null)
const note = ref('')
const isSubmitting = ref(false)
const quickAmounts = [10, 30, 50, 100, 200]
const loadingText = computed(() =>
  mode.value === 'borrow' ? 'Borrowing M-Coin...' : 'Repaying M-Coin...'
)

const submit = async () => {
  if (isSubmitting.value) return
  isSubmitting.value = true
  const coin = Number(amount.value)
  try {
    const result = mode.value === 'borrow'
      ? await borrowFromBank(coin, note.value)
      : await repayToBank(coin, note.value)
    if (!result.ok) {
      pushError(result.message)
      return
    }
    pushSuccess(result.message)
    if (result.ok) {
      amount.value = null
      note.value = ''
    }
  } finally {
    isSubmitting.value = false
  }
}

const setQuickAmount = (value: number) => {
  amount.value = value
}
</script>

<template>
  <div class="bank-layout">
    <article class="card bank-banner" role="note" aria-live="polite">
      <p class="bank-banner__title">{{ t("bank.warningTitle") }}</p>
      <p class="bank-banner__text">{{ t("bank.warningBody") }}</p>
    </article>

    <section class="bank-page">
      <div class="card bank-shell">
      <header class="bank-head">
        <div>
          <h1 class="title">{{ t("bank.title") }}</h1>
          <p class="muted">{{ t("bank.exchange", { rate: exchangeRate }) }}</p>
        </div>
        <span class="pill">{{ t("bank.personal") }}</span>
      </header>

      <article class="bank-info" role="note" aria-live="polite">
        <p class="bank-info__title">{{ t("bank.flowTitle") }}</p>
        <ul class="bank-info__list">
          <li>{{ t("bank.flowStep1") }}</li>
          <li>{{ t("bank.flowStep2") }}</li>
          <li>{{ t("bank.flowStep3") }}</li>
        </ul>
      </article>

      <div v-if="currentUser" class="bank-balance-grid">
        <article class="bank-balance bank-balance--coin">
          <p class="bank-balance__label">{{ t("bank.myCoin") }}</p>
          <p class="value value--coin">
            {{ currentUser.coin }}<img src="/images/m-coin.svg" alt="coin" class="coin-unit" />
          </p>
        </article>
        <article class="bank-balance bank-balance--debt">
          <p class="bank-balance__label">{{ t("bank.myDebt") }}</p>
          <p class="value">
            {{ currentUser.bankDebt }}<img src="/images/m-coin.svg" alt="coin" class="coin-unit" />
          </p>
        </article>
      </div>

      <form class="form bank-form" @submit.prevent="submit">
        <div class="bank-mode">
          <button
            class="bank-mode__btn"
            type="button"
            :class="{ 'is-active': mode === 'borrow' }"
            :disabled="!currentUser || isSubmitting"
            @click="mode = 'borrow'"
          >
            <span class="bank-mode__icon" aria-hidden="true">+</span>
            {{ t("bank.borrow") }}
          </button>
          <button
            class="bank-mode__btn"
            type="button"
            :class="{ 'is-active': mode === 'repay' }"
            :disabled="!currentUser || isSubmitting"
            @click="mode = 'repay'"
          >
            <span class="bank-mode__icon" aria-hidden="true">↺</span>
            {{ t("bank.repay") }}
          </button>
        </div>

        <div class="field">
          <label for="bank-amount">{{ t("transfer.amount") }}</label>
          <div class="bank-amount-wrap">
            <input id="bank-amount" v-model.number="amount" class="input bank-amount-input" type="number" min="1" required :disabled="!currentUser || isSubmitting" />
            <span class="bank-amount-unit">MC</span>
          </div>
          <div class="bank-quick">
            <button
              v-for="quick in quickAmounts"
              :key="`bank-quick-${quick}`"
              type="button"
              class="bank-quick__btn"
              :class="{ 'is-active': amount === quick }"
              :disabled="!currentUser || isSubmitting"
              @click="setQuickAmount(quick)"
            >
              {{ quick }}
            </button>
          </div>
          <p v-if="amount" class="muted bank-thb-hint">{{ t("bank.thbEq", { value: thbValue(Number(amount)) }) }}</p>
        </div>

        <div class="field">
          <label for="bank-note">{{ t("common.note") }}</label>
          <input id="bank-note" v-model="note" class="input" :placeholder="t('bank.optional')" :disabled="isSubmitting" />
        </div>

        <button class="btn btn--primary bank-submit" type="submit" :disabled="!currentUser || isSubmitting">
          {{ mode === 'borrow' ? t('bank.confirmBorrow') : t('bank.confirmRepay') }}
        </button>
      </form>
      </div>

      <div v-if="isSubmitting" class="modal bank-loading" role="status" aria-live="polite">
        <div class="modal__panel bank-loading__panel">
          <span class="bank-loading__spinner" aria-hidden="true"></span>
          <p>{{ loadingText }}</p>
        </div>
      </div>
    </section>
  </div>
</template>
