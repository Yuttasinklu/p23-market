<script setup lang="ts">
import { computed, ref } from "vue"
import { useMMarket } from "~/composables/useMMarket"
import { useLocale } from "~/composables/useLocale"

const { currentUser, allPlayers, addTransfer } = useMMarket()
const { t } = useLocale()

const receiverId = ref('')
const amount = ref<number | null>(null)
const note = ref('')
const message = ref('')
const quickAmounts = [10, 20, 50, 100, 200]

const receivers = computed(() => allPlayers.value.filter((player) => player.id !== currentUser.value?.id))

const setQuickAmount = (value: number) => {
  amount.value = value
}

const submitTransfer = () => {
  const result = addTransfer(receiverId.value, Number(amount.value), note.value)
  message.value = result.message
  if (result.ok) {
    receiverId.value = ''
    amount.value = null
    note.value = ''
  }
}
</script>

<template>
  <section class="transfer-page">
    <div class="card transfer-shell">
      <div class="transfer-head">
        <div class="transfer-head__intro">
          <h1 class="title transfer-head__title">
            <span>ส่ง M-Coin</span>
            <img src="/images/m-coin.svg" alt="M-Coin" class="coin-unit transfer-head__title-coin" />
          </h1>
          <p class="muted transfer-head__subtitle">โอน M-Coin ระหว่างผู้เล่น</p>
        </div>
      </div>

      <form class="form transfer-form" @submit.prevent="submitTransfer">
        <div class="field transfer-field-card">
          <label for="receiver">{{ t("transfer.receiver") }}</label>
          <select id="receiver" v-model="receiverId" class="select" required :disabled="!currentUser">
            <option value="" disabled>{{ t("transfer.selectReceiver") }}</option>
            <option v-for="player in receivers" :key="player.id" :value="player.id">
              {{ player.displayName }}
            </option>
          </select>
        </div>

        <div class="field transfer-field-card">
          <label for="amount">{{ t("transfer.amount") }}</label>
          <div class="transfer-amount-wrap">
            <input id="amount" v-model.number="amount" class="input transfer-amount-input" type="number" min="1" required :disabled="!currentUser" />
            <span class="transfer-amount-unit">MC</span>
          </div>
          <div class="transfer-quick">
            <button
              v-for="quick in quickAmounts"
              :key="quick"
              type="button"
              class="transfer-quick__btn"
              :class="{ 'is-active': amount === quick }"
              :disabled="!currentUser"
              @click="setQuickAmount(quick)"
            >
              {{ quick }} MC
            </button>
          </div>
        </div>

        <div class="field transfer-field-card">
          <label for="note">{{ t("common.note") }}</label>
          <textarea id="note" v-model="note" class="textarea" :placeholder="t('transfer.notePlaceholder')"></textarea>
        </div>

        <button class="btn btn--primary transfer-submit" type="submit" :disabled="!currentUser">
          {{ t("transfer.send") }}
        </button>
      </form>
    </div>

    <p class="muted">{{ message }}</p>
  </section>
</template>
