<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useLocale } from "~/composables/useLocale";
import { useMMarket } from "~/composables/useMMarket";
import { useInvoices, type InvoiceItem, type InvoiceStatus, type InvoiceTab } from "~/composables/useInvoices";
import { useToast } from "~/composables/useToast";

const { t } = useLocale();
const { currentUser, allPlayers, formatTime } = useMMarket();
const { pushError, pushSuccess } = useToast();
const { listMyInvoices, createInvoice, payInvoice, transferDebt, cancelInvoice } = useInvoices();
const INVOICE_GUIDE_SEEN_KEY = "holymarket-invoice-guide-seen-v1";

const activeTab = ref<InvoiceTab>("assigned");
const status = ref<InvoiceStatus | "all">("all");
const page = ref(1);
const limit = ref(12);
const isLoading = ref(false);

const rows = ref<InvoiceItem[]>([]);
const total = ref(0);

const receiverId = ref("");
const amount = ref<number | null>(null);
const note = ref("");
const isCreating = ref(false);

const showTransferModal = ref(false);
const transferInvoice = ref<InvoiceItem | null>(null);
const transferTargetId = ref("");
const transferNote = ref("");
const isTransferring = ref(false);
const showGuideModal = ref(false);

const statusOptions = computed(() => [
  { value: "all", label: t("invoice.statusAll") },
  { value: "pending", label: t("invoice.statusPending") },
  { value: "paid", label: t("invoice.statusPaid") },
  { value: "cancelled", label: t("invoice.statusCancelled") }
]);

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / limit.value)));

const receiverOptions = computed(() =>
  allPlayers.value.filter((player) => player.id !== currentUser.value?.id)
);

const transferTargetOptions = computed(() => {
  const invoice = transferInvoice.value;
  if (!invoice) return [];
  return allPlayers.value.filter((player) => player.id !== invoice.currentPayerUserId);
});

const playerName = (id: string) =>
  allPlayers.value.find((player) => player.id === id)?.displayName || id;

const canPay = (invoice: InvoiceItem) =>
  invoice.status === "pending" && invoice.currentPayerUserId === currentUser.value?.id;

const canTransfer = (invoice: InvoiceItem) =>
  invoice.status === "pending" && invoice.currentPayerUserId === currentUser.value?.id;

const canCancel = (invoice: InvoiceItem) =>
  invoice.status === "pending" && invoice.createdByUserId === currentUser.value?.id;

const loadPage = async () => {
  isLoading.value = true;
  try {
    const result = await listMyInvoices({
      tab: activeTab.value,
      status: status.value,
      page: page.value,
      limit: limit.value
    });
    if (!result.ok) {
      rows.value = [];
      total.value = 0;
      pushError(result.message);
      return;
    }
    rows.value = result.items;
    total.value = result.pagination.total;
  } finally {
    isLoading.value = false;
  }
};

const submitCreate = async () => {
  if (isCreating.value) return;
  isCreating.value = true;
  try {
    const result = await createInvoice(receiverId.value, Number(amount.value || 0), note.value);
    if (!result.ok) {
      pushError(result.message);
      return;
    }

    receiverId.value = "";
    amount.value = null;
    note.value = "";
    pushSuccess(result.message);
    activeTab.value = "created";
    status.value = "all";
    page.value = 1;
    await loadPage();
  } finally {
    isCreating.value = false;
  }
};

const onPay = async (invoice: InvoiceItem) => {
  const confirmed = window.confirm(t("invoice.confirmPay"));
  if (!confirmed) return;
  const result = await payInvoice(invoice.id);
  if (!result.ok) {
    pushError(result.message);
    return;
  }
  pushSuccess(result.message);
  await loadPage();
};

const openTransfer = (invoice: InvoiceItem) => {
  transferInvoice.value = invoice;
  transferTargetId.value = "";
  transferNote.value = "";
  showTransferModal.value = true;
};

const submitTransfer = async () => {
  if (isTransferring.value || !transferInvoice.value) return;
  isTransferring.value = true;
  try {
    const result = await transferDebt(
      transferInvoice.value.id,
      transferTargetId.value,
      transferNote.value
    );
    if (!result.ok) {
      pushError(result.message);
      return;
    }
    showTransferModal.value = false;
    transferInvoice.value = null;
    pushSuccess(result.message);
    await loadPage();
  } finally {
    isTransferring.value = false;
  }
};

const onCancel = async (invoice: InvoiceItem) => {
  const confirmed = window.confirm(t("invoice.confirmCancel"));
  if (!confirmed) return;
  const result = await cancelInvoice(invoice.id);
  if (!result.ok) {
    pushError(result.message);
    return;
  }
  pushSuccess(result.message);
  await loadPage();
};

const setTab = (value: InvoiceTab) => {
  if (activeTab.value === value) return;
  activeTab.value = value;
  page.value = 1;
};

