import { useState } from "#app";
import { computed } from "vue";
import { useLocale } from "~/composables/useLocale";

type Role = "admin" | "player";
type TxType = "transfer" | "borrow" | "repay";

export interface Player {
  id: string;
  username: string;
  password: string;
  displayName: string;
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
  createdAt: string;
}

export interface SettlementRun {
  id: string;
  createdAt: string;
  runByUserId: string;
  players: Array<{
    playerId: string;
    coin: number;
    bankDebt: number;
    net: number;
  }>;
}

const EXCHANGE_RATE = 10;

export const useMMarket = () => {
  const { t } = useLocale();
  const players = useState<Player[]>("players", () => [
    {
      id: "u1",
      username: "banker",
      password: "1234",
      displayName: "P23 Market Admin",
      role: "admin",
      coin: 0,
      bankDebt: 0,
    },
    {
      id: "u2",
      username: "player1",
      password: "1234",
      displayName: "Player 1",
      role: "player",
      coin: 120,
      bankDebt: 20,
    },
    {
      id: "u3",
      username: "player3",
      password: "1234",
      displayName: "Player 3",
      role: "player",
      coin: 80,
      bankDebt: 40,
    },
    {
      id: "u4",
      username: "player4",
      password: "1234",
      displayName: "Player 4",
      role: "player",
      coin: 150,
      bankDebt: 10,
    },
    {
      id: "u5",
      username: "player5",
      password: "1234",
      displayName: "Player 5",
      role: "player",
      coin: 95,
      bankDebt: 55,
    },
    {
      id: "u6",
      username: "player6",
      password: "1234",
      displayName: "Player 6",
      role: "player",
      coin: 132,
      bankDebt: 24,
    },
    {
      id: "u7",
      username: "player7",
      password: "1234",
      displayName: "Player 7",
      role: "player",
      coin: 76,
      bankDebt: 15,
    },
    {
      id: "u8",
      username: "player8",
      password: "1234",
      displayName: "Player 8",
      role: "player",
      coin: 168,
      bankDebt: 90,
    },
    {
      id: "u9",
      username: "player9",
      password: "1234",
      displayName: "Player 9",
      role: "player",
      coin: 54,
      bankDebt: 30,
    },
    {
      id: "u10",
      username: "player10",
      password: "1234",
      displayName: "Player 10",
      role: "player",
      coin: 188,
      bankDebt: 42,
    },
    {
      id: "u11",
      username: "player11",
      password: "1234",
      displayName: "Player 11",
      role: "player",
      coin: 118,
      bankDebt: 76,
    },
    {
      id: "u12",
      username: "player12",
      password: "1234",
      displayName: "Player 12",
      role: "player",
      coin: 143,
      bankDebt: 36,
    },
  ]);

  const transactions = useState<LedgerTx[]>("transactions", () => [
    {
      id: "tx1",
      type: "transfer",
      fromUserId: "u2",
      toUserId: "u3",
      amount: 50,
      note: "table A",
      createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    },
    {
      id: "tx2",
      type: "transfer",
      fromUserId: "u3",
      toUserId: "u4",
      amount: 50,
      note: "table B",
      createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    },
  ]);

  const settlementRuns = useState<SettlementRun[]>("settlementRuns", () => []);
  const currentUserId = useState<string | null>("currentUserId", () => null);

  const currentUser = computed(
    () =>
      players.value.find((player) => player.id === currentUserId.value) || null,
  );

  const allPlayers = computed(() => players.value);

  const leaderboard = computed(() =>
    [...players.value]
      .filter((player) => player.role === "player")
      .map((player) => ({
        ...player,
        netWorth: player.coin - player.bankDebt,
      }))
      .sort((a, b) => b.netWorth - a.netWorth),
  );

  const recentTransactions = computed(() =>
    [...transactions.value].sort(
      (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
    ),
  );

  const totalCoin = computed(() =>
    players.value
      .filter((player) => player.role === "player")
      .reduce((sum, player) => sum + player.coin, 0),
  );
  const totalDebt = computed(() =>
    players.value
      .filter((player) => player.role === "player")
      .reduce((sum, player) => sum + player.bankDebt, 0),
  );

  const txLabel = (tx: LedgerTx) => {
    if (tx.type === "transfer") return t("tx.transfer");
    if (tx.type === "borrow") return t("tx.borrow");
    return t("tx.repay");
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  const playerById = (id?: string) =>
    players.value.find((player) => player.id === id);

  const login = (username: string, password: string) => {
    const found = players.value.find(
      (player) => player.username.toLowerCase() === username.toLowerCase(),
    );
    if (!found) return { ok: false, message: t("msg.userNotFound") };
    if (!password.trim()) return { ok: false, message: t("msg.passwordRequired") };
    if (found.password !== password)
      return { ok: false, message: t("msg.invalidPassword") };
    currentUserId.value = found.id;
    return { ok: true, message: t("msg.welcome", { name: found.displayName }) };
  };

  const register = (displayName: string, username: string, password: string) => {
    if (!displayName.trim() || !username.trim())
      return { ok: false, message: t("msg.nameUsernameRequired") };
    if (!password.trim()) return { ok: false, message: t("msg.passwordRequired") };
    const usernameExists = players.value.some(
      (player) => player.username.toLowerCase() === username.toLowerCase(),
    );
    if (usernameExists)
      return { ok: false, message: t("msg.usernameExists") };

    const user: Player = {
      id: `u${players.value.length + 1}`,
      username: username.trim(),
      password: password.trim(),
      displayName: displayName.trim(),
      role: "player",
      coin: 0,
      bankDebt: 0,
    };
    players.value.push(user);
    currentUserId.value = user.id;
    return { ok: true, message: t("msg.created", { name: user.displayName }) };
  };

  const logout = () => {
    currentUserId.value = null;
  };

  const addTransfer = (toUserId: string, amount: number, note: string) => {
    if (!currentUser.value)
      return { ok: false, message: t("msg.loginFirst") };
    if (currentUser.value.id === toUserId)
      return { ok: false, message: t("msg.receiverSelf") };
    if (!Number.isFinite(amount) || amount <= 0)
      return { ok: false, message: t("msg.amountGtZero") };

    const fromPlayer = playerById(currentUser.value.id);
    const toPlayer = playerById(toUserId);
    if (!fromPlayer || !toPlayer)
      return { ok: false, message: t("msg.playerNotFound") };

    fromPlayer.coin -= amount;
    toPlayer.coin += amount;

    transactions.value.push({
      id: `tx${transactions.value.length + 1}`,
      type: "transfer",
      fromUserId: fromPlayer.id,
      toUserId,
      amount,
      note: note.trim() || "no note",
      createdAt: new Date().toISOString(),
    });

    return { ok: true, message: t("msg.transferCompleted") };
  };

  const borrowFromBank = (amount: number, note: string) => {
    if (!currentUser.value)
      return { ok: false, message: t("msg.loginFirst") };
    if (!Number.isFinite(amount) || amount <= 0)
      return { ok: false, message: t("msg.amountGtZero") };

    const player = playerById(currentUser.value.id);
    if (!player) return { ok: false, message: t("msg.playerNotFound") };

    player.coin += amount;
    player.bankDebt += amount;

    transactions.value.push({
      id: `tx${transactions.value.length + 1}`,
      type: "borrow",
      toUserId: player.id,
      amount,
      note: note.trim() || "borrow",
      createdAt: new Date().toISOString(),
    });

    return { ok: true, message: t("msg.borrowCompleted") };
  };

  const repayToBank = (amount: number, note: string) => {
    if (!currentUser.value)
      return { ok: false, message: t("msg.loginFirst") };
    if (!Number.isFinite(amount) || amount <= 0)
      return { ok: false, message: t("msg.amountGtZero") };

    const player = playerById(currentUser.value.id);
    if (!player) return { ok: false, message: t("msg.playerNotFound") };
    if (amount > player.coin) return { ok: false, message: t("msg.notEnoughCoin") };
    if (amount > player.bankDebt)
      return { ok: false, message: t("msg.exceedDebt") };

    player.coin -= amount;
    player.bankDebt -= amount;

    transactions.value.push({
      id: `tx${transactions.value.length + 1}`,
      type: "repay",
      fromUserId: player.id,
      amount,
      note: note.trim() || "repay",
      createdAt: new Date().toISOString(),
    });

    return { ok: true, message: t("msg.repayCompleted") };
  };

  const runSettlement = () => {
    if (!currentUser.value)
      return { ok: false, message: t("msg.loginFirst") };
    if (currentUser.value.role !== "admin")
      return { ok: false, message: t("msg.onlyAdminSettlement") };

    const snapshot = players.value
      .filter((player) => player.role === "player")
      .map((player) => ({
        playerId: player.id,
        coin: player.coin,
        bankDebt: player.bankDebt,
        net: player.coin - player.bankDebt,
      }));

    settlementRuns.value.unshift({
      id: `set${settlementRuns.value.length + 1}`,
      createdAt: new Date().toISOString(),
      runByUserId: currentUser.value.id,
      players: snapshot,
    });

    return { ok: true, message: t("msg.settlementSuccess") };
  };

  const thbValue = (coin: number) => coin * EXCHANGE_RATE;

  return {
    allPlayers,
    currentUser,
    leaderboard,
    recentTransactions,
    settlementRuns,
    totalCoin,
    totalDebt,
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
    thbValue,
    exchangeRate: EXCHANGE_RATE,
  };
};
