import { useState } from "#app";
import { computed } from "vue";
import { useLocale } from "~/composables/useLocale";
import { useApi } from "~/composables/useApi";

type Role = "admin" | "player";
type TxType = "transfer" | "borrow" | "repay";

export interface Player {
  id: string;
  username: string;
  password: string;
  displayName: string;
  avatarIndex: number;
  role: Role;
  coin: number;
  bankDebt: number;
}

export interface LedgerTx {
  id: string;
  type: TxType;
  fromUserId?: string;
  toUserId?: string;
  amount: number;
  note: string;
  createdAt: number;
}

export interface SettlementRun {
  id: string;
  createdAt: number;
  runByUserId: string;
  players: Array<{
    playerId: string;
    coin: number;
    bankDebt: number;
    net: number;
  }>;
}

interface ApiPlayer {
  id: string;
  username: string;
  displayName: string;
  avatarIndex?: number;
  role: Role | string;
  coin: number;
  bankDebt: number;
}

interface ApiLeaderboardItem {
  rank?: number;
  playerId?: string;
  id?: string;
  displayName: string;
  coin: number;
  bankDebt: number;
  net?: number;
}

interface LeaderboardEntry {
  id: string;
  username: string;
  displayName: string;
  avatarIndex: number;
  coin: number;
  bankDebt: number;
  netWorth: number;
}

interface ApiLoginResponse {
  token: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarIndex?: number;
    role: Role;
  };
}

interface ApiTransactionResponse {
  items: LedgerTx[];
}

interface ApiSettlementRunsResponse {
  items: SettlementRun[];
}

interface ApiLeaderboardResponse {
  items: ApiLeaderboardItem[];
}

interface ApiDashboardSummary {
  totals?: {
    totalCoin?: number;
    totalDebt?: number;
  };
  topWinner?: {
    playerId?: string;
    displayName?: string;
    net?: number;
  };
  topLoser?: {
    playerId?: string;
    displayName?: string;
    net?: number;
  };
  recentTransactions?: LedgerTx[];
}

const EXCHANGE_RATE = 10;
const SESSION_STORAGE_KEY = "p23-market-session";

const normalizeRole = (role?: string): Role => {
  if (!role) return "player";
  const value = role.toLowerCase();
  return value === "admin" ? "admin" : "player";
};

const mapPlayer = (player: ApiPlayer): Player => ({
  id: player.id,
  username: player.username,
  password: "",
  displayName: player.displayName,
  avatarIndex: Number.isInteger(player.avatarIndex) ? Number(player.avatarIndex) : 0,
  role: normalizeRole(player.role),
  coin: Number(player.coin || 0),
  bankDebt: Number(player.bankDebt || 0)
});

const extractErrorMessage = (error: unknown, fallback: string) => {
  const maybe = error as { data?: { error?: { message?: string } }; message?: string };
  return maybe?.data?.error?.message || maybe?.message || fallback;
};

