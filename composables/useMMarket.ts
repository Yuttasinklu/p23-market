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

const EXCHANGE_RATE = 10;
const nowUnix = () => Math.floor(Date.now() / 1000);

export const useMMarket = () => {
  const { t } = useLocale();
  const players = useState<Player[]>("players", () => [
    {
      id: "u1",
      username: "banker",
      password: "1234",
      displayName: "P23 Market Admin",
      avatarIndex: 0,
      role: "admin",
      coin: 0,
      bankDebt: 0,
    },
    {
      id: "u2",
      username: "player1",
      password: "1234",
      displayName: "Player 1",
      avatarIndex: 1,
      role: "player",
      coin: 120,
      bankDebt: 20,
    },
    {
      id: "u3",
      username: "player3",
      password: "1234",
      displayName: "Player 3",
      avatarIndex: 2,
      role: "player",
      coin: 80,
      bankDebt: 40,
    },
    {
      id: "u4",
      username: "player4",
      password: "1234",
      displayName: "Player 4",
      avatarIndex: 3,
      role: "player",
      coin: 150,
      bankDebt: 10,
    },
    {
      id: "u5",
      username: "player5",
      password: "1234",
      displayName: "Player 5",
      avatarIndex: 4,
      role: "player",
      coin: 95,
      bankDebt: 55,
    },
    {
      id: "u6",
      username: "player6",
      password: "1234",
      displayName: "Player 6",
      avatarIndex: 5,
      role: "player",
      coin: 132,
      bankDebt: 24,
    },
    {
      id: "u7",
      username: "player7",
      password: "1234",
      displayName: "Player 7",
      avatarIndex: 6,
      role: "player",
      coin: 76,
      bankDebt: 15,
    },
    {
      id: "u8",
      username: "player8",
      password: "1234",
      displayName: "Player 8",
      avatarIndex: 7,
      role: "player",
      coin: 168,
      bankDebt: 90,
    },
    {
      id: "u9",
      username: "player9",
      password: "1234",
      displayName: "Player 9",
      avatarIndex: 8,
      role: "player",
      coin: 54,
      bankDebt: 30,
    },
    {
      id: "u10",
      username: "player10",
      password: "1234",
      displayName: "Player 10",
      avatarIndex: 9,
      role: "player",
      coin: 188,
      bankDebt: 42,
    },
    {
      id: "u11",
      username: "player11",
      password: "1234",
      displayName: "Player 11",
      avatarIndex: 10,
      role: "player",
      coin: 118,
      bankDebt: 76,
    },
    {
      id: "u12",
      username: "player12",
      password: "1234",
      displayName: "Player 12",
      avatarIndex: 11,
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
      createdAt: nowUnix() - 60 * 90,
    },
    {
      id: "tx2",
      type: "transfer",
      fromUserId: "u3",
      toUserId: "u4",
      amount: 50,
      note: "table B",
      createdAt: nowUnix() - 60 * 45,
    },
    {
      id: "tx3",
      type: "borrow",
      toUserId: "u5",
      amount: 20,
      note: "top up",
      createdAt: nowUnix() - 60 * 40,
    },
    {
      id: "tx4",
      type: "transfer",
      fromUserId: "u10",
      toUserId: "u8",
      amount: 35,
      note: "joker round",
      createdAt: nowUnix() - 60 * 37,
    },
    {
      id: "tx5",
      type: "transfer",
      fromUserId: "u6",
      toUserId: "u11",
      amount: 25,
      note: "lunch bet",
      createdAt: nowUnix() - 60 * 33,
    },
    {
      id: "tx6",
      type: "repay",
      fromUserId: "u3",
      amount: 10,
      note: "partial repay",
      createdAt: nowUnix() - 60 * 31,
    },
    {
      id: "tx7",
      type: "transfer",
      fromUserId: "u8",
      toUserId: "u12",
      amount: 40,
      note: "speed match",
      createdAt: nowUnix() - 60 * 28,
    },
    {
      id: "tx8",
      type: "transfer",
      fromUserId: "u4",
      toUserId: "u2",
      amount: 15,
      note: "comeback",
      createdAt: nowUnix() - 60 * 24,
    },
    {
      id: "tx9",
      type: "borrow",
      toUserId: "u9",
      amount: 30,
      note: "late session",
      createdAt: nowUnix() - 60 * 21,
    },
    {
      id: "tx10",
      type: "transfer",
      fromUserId: "u11",
      toUserId: "u7",
      amount: 18,
      note: "double or nothing",
      createdAt: nowUnix() - 60 * 18,
    },
    {
      id: "tx11",
      type: "transfer",
      fromUserId: "u12",
      toUserId: "u10",
      amount: 60,
      note: "boss round",
      createdAt: nowUnix() - 60 * 15,
    },
    {
      id: "tx12",
      type: "repay",
      fromUserId: "u5",
      amount: 12,
      note: "repay",
      createdAt: nowUnix() - 60 * 11,
    },
    {
      id: "tx13",
      type: "transfer",
      fromUserId: "u7",
      toUserId: "u6",
      amount: 22,
      note: "counter hit",
      createdAt: nowUnix() - 60 * 9,
    },
    {
      id: "tx14",
      type: "transfer",
      fromUserId: "u2",
      toUserId: "u4",
      amount: 27,
      note: "last combo",
      createdAt: nowUnix() - 60 * 6,
    },
    {
      id: "tx15",
      type: "transfer",
      fromUserId: "u3",
      toUserId: "u8",
      amount: 14,
      note: "final hand",
      createdAt: nowUnix() - 60 * 3,
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
    [...transactions.value].sort((a, b) => b.createdAt - a.createdAt),
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

  const formatTime = (unixTs: number) =>
    new Date(unixTs * 1000).toLocaleString("en-GB", {
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
    return { ok: true, message: "" };
  };

  const register = (displayName: string, username: string, password: string, avatarIndex: number) => {
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
      avatarIndex: Number.isInteger(avatarIndex) ? Math.max(0, Math.min(24, avatarIndex)) : 0,
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
      createdAt: nowUnix(),
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
      createdAt: nowUnix(),
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
      createdAt: nowUnix(),
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
      createdAt: nowUnix(),
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