const prevPage = async () => {
  if (page.value <= 1) return;
  page.value -= 1;
  await loadPage();
};

const nextPage = async () => {
  if (page.value >= totalPages.value) return;
  page.value += 1;
  await loadPage();
};

const markGuideSeen = () => {
  if (!process.client) return;
  localStorage.setItem(INVOICE_GUIDE_SEEN_KEY, "1");
};

const openGuide = () => {
  showGuideModal.value = true;
};

const closeGuide = (remember = true) => {
  showGuideModal.value = false;
  if (remember) markGuideSeen();
};

watch(
  () => currentUser.value?.id,
  async () => {
    page.value = 1;
    await loadPage();
  }
);

watch(activeTab, async () => {
  page.value = 1;
  await loadPage();
});

watch(status, async () => {
  page.value = 1;
  await loadPage();
});

onMounted(async () => {
  if (process.client) {
    const seen = localStorage.getItem(INVOICE_GUIDE_SEEN_KEY) === "1";
    if (!seen) openGuide();
  }
  await loadPage();
});
</script>

<template>
  <section class="invoice-page">
    <div class="card invoice-head">
      <div class="invoice-head__title-wrap">
        <h1 class="title">{{ t("invoice.title") }}</h1>
        <p class="muted">{{ t("invoice.subtitle") }}</p>
      </div>
      <div class="invoice-head__actions">
        <button class="btn invoice-head__guide" type="button" :title="t('invoice.guideOpen')" @click="openGuide">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8" />
            <path d="M12 16v-4.1c0-1.1.9-2 2-2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
            <circle cx="12" cy="7.5" r="1" fill="currentColor" />
          </svg>
          <span>{{ t("invoice.guideOpen") }}</span>
        </button>
      </div>
    </div>

    <div class="card invoice-create">
      <h2 class="invoice-section-title">{{ t("invoice.createTitle") }}</h2>
      <form class="form invoice-create__form" @submit.prevent="submitCreate">
        <div class="field">
          <label for="invoice-receiver">{{ t("invoice.receiver") }}</label>
          <select
            id="invoice-receiver"
            v-model="receiverId"
            class="select"
            required
            :disabled="!currentUser || isCreating"
          >
            <option value="" disabled>{{ t("invoice.selectReceiver") }}</option>
            <option v-for="player in receiverOptions" :key="player.id" :value="player.id">
              {{ player.displayName }}
            </option>
          </select>
        </div>
        <div class="field">
          <label for="invoice-amount">{{ t("invoice.amount") }}</label>
          <input
            id="invoice-amount"
            v-model.number="amount"
            type="number"
            min="1"
            class="input"
            required
            :disabled="!currentUser || isCreating"
          />
        </div>
        <div class="field">
          <label for="invoice-note">{{ t("common.note") }}</label>
          <textarea
            id="invoice-note"
            v-model="note"
            class="textarea"
            :placeholder="t('invoice.notePlaceholder')"
            :disabled="!currentUser || isCreating"
          />
        </div>
        <button class="btn btn--primary" type="submit" :disabled="!currentUser || isCreating">
          {{ isCreating ? "..." : t("invoice.create") }}
        </button>
      </form>
    </div>

    <div class="card invoice-list">
      <div class="invoice-list__head">
        <h2 class="invoice-section-title">{{ t("invoice.listTitle") }}</h2>
        <div class="invoice-list__tabs" role="tablist" aria-label="invoice tabs">
          <button
            class="btn invoice-list__tab"
            :class="{ 'is-active': activeTab === 'assigned' }"
            type="button"
            @click="setTab('assigned')"
          >
            {{ t("invoice.assignedTab") }}
          </button>
          <button
            class="btn invoice-list__tab"
            :class="{ 'is-active': activeTab === 'created' }"
            type="button"
            @click="setTab('created')"
          >
            {{ t("invoice.createdTab") }}
          </button>
        </div>
      </div>

      <div class="invoice-list__controls">
        <label for="invoice-status">{{ t("invoice.statusFilter") }}</label>
        <select id="invoice-status" v-model="status" class="select">
          <option v-for="option in statusOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
        <button class="btn" type="button" :disabled="isLoading" @click="loadPage">
          {{ isLoading ? "..." : t("invoice.refresh") }}
        </button>
      </div>

      <div v-if="!currentUser" class="invoice-empty">
        <p class="muted">{{ t("transfer.loginHint") }}</p>
      </div>
      <div v-else class="invoice-table-wrap">
        <table class="invoice-table">
          <thead>
            <tr>
              <th>{{ t("invoice.id") }}</th>
              <th>{{ t("invoice.amount") }}</th>
              <th>{{ t("invoice.creator") }}</th>
              <th>{{ t("invoice.currentPayer") }}</th>
              <th>{{ t("invoice.statusFilter") }}</th>
              <th>{{ t("common.note") }}</th>
              <th>{{ t("common.time") }}</th>
              <th>{{ t("invoice.actions") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="invoice in rows" :key="invoice.id">
              <td>{{ invoice.id }}</td>
              <td>
                <strong class="value--coin">
                  {{ invoice.amount }}
                  <img src="/images/dim-coin.png" alt="coin" class="coin-unit coin-unit--sm" />
                </strong>
              </td>
              <td>{{ playerName(invoice.createdByUserId) }}</td>
              <td>{{ playerName(invoice.currentPayerUserId) }}</td>
              <td>
                <span class="invoice-status" :class="`is-${invoice.status}`">
                  {{ t(`invoice.status${invoice.status.charAt(0).toUpperCase()}${invoice.status.slice(1)}`) }}
                </span>
              </td>
              <td>{{ invoice.noteLatest || "-" }}</td>
              <td>{{ formatTime(invoice.updatedAt) }}</td>
              <td class="invoice-actions">
                <button v-if="canPay(invoice)" class="btn btn--primary" type="button" @click="onPay(invoice)">
                  {{ t("invoice.pay") }}
                </button>
                <button v-if="canTransfer(invoice)" class="btn" type="button" @click="openTransfer(invoice)">
                  {{ t("invoice.transferDebt") }}
                </button>
                <button v-if="canCancel(invoice)" class="btn btn--danger" type="button" @click="onCancel(invoice)">
                  {{ t("invoice.cancel") }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-if="rows.length === 0 && !isLoading" class="muted invoice-empty">{{ t("invoice.empty") }}</p>
      </div>

      <div class="invoice-pagination">
        <button class="btn" type="button" :disabled="page <= 1 || isLoading" @click="prevPage">Prev</button>
        <span>{{ page }} / {{ totalPages }}</span>
        <button class="btn" type="button" :disabled="page >= totalPages || isLoading" @click="nextPage">Next</button>
      </div>
    </div>

    <div v-if="showTransferModal" class="modal" @click.self="showTransferModal = false">
      <div class="modal__panel invoice-transfer-modal">
        <h3>{{ t("invoice.transferDebt") }}</h3>
        <p class="muted">
          {{ transferInvoice?.id }} •
          <strong class="value--coin">
            {{ transferInvoice?.amount }}
            <img src="/images/dim-coin.png" alt="coin" class="coin-unit coin-unit--sm" />
          </strong>
        </p>
        <form class="form" @submit.prevent="submitTransfer">
          <div class="field">
            <label for="transfer-target">{{ t("invoice.transferTarget") }}</label>
            <select
              id="transfer-target"
              v-model="transferTargetId"
              class="select"
              required
              :disabled="isTransferring"
            >
              <option value="" disabled>{{ t("invoice.selectReceiver") }}</option>
              <option v-for="player in transferTargetOptions" :key="player.id" :value="player.id">
                {{ player.displayName }}
              </option>
            </select>
          </div>
          <div class="field">
            <label for="transfer-note">{{ t("invoice.transferNote") }}</label>
            <textarea
              id="transfer-note"
              v-model="transferNote"
              class="textarea"
              required
              :placeholder="t('invoice.transferNote')"
              :disabled="isTransferring"
            />
          </div>
          <div class="invoice-transfer-modal__actions">
            <button class="btn" type="button" :disabled="isTransferring" @click="showTransferModal = false">
              {{ t("sidebar.close") }}
            </button>
            <button class="btn btn--primary" type="submit" :disabled="isTransferring">
              {{ isTransferring ? "..." : t("invoice.transferConfirm") }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <div v-if="showGuideModal" class="modal" @click.self="closeGuide(true)">
      <div class="modal__panel invoice-guide-modal">
        <header class="invoice-guide-modal__head">
          <h3>{{ t("invoice.guideTitle") }}</h3>
          <button class="btn" type="button" @click="closeGuide(true)">✕</button>
        </header>
        <p class="muted">{{ t("invoice.guideIntro") }}</p>
        <ol class="invoice-guide-modal__steps">
          <li>
            <strong>{{ t("invoice.guideStep1Title") }}</strong>
            <p>{{ t("invoice.guideStep1Body") }}</p>
          </li>
          <li>
            <strong>{{ t("invoice.guideStep2Title") }}</strong>
            <p>{{ t("invoice.guideStep2Body") }}</p>
          </li>
          <li>
            <strong>{{ t("invoice.guideStep3Title") }}</strong>
            <p>{{ t("invoice.guideStep3Body") }}</p>
          </li>
          <li>
            <strong>{{ t("invoice.guideStep4Title") }}</strong>
            <p>{{ t("invoice.guideStep4Body") }}</p>
          </li>
        </ol>
        <div class="invoice-guide-modal__actions">
          <button class="btn btn--primary" type="button" @click="closeGuide(true)">
            {{ t("invoice.guideClose") }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