export const useMMarket = () => {
  const { t } = useLocale();
  const { apiFetch } = useApi();

  const players = useState<Player[]>("players", () => []);
  const transactions = useState<LedgerTx[]>("transactions", () => []);
  const leaderboardRows = useState<ApiLeaderboardItem[]>("leaderboardRows", () => []);
  const dashboardSummary = useState<ApiDashboardSummary | null>("dashboardSummary", () => null);
  const settlementRuns = useState<SettlementRun[]>("settlementRuns", () => []);
  const currentUserId = useState<string | null>("currentUserId", () => null);
  const authToken = useState<string | null>("authToken", () => null);
  const initialized = useState<boolean>("mmarketInitialized", () => false);
  const initializing = useState<boolean>("mmarketInitializing", () => false);
  const sessionLoaded = useState<boolean>("mmarketSessionLoaded", () => false);

  const authHeaders = () => (authToken.value ? { Authorization: `Bearer ${authToken.value}` } : {});

  const saveSession = () => {
    if (!process.client) return;
    if (!authToken.value || !currentUserId.value) {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      return;
    }
    localStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({
        token: authToken.value,
        userId: currentUserId.value
      })
    );
  };

  const loadSession = () => {
    if (!process.client || sessionLoaded.value) return;
    sessionLoaded.value = true;

    try {
      const raw = localStorage.getItem(SESSION_STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as { token?: string; userId?: string };
      if (typeof parsed?.token === "string" && typeof parsed?.userId === "string") {
        authToken.value = parsed.token;
        currentUserId.value = parsed.userId;
      }
    } catch {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  };

  const refreshPlayers = async () => {
    try {
      const response = await apiFetch<{ items: ApiPlayer[] }>("players", {
        method: "GET",
        headers: authHeaders()
      });
      players.value = Array.isArray(response.items) ? response.items.map(mapPlayer) : [];
    } catch {
      players.value = [];
    }
  };

  const refreshTransactions = async (playerId?: string) => {
    if (!authToken.value) {
      transactions.value = [];
      return;
    }
    try {
      const query = new URLSearchParams({
        limit: "100"
      });
      const normalizedPlayerId =
        typeof playerId === "string" && playerId.trim() && playerId !== "all"
          ? playerId.trim()
          : "";
      if (normalizedPlayerId) query.set("playerId", normalizedPlayerId);

      const response = await apiFetch<ApiTransactionResponse>(`transactions?${query.toString()}`, {
        method: "GET",
        headers: authHeaders()
      });
      transactions.value = Array.isArray(response.items)
        ? [...response.items].sort((a, b) => b.createdAt - a.createdAt)
        : [];
    } catch {
      transactions.value = [];
    }
  };

  const refreshLeaderboard = async () => {
    try {
      const response = await apiFetch<ApiLeaderboardResponse>("leaderboard", {
        method: "GET",
        headers: authHeaders()
      });
      leaderboardRows.value = Array.isArray(response.items) ? response.items : [];
    } catch {
      leaderboardRows.value = [];
    }
  };

  const refreshCurrentUserOnly = async () => {
    if (!currentUserId.value) return;
    try {
      const raw = await apiFetch<any>(`players/${currentUserId.value}`, {
        method: "GET",
        headers: authHeaders()
      });
      const payload = raw?.id ? raw : raw?.item || raw?.user;
      if (!payload?.id) return;
      const mapped = mapPlayer(payload as ApiPlayer);
      const index = players.value.findIndex((item) => item.id === mapped.id);
      if (index >= 0) {
        players.value[index] = mapped;
      } else {
        players.value.unshift(mapped);
      }
    } catch {
      // Keep current UI state if refresh fails.
    }
  };

  const refreshDashboard = async () => {
    try {
      const response = await apiFetch<ApiDashboardSummary>("dashboard", {
        method: "GET",
        headers: authHeaders()
      });
      dashboardSummary.value = response || null;
    } catch {
      dashboardSummary.value = null;
    }
  };

  const refreshSettlementRuns = async () => {
    if (!authToken.value) {
      settlementRuns.value = [];
      return;
    }
    try {
      const response = await apiFetch<ApiSettlementRunsResponse>("settlement/runs", {
        method: "GET",
        headers: authHeaders()
      });
      settlementRuns.value = Array.isArray(response.items)
        ? [...response.items].sort((a, b) => b.createdAt - a.createdAt)
        : [];
    } catch {
      settlementRuns.value = [];
    }
  };

  const initializeData = async () => {
    if (initialized.value || initializing.value) return;
    initializing.value = true;

    try {
      await Promise.allSettled([
        refreshPlayers(),
        refreshLeaderboard(),
        refreshDashboard(),
        refreshTransactions(),
        refreshSettlementRuns()
      ]);
      initialized.value = true;

      if (currentUserId.value && !players.value.some((player) => player.id === currentUserId.value)) {
        currentUserId.value = null;
        authToken.value = null;
        saveSession();
      }
    } catch {
      initialized.value = true;
    } finally {
      initializing.value = false;
    }
  };

  if (process.client && !initialized.value && !initializing.value) {
    loadSession();
    void initializeData();
  }

  const currentUser = computed(
    () => players.value.find((player) => player.id === currentUserId.value) || null
  );
  const isAuthenticated = computed(() => Boolean(authToken.value));

  const allPlayers = computed(() => players.value);

  const leaderboard = computed(() =>
    leaderboardRows.value.length
      ? leaderboardRows.value
          .map((row): LeaderboardEntry => {
            const id = row.playerId || row.id || "";
            const player = players.value.find((item) => item.id === id);
            return {
              id,
              username: player?.username || "",
              displayName: row.displayName || player?.displayName || "-",
              avatarIndex: Number.isInteger(player?.avatarIndex) ? Number(player?.avatarIndex) : 0,
              coin: Number(row.coin || 0),
              bankDebt: Number(row.bankDebt || 0),
              netWorth: Number(row.net ?? Number(row.coin || 0) - Number(row.bankDebt || 0))
            };
          })
          .sort((a, b) => b.netWorth - a.netWorth)
      : [...players.value]
          .filter((player) => player.role === "player")
          .map((player) => ({
            ...player,
            netWorth: player.coin - player.bankDebt
          }))
          .sort((a, b) => b.netWorth - a.netWorth)
  );

  const recentTransactions = computed(() =>
    [...transactions.value].sort((a, b) => b.createdAt - a.createdAt)
  );

  const totalCoin = computed(() =>
    players.value
      .filter((player) => player.role === "player")
      .reduce((sum, player) => sum + player.coin, 0)
  );

  const totalDebt = computed(() =>
    players.value
      .filter((player) => player.role === "player")
      .reduce((sum, player) => sum + player.bankDebt, 0)
  );

  const dashboardTotalCoin = computed(() =>
    Number(dashboardSummary.value?.totals?.totalCoin ?? totalCoin.value)
  );

  const dashboardTopWinner = computed(() => {
    const api = dashboardSummary.value?.topWinner;
    if (api?.displayName) {
      return {
        id: api.playerId || "",
        displayName: api.displayName,
        netWorth: Number(api.net || 0)
      };
    }
    return leaderboard.value[0] || null;
  });

  const dashboardTopLoser = computed(() => {
    const api = dashboardSummary.value?.topLoser;
    if (api?.displayName) {
      return {
        id: api.playerId || "",
        displayName: api.displayName,
        netWorth: Number(api.net || 0)
      };
    }
    return leaderboard.value[leaderboard.value.length - 1] || null;
  });

  const dashboardRecentTransactions = computed(() => {
    const apiItems = dashboardSummary.value?.recentTransactions;
    if (Array.isArray(apiItems) && apiItems.length) {
      return [...apiItems].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);
    }
    return recentTransactions.value.slice(0, 5);
  });

  const txLabel = (tx: LedgerTx) => {
    if (tx.type === "transfer") return t("tx.transfer");
    if (tx.type === "borrow") return t("tx.borrow");
    return t("tx.repay");
  };

  const formatTime = (unixTs: number) =>
    new Date(unixTs * 1000).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    });

  const playerById = (id?: string) =>
    players.value.find((player) => player.id === id);

  const login = async (username: string, password: string) => {
    try {
      const response = await apiFetch<ApiLoginResponse>("auth/login", {
        method: "POST",
        body: {
          username: username.trim(),
          password: password.trim()
        }
      });

      authToken.value = response.token;
      currentUserId.value = response.user.id;
      saveSession();
      await Promise.all([refreshPlayers(), refreshLeaderboard(), refreshDashboard(), refreshTransactions(), refreshSettlementRuns()]);
      if (!players.value.some((player) => player.id === response.user.id)) {
        players.value.unshift({
          id: response.user.id,
          username: response.user.username,
          password: "",
          displayName: response.user.displayName,
          avatarIndex: Number.isInteger(response.user.avatarIndex) ? Number(response.user.avatarIndex) : 0,
          role: normalizeRole(response.user.role),
          coin: 0,
          bankDebt: 0
        });
      }

      return { ok: true, message: "" };
    } catch (error) {
      return { ok: false, message: extractErrorMessage(error, t("msg.invalidPassword")) };
    }
  };

  const register = async (displayName: string, username: string, password: string, avatarIndex: number) => {
    try {
      const response = await apiFetch<ApiLoginResponse>("auth/register", {
        method: "POST",
        body: {
          displayName: displayName.trim(),
          username: username.trim(),
          password: password.trim(),
          avatarIndex
        }
      });

      authToken.value = response.token;
      currentUserId.value = response.user.id;
      saveSession();
      await Promise.all([refreshPlayers(), refreshLeaderboard(), refreshDashboard(), refreshTransactions(), refreshSettlementRuns()]);
      if (!players.value.some((player) => player.id === response.user.id)) {
        players.value.unshift({
          id: response.user.id,
          username: response.user.username,
          password: "",
          displayName: response.user.displayName,
          avatarIndex: Number.isInteger(response.user.avatarIndex) ? Number(response.user.avatarIndex) : 0,
          role: normalizeRole(response.user.role),
          coin: 0,
          bankDebt: 0
        });
      }

      return { ok: true, message: t("msg.created", { name: response.user.displayName }) };
    } catch (error) {
      return { ok: false, message: extractErrorMessage(error, t("msg.usernameExists")) };
    }
  };

  const logout = async () => {
    try {
      if (authToken.value) {
        await apiFetch<{ ok: boolean }>("auth/logout", {
          method: "POST",
          headers: authHeaders(),
          body: {}
        });
      }
    } catch {
      // Ignore logout API failure and clear local session anyway.
    } finally {
      currentUserId.value = null;
      authToken.value = null;
      saveSession();
    }
  };

  const addTransfer = async (toUserId: string, amount: number, note: string) => {
    if (!currentUser.value)
      return { ok: false, message: t("msg.loginFirst") };
    if (currentUser.value.id === toUserId)
      return { ok: false, message: t("msg.receiverSelf") };
    if (!Number.isFinite(amount) || amount <= 0)
      return { ok: false, message: t("msg.amountGtZero") };

    try {
      await apiFetch("transfers", {
        method: "POST",
        headers: authHeaders(),
        body: {
          receiverId: toUserId,
          amount,
          note: note.trim()
        }
      });

      await Promise.all([refreshPlayers(), refreshLeaderboard(), refreshDashboard(), refreshTransactions()]);
      return { ok: true, message: t("msg.transferCompleted") };
    } catch (error) {
      return { ok: false, message: extractErrorMessage(error, t("msg.playerNotFound")) };
    }
  };

  const borrowFromBank = async (amount: number, note: string) => {
    if (!currentUser.value)
      return { ok: false, message: t("msg.loginFirst") };
    if (!Number.isFinite(amount) || amount <= 0)
      return { ok: false, message: t("msg.amountGtZero") };

    try {
      await apiFetch("bank/borrow", {
        method: "POST",
        headers: authHeaders(),
        body: {
          amount,
          note: note.trim()
        }
      });

      await Promise.all([refreshPlayers(), refreshLeaderboard(), refreshDashboard(), refreshTransactions()]);
      return { ok: true, message: t("msg.borrowCompleted") };
    } catch (error) {
      return { ok: false, message: extractErrorMessage(error, t("msg.playerNotFound")) };
    }
  };

  const repayToBank = async (amount: number, note: string) => {
    if (!currentUser.value)
      return { ok: false, message: t("msg.loginFirst") };
    if (!Number.isFinite(amount) || amount <= 0)
      return { ok: false, message: t("msg.amountGtZero") };

    try {
      await apiFetch("bank/repay", {
        method: "POST",
        headers: authHeaders(),
        body: {
          amount,
          note: note.trim()
        }
      });

      await Promise.all([refreshPlayers(), refreshLeaderboard(), refreshDashboard(), refreshTransactions()]);
      return { ok: true, message: t("msg.repayCompleted") };
    } catch (error) {
      return { ok: false, message: extractErrorMessage(error, t("msg.notEnoughCoin")) };
    }
  };

  const runSettlement = async () => {
    if (!currentUser.value)
      return { ok: false, message: t("msg.loginFirst") };
    if (currentUser.value.role !== "admin")
      return { ok: false, message: t("msg.onlyAdminSettlement") };

    try {
      await apiFetch("settlement/run", {
        method: "POST",
        headers: authHeaders(),
        body: {}
      });

      await Promise.all([refreshSettlementRuns(), refreshPlayers(), refreshLeaderboard(), refreshDashboard()]);
      return { ok: true, message: t("msg.settlementSuccess") };
    } catch (error) {
      return { ok: false, message: extractErrorMessage(error, t("msg.onlyAdminSettlement")) };
    }
  };

  const reloadData = async () => {
    await Promise.all([refreshPlayers(), refreshLeaderboard(), refreshDashboard(), refreshTransactions(), refreshSettlementRuns()]);
  };

  const refreshTransactionsOnly = async (playerId?: string) => {
    await refreshTransactions(playerId);
  };

  const refreshLeaderboardOnly = async () => {
    await refreshLeaderboard();
  };

  const refreshDashboardOnly = async () => {
    await refreshDashboard();
  };

  const thbValue = (coin: number) => coin * EXCHANGE_RATE;

  return {
    allPlayers,
    currentUser,
    isAuthenticated,
    leaderboard,
    recentTransactions,
    dashboardRecentTransactions,
    settlementRuns,
    totalCoin,
    totalDebt,
    dashboardTotalCoin,
    dashboardTopWinner,
    dashboardTopLoser,
    txLabel,
    formatTime,
    playerById,
    login,
    register,
    logout,
    addTransfer,
    borrowFromBank,
    repayToBank,
    runSettlement,
    reloadData,
    refreshCurrentUserOnly,
    refreshTransactionsOnly,
    refreshLeaderboardOnly,
    refreshDashboardOnly,
    initializeData,
    thbValue,
    exchangeRate: EXCHANGE_RATE
  };
};
