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
        <div>
          <h1 class="title">{{ t("nav.transfer") }}</h1>
        </div>
      </div>

      <form class="form transfer-form" @submit.prevent="submitTransfer">
        <div class="field">
          <label for="receiver">{{ t("transfer.receiver") }}</label>
          <select id="receiver" v-model="receiverId" class="select" required :disabled="!currentUser">
            <option value="" disabled>{{ t("transfer.selectReceiver") }}</option>
            <option v-for="player in receivers" :key="player.id" :value="player.id">
              {{ player.displayName }}
            </option>
          </select>
        </div>

        <div class="field">
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
              :disabled="!currentUser"
              @click="setQuickAmount(quick)"
            >
              {{ quick }}
            </button>
          </div>
        </div>

        <div class="field">
          <label for="note">{{ t("common.note") }}</label>
          <textarea id="note" v-model="note" class="textarea" :placeholder="t('transfer.notePlaceholder')"></textarea>
        </div>

        <button class="btn btn--primary transfer-submit" type="submit" :disabled="!currentUser">
          {{ t("transfer.send") }}
        </button>
      </form>
    </div>

    <p class="muted">{{ message || (!currentUser ? t('transfer.loginHint') : '') }}</p>
  </section>
</template>
