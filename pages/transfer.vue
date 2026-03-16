<script setup lang="ts">
import { computed, ref } from "vue"
import { useMMarket } from "~/composables/useMMarket"
import { useLocale } from "~/composables/useLocale"
import { useToast } from "~/composables/useToast"

const { currentUser, allPlayers, addTransfer } = useMMarket()
const { t } = useLocale()
const { pushError, pushSuccess } = useToast()

const receiverId = ref('')
const amount = ref<number | null>(null)
const note = ref('')
const isSubmitting = ref(false)
const quickAmounts = [10, 20, 50, 100, 200]

const receivers = computed(() => allPlayers.value.filter((player) => player.id !== currentUser.value?.id))

const setQuickAmount = (value: number) => {
  amount.value = value
}

const submitTransfer = async () => {
  if (isSubmitting.value) return
  isSubmitting.value = true
  try {
    const result = await addTransfer(receiverId.value, Number(amount.value), note.value)
    if (!result.ok) {
      pushError(result.message)
      return
    }
    pushSuccess(result.message)
    if (result.ok) {
      receiverId.value = ''
      amount.value = null
      note.value = ''
    }
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <section class="transfer-page">
    <div class="card transfer-shell">
      <div class="transfer-head">
        <div class="transfer-head__intro">
          <h1 class="title transfer-head__title">
            <span>ส่ง DIM-Coin</span>
            <img src="/images/dim-coin2.png" alt="DIM-Coin" class="coin-unit transfer-head__title-coin" />
          </h1>
          <p class="muted transfer-head__subtitle">โอน DIM-Coin ระหว่างผู้เล่น</p>
        </div>
      </div>

      <form class="form transfer-form" @submit.prevent="submitTransfer">
        <div class="field transfer-field-card">
          <label for="receiver">{{ t("transfer.receiver") }}</label>
          <select id="receiver" v-model="receiverId" class="select" required :disabled="!currentUser || isSubmitting">
            <option value="" disabled>{{ t("transfer.selectReceiver") }}</option>
            <option v-for="player in receivers" :key="player.id" :value="player.id">
              {{ player.displayName }}
            </option>
          </select>
        </div>

        <div class="field transfer-field-card">
          <label for="amount">{{ t("transfer.amount") }}</label>
          <div class="transfer-amount-wrap">
            <input id="amount" v-model.number="amount" class="input transfer-amount-input" type="number" min="1" required :disabled="!currentUser || isSubmitting" />
            <span class="transfer-amount-unit">
              <img src="/images/dim-coin2.png" alt="DIM-coin" class="coin-unit coin-unit--sm" />
            </span>
          </div>
          <div class="transfer-quick">
            <button
              v-for="quick in quickAmounts"
              :key="quick"
              type="button"
              class="transfer-quick__btn"
              :class="{ 'is-active': amount === quick }"
              :disabled="!currentUser || isSubmitting"
              @click="setQuickAmount(quick)"
            >
              <span>{{ quick }}</span>
              <img src="/images/dim-coin2.png" alt="DIM-coin" class="coin-unit coin-unit--sm" />
            </button>
          </div>
        </div>

        <div class="field transfer-field-card">
          <label for="note">{{ t("common.note") }}</label>
          <textarea id="note" v-model="note" class="textarea" :placeholder="t('transfer.notePlaceholder')" :disabled="isSubmitting"></textarea>
        </div>

        <button class="btn btn--primary transfer-submit" type="submit" :disabled="!currentUser || isSubmitting">
          {{ t("transfer.send") }}
        </button>
      </form>
    </div>

    <div v-if="isSubmitting" class="modal transfer-loading" role="status" aria-live="polite">
      <div class="modal__panel transfer-loading__panel">
        <span class="transfer-loading__spinner" aria-hidden="true"></span>
        <p>Transferring DIM-Coin...</p>
      </div>
    </div>
  </section>
</template>
