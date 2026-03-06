import { computed } from "vue";
import { useState } from "#app";
import { useApi } from "~/composables/useApi";
import { useLocale } from "~/composables/useLocale";
import { useMMarket } from "~/composables/useMMarket";

export type InvoiceStatus = "pending" | "paid" | "cancelled";
export type InvoiceTab = "assigned" | "created";

export interface InvoiceItem {
  id: string;
  createdByUserId: string;
  currentPayerUserId: string;
  amount: number;
  noteLatest: string;
  status: InvoiceStatus;
  createdAt: number;
  updatedAt: number;
  paidAt: number | null;
  cancelledAt: number | null;
}

interface ListParams {
  tab: InvoiceTab;
  status: InvoiceStatus | "all";
  page?: number;
  limit?: number;
}

interface ListResponse {
  items?: unknown[];
  pagination?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

const isInvoiceStatus = (value: unknown): value is InvoiceStatus =>
  value === "pending" || value === "paid" || value === "cancelled";

const toNumber = (value: unknown, fallback = 0) =>
  Number.isFinite(Number(value)) ? Number(value) : fallback;

const normalizeInvoice = (raw: any): InvoiceItem => ({
  id: String(raw?.id || ""),
  createdByUserId: String(raw?.createdByUserId || raw?.creatorUserId || ""),
  currentPayerUserId: String(raw?.currentPayerUserId || raw?.payerUserId || ""),
  amount: Math.max(0, Math.floor(toNumber(raw?.amount, 0))),
  noteLatest: String(raw?.noteLatest || raw?.note || ""),
  status: isInvoiceStatus(raw?.status) ? raw.status : "pending",
  createdAt: Math.floor(toNumber(raw?.createdAt, 0)),
  updatedAt: Math.floor(toNumber(raw?.updatedAt, toNumber(raw?.createdAt, 0))),
  paidAt:
    raw?.paidAt === null || raw?.paidAt === undefined
      ? null
      : Math.floor(toNumber(raw?.paidAt, 0)),
  cancelledAt:
    raw?.cancelledAt === null || raw?.cancelledAt === undefined
      ? null
      : Math.floor(toNumber(raw?.cancelledAt, 0))
});

const extractErrorData = (error: unknown) => {
  const maybe = error as {
    data?: {
      error?: { code?: string; message?: string };
      code?: string;
      message?: string;
    };
    message?: string;
  };

  const code = maybe?.data?.error?.code || maybe?.data?.code;
  const message = maybe?.data?.error?.message || maybe?.data?.message || maybe?.message;
  return { code, message };
};

export const useInvoices = () => {
  const { t } = useLocale();
  const { apiFetch } = useApi();
  const { refreshCurrentUserOnly } = useMMarket();
  const authToken = useState<string | null>("authToken", () => null);

  const authHeaders = computed(() =>
    authToken.value ? { Authorization: `Bearer ${authToken.value}` } : {}
  );

  const mapErrorMessage = (error: unknown) => {
    const { code, message } = extractErrorData(error);
    if (code === "INVOICE_NOT_FOUND") return t("invoice.msgNotFound");
    if (code === "NOT_INVOICE_PAYER") return t("invoice.msgNotPayer");
    if (code === "NOT_INVOICE_CREATOR") return t("invoice.msgNotCreator");
    if (code === "INVOICE_ALREADY_PAID" || code === "INVOICE_CANCELLED") {
      return t("invoice.msgAlreadyClosed");
    }
    if (code === "INVALID_TRANSFER_TARGET") return t("invoice.msgInvalidTarget");
    if (code === "INSUFFICIENT_COIN") return t("msg.notEnoughCoin");
    if (code === "VALIDATION_ERROR") return t("msg.validationError");
    return String(message || t("msg.validationError"));
  };

  const listMyInvoices = async (params: ListParams) => {
    const page = Math.max(1, Number(params.page || 1));
    const limit = Math.max(1, Number(params.limit || 20));

    if (!authToken.value) {
      return {
        ok: true as const,
        items: [] as InvoiceItem[],
        pagination: { page, limit, total: 0 }
      };
    }

    try {
      const query = new URLSearchParams({
        tab: params.tab,
        status: params.status,
        page: String(page),
        limit: String(limit)
      });

      const response = await apiFetch<ListResponse>(`invoices/my?${query.toString()}`, {
        method: "GET",
        headers: authHeaders.value
      });

      const items = Array.isArray(response?.items)
        ? response.items.map((item) => normalizeInvoice(item))
        : [];

      return {
        ok: true as const,
        items,
        pagination: {
          page: Number(response?.pagination?.page || page),
          limit: Number(response?.pagination?.limit || limit),
          total: Number(response?.pagination?.total || 0)
        }
      };
    } catch (error) {
      return {
        ok: false as const,
        items: [] as InvoiceItem[],
        pagination: { page, limit, total: 0 },
        message: mapErrorMessage(error)
      };
    }
  };

  const createInvoice = async (receiverId: string, amount: number, note: string) => {
    if (!authToken.value) return { ok: false as const, message: t("msg.loginFirst") };

    try {
      const response = await apiFetch<{ invoice?: unknown }>("invoices", {
        method: "POST",
        headers: authHeaders.value,
        body: {
          receiverId: receiverId.trim(),
          amount: Math.floor(amount),
          note: note.trim()
        }
      });

      return {
        ok: true as const,
        message: t("invoice.msgCreated"),
        invoice: response?.invoice ? normalizeInvoice(response.invoice) : null
      };
    } catch (error) {
      return { ok: false as const, message: mapErrorMessage(error) };
    }
  };

  const payInvoice = async (invoiceId: string) => {
    if (!authToken.value) return { ok: false as const, message: t("msg.loginFirst") };

    try {
      const response = await apiFetch<{ invoice?: unknown }>(`invoices/${invoiceId}/pay`, {
        method: "POST",
        headers: authHeaders.value,
        body: {}
      });
      await refreshCurrentUserOnly();
      return {
        ok: true as const,
        message: t("invoice.msgPaid"),
        invoice: response?.invoice ? normalizeInvoice(response.invoice) : null
      };
    } catch (error) {
      return { ok: false as const, message: mapErrorMessage(error) };
    }
  };

  const transferDebt = async (invoiceId: string, toUserId: string, note: string) => {
    if (!authToken.value) return { ok: false as const, message: t("msg.loginFirst") };

    try {
      const response = await apiFetch<{ invoice?: unknown }>(`invoices/${invoiceId}/transfer`, {
        method: "POST",
        headers: authHeaders.value,
        body: {
          toUserId: toUserId.trim(),
          note: note.trim()
        }
      });
      return {
        ok: true as const,
        message: t("invoice.msgTransferred"),
        invoice: response?.invoice ? normalizeInvoice(response.invoice) : null
      };
    } catch (error) {
      return { ok: false as const, message: mapErrorMessage(error) };
    }
  };

  const cancelInvoice = async (invoiceId: string) => {
    if (!authToken.value) return { ok: false as const, message: t("msg.loginFirst") };

    try {
      const response = await apiFetch<{ invoice?: unknown }>(`invoices/${invoiceId}/cancel`, {
        method: "POST",
        headers: authHeaders.value,
        body: {}
      });
      return {
        ok: true as const,
        message: t("invoice.msgCancelled"),
        invoice: response?.invoice ? normalizeInvoice(response.invoice) : null
      };
    } catch (error) {
      return { ok: false as const, message: mapErrorMessage(error) };
    }
  };

  return {
    listMyInvoices,
    createInvoice,
    payInvoice,
    transferDebt,
    cancelInvoice
  };
};
