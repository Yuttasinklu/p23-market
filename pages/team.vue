<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useMMarket } from "~/composables/useMMarket";
import { useToast } from "~/composables/useToast";
import { useMultiplayer, type MultiplayerMode, type MultiplayerRoomListItem } from "~/composables/useMultiplayer";

interface StageMember {
  id: string;
  displayName: string;
  avatarIndex: number;
  label: string;
}

type VoteChoice = "rock" | "paper" | "scissors";

const { currentUser } = useMMarket();
const { pushError, pushSuccess } = useToast();
const {
  rooms,
  roomDetails,
  teamRpsStates,
  teamRpsSubmittedCounts,
  teamRpsResolvedRounds,
  teamRpsFinishedStates,
  refreshRooms,
  createRoom,
  fetchRoom,
  clearRoomRealtimeState,
  subscribeLobby,
  joinRoom: joinRealtimeRoom,
  chooseTeam,
  startRoom,
  submitTeamRpsVote,
} = useMultiplayer();

const showCreateModal = ref(false);
const showStageModal = ref(false);
const showVoteModal = ref(false);
const loadingRooms = ref(false);
const isCreatingRoom = ref(false);
const isOpeningStage = ref(false);
const isJoiningRoom = ref(false);
const isSelectingTeam = ref(false);
const isStartingGame = ref(false);
const isSubmittingVote = ref(false);

const roomName = ref("");
const entryStake = ref(20);
const selectedMode = ref<MultiplayerMode>("team_rps_vote");
const activeStageRoom = ref<MultiplayerRoomListItem | null>(null);
const joinedRoomIds = useState<string[]>("team-rps-joined-room-ids", () => []);
const nowTs = ref(Math.floor(Date.now() / 1000));
const voteSelections = useState<Record<string, VoteChoice>>("team-rps-my-votes", () => ({}));
const clockTimer = ref<ReturnType<typeof setInterval> | null>(null);
const roundResultTimer = ref<ReturnType<typeof setTimeout> | null>(null);
const lingeringResolvedRound = ref<any | null>(null);

const voteOptions: Array<{ value: VoteChoice; label: string; image: string }> = [
  { value: "rock", label: "Rock", image: "/images/rps-rock-card.png" },
  { value: "paper", label: "Paper", image: "/images/rps-paper-card.png" },
  { value: "scissors", label: "Scissors", image: "/images/rps-scissor-card.png" },
];

const gameModeMeta: Record<MultiplayerMode, { label: string; description: string; route: string; live: boolean }> = {
  team_rps_vote: {
    label: "Team RPS",
    description: "Live now. Players join, pick Team A or B, then vote rock paper scissors together each round.",
    route: "/team-rps",
    live: true,
  },
  majority_die: {
    label: "Majority Die",
    description: "Coming later. The tab is ready, but the lobby is not connected in this release.",
    route: "/team",
    live: false,
  },
  highest_win: {
    label: "Highest Win",
    description: "Coming later. This mode is listed now so the team page structure is complete.",
    route: "/team",
    live: false,
  },
};

const formatTime = (unixTs: number) =>
  new Date(unixTs * 1000).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

const sortedRooms = computed(() =>
  [...rooms.value]
    .filter((room) => room.mode === selectedMode.value)
    .sort((a, b) => b.createdAt - a.createdAt),
);

const featuredModes = computed(() =>
  Object.entries(gameModeMeta).map(([value, meta]) => ({
    value: value as MultiplayerMode,
    ...meta,
    count: meta.live ? rooms.value.filter((room) => room.mode === value).length : 0,
  })),
);

const activeModeMeta = computed(() => gameModeMeta[selectedMode.value]);
const isLiveMode = computed(() => activeModeMeta.value.live);

const avatarPath = (index: number) => `/images/avatars/${index}.png`;

const activeRoomDetail = computed(() =>
  activeStageRoom.value ? roomDetails.value[activeStageRoom.value.id] || null : null,
);

const activeTeamRpsState = computed(() =>
  activeStageRoom.value ? teamRpsStates.value[activeStageRoom.value.id] || null : null,
);

const activeSubmittedCount = computed(() =>
  activeStageRoom.value ? teamRpsSubmittedCounts.value[activeStageRoom.value.id] || null : null,
);

const activeResolvedRound = computed(() =>
  activeStageRoom.value ? teamRpsResolvedRounds.value[activeStageRoom.value.id] || null : null,
);

const activeFinishedState = computed(() =>
  activeStageRoom.value ? teamRpsFinishedStates.value[activeStageRoom.value.id] || null : null,
);

const displayResolvedRound = computed(() =>
  activeResolvedRound.value || lingeringResolvedRound.value,
);

const currentRoomKey = computed(() =>
  activeStageRoom.value && activeTeamRpsState.value?.round
    ? `${activeStageRoom.value.id}:${activeTeamRpsState.value.round}`
    : "",
);

const myTeam = computed<"A" | "B" | null>(() => {
  if (!currentUser.value || !activeTeamRpsState.value) return null;
  if (activeTeamRpsState.value.teams.A.some((player) => player.userId === currentUser.value?.id)) return "A";
  if (activeTeamRpsState.value.teams.B.some((player) => player.userId === currentUser.value?.id)) return "B";
  return null;
});

const isHost = computed(() =>
  Boolean(currentUser.value?.id && (activeTeamRpsState.value?.hostUserId || activeStageRoom.value?.hostUserId) === currentUser.value.id),
);

const totalAssignedPlayers = computed(() =>
  (activeTeamRpsState.value?.teamCounts.A || 0) + (activeTeamRpsState.value?.teamCounts.B || 0),
);

const canStartGame = computed(() => {
  const state = activeTeamRpsState.value;
  if (!state || !isHost.value || state.status !== "waiting") return false;
  const total = state.teamCounts.A + state.teamCounts.B;
  return total >= 2 && total <= 10 && total % 2 === 0 && state.teamCounts.A === state.teamCounts.B;
});

const countdownSeconds = computed(() => {
  const endsAt = activeTeamRpsState.value?.inputEndsAt;
  if (endsAt) return Math.max(0, endsAt - nowTs.value);

  const activeRound = Number(activeTeamRpsState.value?.round || 0);
  if (
    activeSubmittedCount.value?.secondsLeft !== undefined &&
    activeSubmittedCount.value.round === activeRound
  ) {
    return Math.max(0, activeSubmittedCount.value.secondsLeft);
  }

  return 0;
});

const myVote = computed(() =>
  currentRoomKey.value ? voteSelections.value[currentRoomKey.value] || null : null,
);

const showRoundResultPhase = computed(() =>
  Boolean(displayResolvedRound.value) && !activeFinishedState.value,
);

const activeRoundNumber = computed(() =>
  Number(activeTeamRpsState.value?.round || displayResolvedRound.value?.round || 1),
);

const voteModalToneClass = computed(() => {
  if (activeRoundNumber.value >= 3) return "is-stage-3";
  if (activeRoundNumber.value === 2) return "is-stage-2";
  return "is-stage-1";
});

const isResolvedRoundDraw = (resolved: { roundWinner?: string; teamChoice?: { A?: string; B?: string } } | null) => {
  if (!resolved) return false;
  const normalizedWinner = String(resolved.roundWinner || "").toLowerCase();
  if (normalizedWinner === "draw" || normalizedWinner === "tie") return true;
  return Boolean(resolved.teamChoice?.A && resolved.teamChoice?.A === resolved.teamChoice?.B);
};

const myRoundOutcome = computed(() => {
  const resolved = displayResolvedRound.value;
  if (!resolved || !myTeam.value) return "";
  if (isResolvedRoundDraw(resolved)) return "Draw";
  return resolved.roundWinner === myTeam.value ? "Your team Win" : "Your team Lose";
});

const roundResultToneClass = computed(() => {
  const resolved = displayResolvedRound.value;
  if (!resolved || !myTeam.value) return "";
  if (isResolvedRoundDraw(resolved)) return "is-draw";
  return resolved.roundWinner === myTeam.value ? "is-win" : "is-lose";
});

const myRoundChoice = computed(() => {
  if (!displayResolvedRound.value || !myTeam.value) return null;
  return displayResolvedRound.value.teamChoice[myTeam.value];
});

const opponentRoundChoice = computed(() => {
  if (!displayResolvedRound.value || !myTeam.value) return null;
  return displayResolvedRound.value.teamChoice[myTeam.value === "A" ? "B" : "A"];
});

const finishedWinnerMembers = computed(() => activeFinishedState.value?.winners || []);

const finishedPayoutRows = computed(() => {
  const payouts = activeFinishedState.value?.payouts || [];
  const winners = finishedWinnerMembers.value;
  return payouts.map((payout) => ({
    ...payout,
    displayName: winners.find((winner) => winner.userId === payout.userId)?.displayName || payout.userId,
  }));
});

const canSubmitVote = computed(() =>
  Boolean(myTeam.value) && !myVote.value && !showRoundResultPhase.value && !activeFinishedState.value,
);

const stageTeams = computed(() => {
  const state = activeTeamRpsState.value;
  const room = activeStageRoom.value;
  if (!room) return { alpha: [] as StageMember[], beta: [] as StageMember[] };

  const seats = Math.max(2, Math.floor(room.maxPlayers / 2));
  const actualPlayersA = (state?.teams.A || []).map((player) => ({
    id: player.userId,
    displayName: player.displayName,
    avatarIndex: player.avatarIndex || 0,
  }));
  const actualPlayersB = (state?.teams.B || []).map((player) => ({
    id: player.userId,
    displayName: player.displayName,
    avatarIndex: player.avatarIndex || 0,
  }));
  const fallback = [
    { id: "stage-bot-1", displayName: "Waiting Slot", avatarIndex: 8 },
    { id: "stage-bot-2", displayName: "Open Seat", avatarIndex: 9 },
    { id: "stage-bot-3", displayName: "Queue Slot", avatarIndex: 10 },
    { id: "stage-bot-4", displayName: "Open Seat", avatarIndex: 11 },
    { id: "stage-bot-5", displayName: "Waiting Slot", avatarIndex: 12 },
    { id: "stage-bot-6", displayName: "Queue Slot", avatarIndex: 13 },
    { id: "stage-bot-7", displayName: "Open Seat", avatarIndex: 14 },
    { id: "stage-bot-8", displayName: "Waiting Slot", avatarIndex: 15 },
  ];

  const alpha = [...actualPlayersA, ...fallback].slice(0, seats).map((player, index) => ({
    ...player,
    label: index === 0 ? "Captain" : `Slot ${index + 1}`,
  }));

  const beta = [...actualPlayersB, ...fallback].slice(0, seats).map((player, index) => ({
    ...player,
    label: index === 0 ? "Captain" : `Slot ${index + 1}`,
  }));

  return { alpha, beta };
});

const resetForm = () => {
  roomName.value = "";
  entryStake.value = 20;
  selectedMode.value = "team_rps_vote";
};

const openCreateModal = () => {
  resetForm();
  showCreateModal.value = true;
};

const loadRooms = async () => {
  loadingRooms.value = true;
  try {
    if (!gameModeMeta[selectedMode.value].live) {
      rooms.value = [];
      return;
    }
    await refreshRooms(selectedMode.value);
  } catch (error) {
    pushError(error instanceof Error ? error.message : "Unable to load rooms.");
  } finally {
    loadingRooms.value = false;
  }
};

onMounted(async () => {
  clockTimer.value = setInterval(() => {
    nowTs.value = Math.floor(Date.now() / 1000);
  }, 1000);
  await loadRooms();

  if (!currentUser.value) return;

  try {
    if (gameModeMeta[selectedMode.value].live) {
      await subscribeLobby(selectedMode.value);
    }
  } catch (error) {
    pushError(error instanceof Error ? error.message : "Realtime lobby unavailable.");
  }
});

onBeforeUnmount(() => {
  if (clockTimer.value) clearInterval(clockTimer.value);
  if (roundResultTimer.value) clearTimeout(roundResultTimer.value);
});

watch(
  () => currentUser.value?.id,
  async (next, previous) => {
    if (!next || next === previous) return;
    try {
      if (gameModeMeta[selectedMode.value].live) {
        await subscribeLobby(selectedMode.value);
      }
    } catch (error) {
      pushError(error instanceof Error ? error.message : "Realtime lobby unavailable.");
    }
  },
);

watch(
  selectedMode,
  async (mode) => {
    await loadRooms();
    if (!currentUser.value || !gameModeMeta[mode].live) return;
    try {
      await subscribeLobby(mode);
    } catch (error) {
      pushError(error instanceof Error ? error.message : "Realtime lobby unavailable.");
    }
  },
);

const submitCreateRoom = async () => {
  const trimmedRoomName = roomName.value.trim();
  if (!trimmedRoomName) return;
  if (!currentUser.value) {
    pushError("Please login before creating a room.");
    return;
  }
  if (!gameModeMeta[selectedMode.value].live) {
    pushError("This mode is not connected yet.");
    return;
  }

  isCreatingRoom.value = true;
  try {
    const room = await createRoom({
      name: trimmedRoomName,
      mode: selectedMode.value,
      entryStake: Math.max(2, Math.trunc(Number(entryStake.value) || 2)),
    });

    pushSuccess("Room created.");
    showCreateModal.value = false;
    resetForm();
    await loadRooms();

    if (room?.id) {
      activeStageRoom.value = room;
      showStageModal.value = true;
      await fetchRoom(room.id, room.mode);
    }
  } catch (error) {
    pushError(error instanceof Error ? error.message : "Unable to create room.");
  } finally {
    isCreatingRoom.value = false;
  }
};

const openStage = async (room: MultiplayerRoomListItem) => {
  clearRoomRealtimeState(room.id);
  lingeringResolvedRound.value = null;
  activeStageRoom.value = room;
  showStageModal.value = true;
  isOpeningStage.value = true;

  try {
    await fetchRoom(room.id, room.mode);
  } catch (error) {
    pushError(error instanceof Error ? error.message : "Unable to load room snapshot.");
  } finally {
    isOpeningStage.value = false;
  }
};

const closeStage = () => {
  lingeringResolvedRound.value = null;
  showStageModal.value = false;
  activeStageRoom.value = null;
};

const closeVoteModal = () => {
  lingeringResolvedRound.value = null;
  showVoteModal.value = false;
  activeStageRoom.value = null;
};

const joinRoom = async () => {
  if (!activeStageRoom.value) return;
  if (!currentUser.value) {
    pushError("Please login before joining a room.");
    return;
  }

  const room = activeStageRoom.value;
  isJoiningRoom.value = true;

  try {
    clearRoomRealtimeState(room.id);
    await joinRealtimeRoom(room.id);
    await fetchRoom(room.id, room.mode);
    joinedRoomIds.value = Array.from(new Set([...joinedRoomIds.value, room.id]));
    pushSuccess("Joined room.");
  } catch (error) {
    pushError(error instanceof Error ? error.message : "Unable to join room.");
  } finally {
    isJoiningRoom.value = false;
  }
};

const chooseMyTeam = async (team: "A" | "B") => {
  if (!activeStageRoom.value) return;
  isSelectingTeam.value = true;
  try {
    await chooseTeam(activeStageRoom.value.id, team);
  } catch (error) {
    pushError(error instanceof Error ? error.message : "Unable to choose team.");
  } finally {
    isSelectingTeam.value = false;
  }
};

const startCurrentGame = async () => {
  if (!activeStageRoom.value) return;
  isStartingGame.value = true;
  try {
    await startRoom(activeStageRoom.value.id);
  } catch (error) {
    pushError(error instanceof Error ? error.message : "Unable to start game.");
  } finally {
    isStartingGame.value = false;
  }
};

const submitVote = async (choice: VoteChoice) => {
  if (!activeStageRoom.value || !activeTeamRpsState.value?.round) return;
  isSubmittingVote.value = true;
  try {
    await submitTeamRpsVote(activeStageRoom.value.id, activeTeamRpsState.value.round, choice);
    if (currentRoomKey.value) {
      voteSelections.value = {
        ...voteSelections.value,
        [currentRoomKey.value]: choice,
      };
    }
  } catch (error) {
    pushError(error instanceof Error ? error.message : "Unable to submit vote.");
  } finally {
    isSubmittingVote.value = false;
  }
};

watch(
  () => activeTeamRpsState.value?.status,
  (status) => {
    if (status === "playing") {
      showStageModal.value = false;
      showVoteModal.value = true;
      return;
    }

    if (status === "waiting" && activeStageRoom.value) {
      showVoteModal.value = false;
    }
  },
);

watch(
  activeResolvedRound,
  (resolved) => {
    if (!resolved) return;
    lingeringResolvedRound.value = resolved;
    if (roundResultTimer.value) clearTimeout(roundResultTimer.value);
    roundResultTimer.value = setTimeout(() => {
      lingeringResolvedRound.value = null;
      roundResultTimer.value = null;
    }, 2200);
  },
);
</script>

<template>
  <section class="team-lobby-page">
    <NuxtLink class="page-back-link" to="/play">← Back to play</NuxtLink>

    <header class="team-lobby-hero">
      <div class="team-lobby-hero__copy">
        <p class="team-lobby-hero__eyebrow">Team Lobby</p>
        <h1 class="team-lobby-hero__title">Pick a mode and join a room.</h1>
        <p class="team-lobby-hero__text">
          Team RPS is live now. More team modes can be added here later.
        </p>
      </div>

      <div class="team-lobby-hero__panel">
        <p class="team-lobby-hero__panel-label">Live rooms</p>
        <strong class="team-lobby-hero__panel-value">{{ sortedRooms.length }}</strong>
        <button class="btn team-lobby-hero__button" type="button" @click="openCreateModal">
          Create room
        </button>
      </div>
    </header>

    <section class="team-mode-strip">
      <button
        v-for="mode in featuredModes"
        :key="mode.value"
        type="button"
        class="team-mode-tab"
        :class="{ 'is-active': selectedMode === mode.value, 'is-soon': !mode.live }"
        @click="selectedMode = mode.value"
      >
        <span class="team-mode-tab__name">{{ mode.label }}</span>
        <span class="team-mode-tab__meta">{{ mode.live ? mode.count : "Soon" }}</span>
      </button>
    </section>

    <section v-if="isLiveMode" class="team-room-grid">
      <article v-for="room in sortedRooms" :key="room.id" class="team-room-card">
        <div class="team-room-card__top">
          <div>
            <p class="team-room-card__mode">{{ gameModeMeta[room.mode].label }}</p>
            <h2 class="team-room-card__name">{{ room.name }}</h2>
          </div>
          <span class="team-room-card__stake">
            {{ room.stake }} <img src="/images/m-coin.svg" alt="coin" class="coin-unit coin-unit--sm" />
          </span>
        </div>

        <div class="team-room-card__meta">
          <p><span class="muted">Host:</span> <strong>{{ room.hostDisplayName || room.hostUserId }}</strong></p>
          <p><span class="muted">Players:</span> <strong>{{ room.players }}/{{ room.maxPlayers }}</strong></p>
          <p><span class="muted">Created:</span> <strong>{{ formatTime(room.createdAt) }}</strong></p>
        </div>

        <p class="team-room-card__hint">{{ gameModeMeta[room.mode].description }}</p>

        <button class="btn team-room-card__join" type="button" @click="openStage(room)">
          Join room
        </button>
      </article>
    </section>
    <p v-if="isLiveMode && !sortedRooms.length" class="muted">
      {{ loadingRooms ? "Loading rooms..." : "No waiting rooms from the API yet." }}
    </p>
    <section v-else class="team-mode-empty card">
      <p class="team-mode-empty__eyebrow">Coming Soon</p>
      <h2 class="team-mode-empty__title">{{ activeModeMeta.label }}</h2>
      <p class="team-mode-empty__text">{{ activeModeMeta.description }}</p>
    </section>

    <div v-if="showCreateModal" class="modal" @click.self="showCreateModal = false">
      <div class="modal__panel team-lobby-modal">
        <h3>Create team room</h3>

        <form class="form" @submit.prevent="submitCreateRoom">
          <div class="field">
            <label for="team-room-name">Room name</label>
            <input
              id="team-room-name"
              v-model="roomName"
              class="input"
              maxlength="48"
              placeholder="Friday chaos squad"
              required
            />
          </div>

          <div class="field">
            <label for="team-mode">Game mode</label>
            <select id="team-mode" v-model="selectedMode" class="input">
              <option value="team_rps_vote">Team RPS</option>
              <option value="majority_die">Majority Die</option>
              <option value="highest_win">Highest Win</option>
            </select>
          </div>

          <div class="team-lobby-modal__grid">
            <div class="field">
              <label for="team-stake">Entry stake</label>
              <input id="team-stake" v-model.number="entryStake" class="input" type="number" min="2" />
            </div>
          </div>

          <button class="btn btn--primary" type="submit" :disabled="isCreatingRoom">
            {{ isCreatingRoom ? "Creating..." : "Create and open lobby" }}
          </button>
        </form>
      </div>
    </div>

    <div v-if="showStageModal && activeStageRoom" class="modal" @click.self="closeStage">
      <div class="modal__panel team-stage-modal">
        <header class="team-stage-modal__head">
          <div>
            <p class="team-stage-modal__eyebrow">{{ gameModeMeta[activeStageRoom.mode].label }}</p>
            <h3 class="team-stage-modal__title">{{ activeStageRoom.name }}</h3>
            <p class="team-stage-modal__subtitle">Pick a side and get ready.</p>
          </div>
          <button class="btn" type="button" @click="closeStage">Close</button>
        </header>

        <section class="team-stage-modal__hud">
          <article class="team-stage-stat">
            <span>Host</span>
            <strong>{{ activeStageRoom.hostDisplayName || activeStageRoom.hostUserId }}</strong>
          </article>
          <article class="team-stage-stat">
            <span>Stake</span>
            <strong>{{ activeStageRoom.stake }} <img src="/images/m-coin.svg" alt="coin" class="coin-unit coin-unit--sm" /></strong>
          </article>
          <article class="team-stage-stat">
            <span>Lobby</span>
            <strong>{{ totalAssignedPlayers }}/{{ activeStageRoom.maxPlayers }}</strong>
          </article>
          <article class="team-stage-stat">
            <span>Status</span>
            <strong>{{ activeTeamRpsState?.status || activeStageRoom.status }}</strong>
          </article>
        </section>

        <section class="team-stage-prompt">
          <p v-if="!joinedRoomIds.includes(activeStageRoom.id)" class="team-stage-prompt__text">
            Join this room first to pick a team.
          </p>
          <p v-else-if="myTeam" class="team-stage-prompt__text">
            Team {{ myTeam }} selected. {{ isHost ? "Start when both sides are balanced." : "Wait for host start." }}
          </p>
          <p v-else class="team-stage-prompt__text">
            Pick Team A or Team B.
          </p>
          <p class="team-stage-prompt__meta">
            Team A: {{ activeTeamRpsState?.teamCounts.A || 0 }} players · Team B: {{ activeTeamRpsState?.teamCounts.B || 0 }} players
          </p>
        </section>

        <section class="team-stage-board">
          <article
            class="team-stage-side team-stage-side--alpha"
            :class="{ 'is-current-team': myTeam === 'A' }"
          >
            <div class="team-stage-side__top">
              <p class="team-stage-side__label">Team A</p>
              <strong class="team-stage-side__name">Solar Side</strong>
            </div>
            <button
              v-if="joinedRoomIds.includes(activeStageRoom.id)"
              class="btn team-stage-side__choose"
              :class="{ 'is-picked': myTeam === 'A' }"
              type="button"
              :disabled="isSelectingTeam || activeTeamRpsState?.status === 'playing'"
              @click="chooseMyTeam('A')"
            >
              {{ myTeam === "A" ? "Selected team" : "Choose Team A" }}
            </button>
            <div class="team-stage-roster">
              <article
                v-for="member in stageTeams.alpha"
                :key="member.id"
                class="team-stage-player"
                :class="{ 'is-me': member.id === currentUser?.id }"
              >
                <img :src="avatarPath(member.avatarIndex)" :alt="member.displayName" class="team-stage-player__avatar" />
                <div>
                  <strong>{{ member.displayName }}</strong>
                  <small>{{ member.label }}</small>
                </div>
              </article>
            </div>
          </article>

          <div class="team-stage-versus">
            <b>VS</b>
            <small>{{ totalAssignedPlayers }} joined</small>
          </div>

          <article
            class="team-stage-side team-stage-side--beta"
            :class="{ 'is-current-team': myTeam === 'B' }"
          >
            <div class="team-stage-side__top">
              <p class="team-stage-side__label">Team B</p>
              <strong class="team-stage-side__name">Night Side</strong>
            </div>
            <button
              v-if="joinedRoomIds.includes(activeStageRoom.id)"
              class="btn team-stage-side__choose"
              :class="{ 'is-picked': myTeam === 'B' }"
              type="button"
              :disabled="isSelectingTeam || activeTeamRpsState?.status === 'playing'"
              @click="chooseMyTeam('B')"
            >
              {{ myTeam === "B" ? "Selected team" : "Choose Team B" }}
            </button>
            <div class="team-stage-roster">
              <article
                v-for="member in stageTeams.beta"
                :key="member.id"
                class="team-stage-player"
                :class="{ 'is-me': member.id === currentUser?.id }"
              >
                <img :src="avatarPath(member.avatarIndex)" :alt="member.displayName" class="team-stage-player__avatar" />
                <div>
                  <strong>{{ member.displayName }}</strong>
                  <small>{{ member.label }}</small>
                </div>
              </article>
            </div>
          </article>
        </section>

        <footer class="team-stage-modal__actions">
          <button class="btn" type="button" @click="closeStage">Back to rooms</button>
          <button
            v-if="!joinedRoomIds.includes(activeStageRoom.id)"
            class="btn btn--primary team-stage-modal__launch"
            type="button"
            :disabled="isJoiningRoom || isOpeningStage"
            @click="joinRoom"
          >
            {{ isJoiningRoom ? "Joining..." : "Join room" }}
          </button>
          <button
            v-else-if="isHost"
            class="btn btn--primary team-stage-modal__launch"
            type="button"
            :disabled="isStartingGame || !canStartGame"
            @click="startCurrentGame"
          >
            {{ isStartingGame ? "Starting..." : "Start game" }}
          </button>
          <p v-else class="team-stage-modal__wait">
            Waiting for host to start.
          </p>
        </footer>
        <p v-if="isOpeningStage" class="muted">Loading live room snapshot...</p>
      </div>
    </div>

    <div v-if="showVoteModal && activeStageRoom && activeTeamRpsState" class="modal" @click.self>
      <div class="modal__panel team-vote-modal" :class="voteModalToneClass">
        <header class="team-vote-modal__head">
          <div>
            <p class="team-stage-modal__eyebrow">Round {{ activeTeamRpsState.round || 1 }}</p>
            <h3 class="team-stage-modal__title">{{ activeStageRoom.name }}</h3>
            <p class="team-stage-modal__subtitle">Choose before the timer ends.</p>
          </div>
          <div class="team-vote-modal__timer">
            <span>Timer</span>
            <strong>{{ countdownSeconds }}s</strong>
          </div>
        </header>

        <section class="team-vote-modal__score">
          <article class="team-stage-stat" :class="{ 'is-current-team': myTeam === 'A' }">
            <span>{{ myTeam === "A" ? "Your team" : "Team A" }}</span>
            <strong>{{ activeTeamRpsState.score.A }}</strong>
          </article>
          <article class="team-stage-stat" :class="{ 'is-current-team': myTeam === 'B' }">
            <span>{{ myTeam === "B" ? "Your team" : "Team B" }}</span>
            <strong>{{ activeTeamRpsState.score.B }}</strong>
          </article>
          <article class="team-stage-stat">
            <span>Submitted</span>
            <strong>
              {{ activeSubmittedCount?.submittedA || 0 }}/{{ activeSubmittedCount?.totalA || activeTeamRpsState.teamCounts.A }}
              ·
              {{ activeSubmittedCount?.submittedB || 0 }}/{{ activeSubmittedCount?.totalB || activeTeamRpsState.teamCounts.B }}
            </strong>
          </article>
        </section>

        <section v-if="!showRoundResultPhase && !activeFinishedState" class="team-vote-modal__choices">
          <button
            v-for="option in voteOptions"
            :key="option.value"
            type="button"
            class="team-vote-card"
            :class="{ 'is-picked': myVote === option.value }"
            :disabled="isSubmittingVote || !canSubmitVote"
            @click="submitVote(option.value)"
          >
            <img :src="option.image" :alt="option.label" class="team-vote-card__image" />
            <strong>{{ option.label }}</strong>
          </button>
        </section>

        <p v-if="!showRoundResultPhase && !activeFinishedState" class="team-vote-modal__status">
          <span v-if="myVote">Your decision: <strong>{{ myVote }}</strong></span>
          <span v-else-if="myTeam">You are on Team {{ myTeam }}. Make your decision before time runs out.</span>
          <span v-else>Pick a team in the waiting room first.</span>
        </p>

        <section
          v-if="showRoundResultPhase && displayResolvedRound"
          class="team-vote-result team-vote-result--round"
          :class="roundResultToneClass"
        >
          <strong class="team-vote-result__winner">{{ myRoundOutcome || "Round complete" }}</strong>
          <div v-if="myRoundChoice && opponentRoundChoice" class="team-vote-result__choices">
            <article class="team-vote-result__choice">
              <img
                :src="voteOptions.find((option) => option.value === myRoundChoice)?.image"
                :alt="myRoundChoice"
                class="team-vote-result__choice-image"
              />
              <span>Your: {{ voteOptions.find((option) => option.value === myRoundChoice)?.label }}</span>
            </article>
            <span class="team-vote-result__vs">vs</span>
            <article class="team-vote-result__choice">
              <img
                :src="voteOptions.find((option) => option.value === opponentRoundChoice)?.image"
                :alt="opponentRoundChoice"
                class="team-vote-result__choice-image"
              />
              <span>Opponent: {{ voteOptions.find((option) => option.value === opponentRoundChoice)?.label }}</span>
            </article>
          </div>
          <p class="team-vote-result__next">Next round is loading...</p>
        </section>

        <section v-if="activeFinishedState" class="team-vote-result team-vote-result--final">
          <p class="team-vote-result__label">Match finished</p>
          <strong class="team-vote-result__winner">
            {{ activeFinishedState.draw ? "Match draw" : `Team ${activeFinishedState.winnerTeam} win the match` }}
          </strong>
          <p v-if="activeFinishedState.score" class="team-vote-result__scoreline">
            Final score: {{ activeFinishedState.score.A }} - {{ activeFinishedState.score.B }}
          </p>
          <div v-if="finishedWinnerMembers.length" class="team-vote-finished__group">
            <p class="team-vote-result__label">Winners</p>
            <div class="team-vote-finished__members">
              <span v-for="winner in finishedWinnerMembers" :key="winner.userId" class="team-vote-finished__pill">
                {{ winner.displayName }}
              </span>
            </div>
          </div>
          <div v-if="finishedPayoutRows.length" class="team-vote-finished__group">
            <p class="team-vote-result__label">Payouts</p>
            <div class="team-vote-finished__payouts">
              <div v-for="row in finishedPayoutRows" :key="`${row.userId}-${row.amount}`" class="team-vote-finished__payout-row">
                <span>{{ row.displayName }}</span>
                <strong>+{{ row.amount }}</strong>
              </div>
            </div>
          </div>
        </section>

        <footer v-if="activeFinishedState" class="team-vote-modal__actions">
          <button class="btn" type="button" @click="closeVoteModal">Close</button>
        </footer>
      </div>
    </div>
  </section>
</template>

<style scoped>
.team-lobby-page {
  display: grid;
  gap: 0.9rem;
}

.page-back-link {
  display: inline-flex;
  width: fit-content;
  align-items: center;
  gap: 0.35rem;
  color: #9fc3ef;
  text-decoration: none;
  font-weight: 700;
}

.page-back-link:hover {
  color: #dcecff;
}

.team-lobby-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(280px, 0.75fr);
  gap: 1rem;
  padding: 1rem;
  border: 1px solid rgba(141, 197, 255, 0.14);
  border-radius: 24px;
  background:
    radial-gradient(circle at top left, rgba(255, 180, 85, 0.22), transparent 26%),
    radial-gradient(circle at right center, rgba(77, 190, 255, 0.18), transparent 24%),
    linear-gradient(180deg, rgba(19, 23, 47, 0.96), rgba(9, 18, 37, 0.98));
}

.team-lobby-hero__eyebrow,
.team-mode-empty__eyebrow {
  color: #95b9e7;
  font-size: 0.76rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.team-lobby-hero__title {
  margin-top: 0.25rem;
  font-family: Georgia, "Times New Roman", serif;
  font-size: clamp(1.5rem, 3vw, 2.5rem);
  line-height: 1.02;
}

.team-lobby-hero__text,
.team-room-card__hint {
  margin-top: 0.45rem;
  color: #b9d7f8;
}

.team-lobby-hero__panel,
.team-room-card {
  border: 1px solid rgba(141, 197, 255, 0.16);
  border-radius: 24px;
  background: rgba(10, 23, 46, 0.8);
}

.team-lobby-hero__panel {
  display: grid;
  align-content: center;
  justify-items: start;
  gap: 0.45rem;
  padding: 1rem;
}

.team-lobby-hero__panel-label {
  color: #9fc3ef;
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.team-lobby-hero__panel-value {
  font-size: clamp(2.2rem, 5vw, 3.2rem);
  line-height: 0.9;
}

.team-lobby-hero__button {
  min-width: 180px;
}

.team-mode-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.45rem;
  padding: 0.35rem;
  border-radius: 18px;
  border: 1px solid rgba(141, 197, 255, 0.12);
  background: rgba(10, 23, 46, 0.68);
}

.team-mode-tab {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  min-width: 0;
  padding: 0.7rem 0.8rem;
  width: 100%;
  border: 1px solid transparent;
  border-radius: 14px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  transition: border-color 160ms ease, background 160ms ease, color 160ms ease;
}

.team-mode-tab.is-active {
  border-color: rgba(255, 209, 117, 0.44);
  background: linear-gradient(180deg, rgba(255, 209, 117, 0.16), rgba(255, 209, 117, 0.06));
}

.team-mode-tab.is-soon {
  opacity: 0.84;
}

.team-mode-tab__name,
.team-mode-tab__meta {
  min-width: 0;
  white-space: nowrap;
}

.team-mode-tab__name {
  font-size: 0.94rem;
  font-weight: 700;
}

.team-mode-tab__meta {
  color: #9fc3ef;
  font-size: 0.76rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.team-room-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1rem;
}

.team-mode-empty {
  padding: 1.35rem;
  border-radius: 28px;
  border: 1px solid rgba(141, 197, 255, 0.16);
  background: rgba(10, 23, 46, 0.8);
}

.team-mode-empty__title {
  margin-top: 0.35rem;
  font-family: Georgia, "Times New Roman", serif;
  font-size: 1.45rem;
}

.team-mode-empty__text {
  margin-top: 0.6rem;
  color: #b9d7f8;
  max-width: 58ch;
}

.team-room-card {
  display: grid;
  gap: 1rem;
  padding: 1rem;
}

.team-room-card__top,
.team-room-card__meta {
  display: grid;
  gap: 0.55rem;
}

.team-room-card__top {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
}

.team-room-card__mode {
  color: #ffd27a;
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.team-room-card__name {
  margin-top: 0.3rem;
  font-size: 1.15rem;
}

.team-room-card__stake {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  padding: 0.4rem 0.7rem;
  border-radius: 999px;
  background: rgba(255, 210, 122, 0.12);
  color: #ffe09c;
  font-weight: 800;
}

.team-room-card__join {
  width: 100%;
}

.team-lobby-modal__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.9rem;
}

.team-stage-modal {
  width: min(960px, calc(100vw - 1rem));
  max-height: min(88vh, 920px);
  overflow: auto;
  padding: 0.9rem;
  border-radius: 18px;
  border: 1px solid rgba(141, 197, 255, 0.14);
  background: linear-gradient(180deg, rgba(10, 18, 35, 0.98), rgba(8, 14, 28, 0.98));
}

.team-stage-modal__head,
.team-stage-modal__hud,
.team-stage-modal__actions {
  display: flex;
  gap: 1rem;
  justify-content: space-between;
  align-items: center;
}

.team-stage-modal__head {
  align-items: flex-start;
}

.team-stage-modal__eyebrow,
.team-stage-side__label {
  color: #9bc5f3;
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.team-stage-modal__title {
  margin-top: 0.2rem;
  font-size: clamp(1.1rem, 2.2vw, 1.65rem);
}

.team-stage-modal__subtitle {
  margin-top: 0.2rem;
  color: #a9c5e7;
  font-size: 0.95rem;
}

.team-stage-modal__hud {
  flex-wrap: wrap;
  margin-top: 0.75rem;
}

.team-stage-prompt {
  margin-top: 0.75rem;
  padding: 0.65rem 0;
  border-top: 1px solid rgba(141, 197, 255, 0.12);
  border-bottom: 1px solid rgba(141, 197, 255, 0.12);
}

.team-stage-prompt__text {
  font-weight: 700;
  font-size: 0.95rem;
}

.team-stage-prompt__meta {
  margin-top: 0.35rem;
  color: #9ec4ee;
}

.team-stage-stat {
  min-width: 112px;
  padding: 0.65rem 0.75rem;
  border: 1px solid rgba(141, 197, 255, 0.12);
  border-radius: 14px;
  background: rgba(13, 26, 51, 0.42);
  display: grid;
  gap: 0.2rem;
}

.team-stage-stat.is-current-team {
  border-color: rgba(255, 212, 122, 0.45);
  background: linear-gradient(180deg, rgba(255, 212, 122, 0.18), rgba(255, 212, 122, 0.08));
  box-shadow: 0 0 0 1px rgba(255, 212, 122, 0.12);
}

.team-stage-stat span,
.team-stage-player small,
.team-stage-versus small {
  color: #9ec4ee;
}

.team-stage-board {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 84px minmax(0, 1fr);
  gap: 0.7rem;
  align-items: center;
  margin-top: 0.75rem;
}

.team-stage-side {
  min-height: 0;
  padding: 0.75rem;
  border-radius: 16px;
  border: 1px solid rgba(141, 197, 255, 0.12);
  display: grid;
  align-content: start;
  gap: 0.75rem;
  transition: border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease, background 180ms ease;
}

.team-stage-side--alpha {
  background: rgba(37, 22, 15, 0.5);
}

.team-stage-side--beta {
  background: rgba(15, 23, 47, 0.5);
}

.team-stage-side.is-current-team {
  border-color: rgba(255, 212, 122, 0.5);
  box-shadow: 0 0 0 1px rgba(255, 212, 122, 0.18), 0 18px 40px rgba(8, 12, 24, 0.32);
  transform: translateY(-2px);
}

.team-stage-side--alpha.is-current-team {
  background: linear-gradient(180deg, rgba(88, 50, 22, 0.78), rgba(48, 27, 14, 0.82));
}

.team-stage-side--beta.is-current-team {
  background: linear-gradient(180deg, rgba(20, 49, 100, 0.78), rgba(10, 25, 58, 0.84));
}

.team-stage-side__name {
  font-size: 1rem;
}

.team-stage-side__choose {
  width: 100%;
}

.team-stage-side__choose.is-picked {
  border-color: rgba(255, 212, 122, 0.4);
  background: linear-gradient(135deg, #ffd17c, #f0a14a);
  color: #261003;
}

.team-stage-roster {
  display: grid;
  gap: 0.55rem;
}

.team-stage-player {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.65rem;
  align-items: center;
  padding: 0.55rem;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
}

.team-stage-player.is-me {
  border-color: rgba(255, 212, 122, 0.32);
  background: rgba(255, 212, 122, 0.1);
}

.team-stage-player__avatar {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  object-fit: cover;
}

.team-stage-versus {
  display: grid;
  place-items: center;
  gap: 0.35rem;
  text-align: center;
}

.team-stage-versus b {
  font-size: 1.1rem;
  letter-spacing: 0.12em;
}

.team-stage-modal__actions {
  margin-top: 0.9rem;
}

.team-stage-modal__launch {
  min-width: 200px;
}

.team-stage-modal__wait {
  color: #9ec4ee;
  max-width: 26ch;
  text-align: right;
}

.team-vote-modal {
  width: min(820px, calc(100vw - 1rem));
  max-height: min(84vh, 900px);
  overflow: auto;
  padding: 0.9rem;
  border-radius: 18px;
  border: 1px solid rgba(141, 197, 255, 0.14);
  background: linear-gradient(180deg, rgba(10, 18, 35, 0.98), rgba(8, 14, 28, 0.98));
}

.team-vote-modal.is-stage-1 {
  background: linear-gradient(180deg, rgba(10, 24, 52, 0.98), rgba(7, 14, 32, 0.98));
}

.team-vote-modal.is-stage-2 {
  background: linear-gradient(180deg, rgba(11, 43, 33, 0.98), rgba(7, 21, 17, 0.98));
}

.team-vote-modal.is-stage-3 {
  background: linear-gradient(180deg, rgba(58, 19, 19, 0.98), rgba(27, 10, 10, 0.98));
}

.team-vote-modal__head,
.team-vote-modal__score {
  display: flex;
  gap: 0.75rem;
  justify-content: space-between;
  align-items: flex-start;
}

.team-vote-modal__timer {
  min-width: 96px;
  padding: 0.6rem 0.75rem;
  border-radius: 14px;
  border: 1px solid rgba(141, 197, 255, 0.12);
  background: rgba(13, 26, 51, 0.42);
  text-align: center;
}

.team-vote-modal__timer span {
  display: block;
  color: #9ec4ee;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.team-vote-modal__timer strong {
  display: block;
  margin-top: 0.15rem;
  font-size: 1.3rem;
}

.team-vote-modal__score {
  margin-top: 1rem;
  flex-wrap: wrap;
}

.team-vote-modal__choices {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.6rem;
  margin-top: 0.75rem;
}

.team-vote-card {
  display: grid;
  gap: 0.45rem;
  justify-items: center;
  padding: 0.65rem;
  border-radius: 14px;
  border: 1px solid rgba(141, 197, 255, 0.12);
  background: rgba(13, 26, 51, 0.42);
  color: inherit;
  cursor: pointer;
}

.team-vote-card.is-picked {
  border-color: rgba(255, 209, 117, 0.42);
  background: rgba(255, 209, 117, 0.08);
}

.team-vote-card__image {
  width: min(92px, 100%);
  aspect-ratio: 1 / 1;
  object-fit: contain;
}

.team-vote-modal__status {
  margin-top: 0.85rem;
  color: #d2e5fb;
  font-weight: 700;
}

.team-vote-result {
  margin-top: 0.85rem;
  padding: 0.85rem;
  border-radius: 14px;
  border: 1px solid rgba(141, 197, 255, 0.12);
  background: rgba(13, 26, 51, 0.42);
}

.team-vote-result--round {
  text-align: center;
  padding-block: 1.15rem;
}

.team-vote-result--round.is-win {
  border-color: rgba(87, 214, 148, 0.4);
  background: linear-gradient(180deg, rgba(22, 108, 64, 0.95), rgba(15, 74, 45, 0.96));
  color: #ffffff;
}

.team-vote-result--round.is-lose {
  border-color: rgba(255, 122, 122, 0.4);
  background: linear-gradient(180deg, rgba(141, 35, 35, 0.95), rgba(102, 23, 23, 0.96));
  color: #ffffff;
}

.team-vote-result--round.is-draw {
  border-color: rgba(255, 212, 92, 0.45);
  background: linear-gradient(180deg, rgba(184, 133, 12, 0.95), rgba(133, 94, 7, 0.96));
  color: #ffffff;
}

.team-vote-result__label {
  color: #9ec4ee;
  font-size: 0.78rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.team-vote-result--round.is-win .team-vote-result__label,
.team-vote-result--round.is-lose .team-vote-result__label,
.team-vote-result--round.is-draw .team-vote-result__label,
.team-vote-result--round.is-win .team-vote-result__choice,
.team-vote-result--round.is-lose .team-vote-result__choice,
.team-vote-result--round.is-draw .team-vote-result__choice,
.team-vote-result--round.is-win .team-vote-result__vs,
.team-vote-result--round.is-lose .team-vote-result__vs,
.team-vote-result--round.is-draw .team-vote-result__vs,
.team-vote-result--round.is-win .team-vote-result__next,
.team-vote-result--round.is-lose .team-vote-result__next,
.team-vote-result--round.is-draw .team-vote-result__next {
  color: rgba(255, 255, 255, 0.9);
}

.team-vote-result__winner {
  display: block;
  margin-top: 0.1rem;
  font-size: 1.1rem;
}

.team-vote-result__choices {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.65rem;
  flex-wrap: wrap;
}

.team-vote-result__choice {
  display: grid;
  justify-items: center;
  gap: 0.3rem;
  color: #d2e5fb;
  font-weight: 700;
}

.team-vote-result__choice-image {
  width: 64px;
  height: 64px;
  object-fit: contain;
}

.team-vote-result__vs {
  color: #9ec4ee;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.team-vote-result__next {
  margin-top: 0.55rem;
  color: #9ec4ee;
}

.team-vote-result--final {
  border-color: rgba(255, 209, 117, 0.32);
}

.team-vote-finished__group {
  margin-top: 0.75rem;
}

.team-vote-finished__members {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-top: 0.4rem;
}

.team-vote-finished__pill {
  display: inline-flex;
  align-items: center;
  min-height: 2rem;
  padding: 0.2rem 0.65rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  color: #dcecff;
  font-weight: 700;
}

.team-vote-finished__payouts {
  display: grid;
  gap: 0.35rem;
  margin-top: 0.4rem;
}

.team-vote-finished__payout-row {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.55rem 0.7rem;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
  color: #dcecff;
}

.team-vote-modal__actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 0.85rem;
}

@media (max-width: 900px) {
  .team-lobby-hero {
    grid-template-columns: 1fr;
  }

  .team-lobby-hero__panel {
    grid-template-columns: 1fr auto;
    align-items: center;
  }

  .team-stage-board {
    grid-template-columns: 1fr;
  }

  .team-stage-versus {
    grid-auto-flow: column;
    justify-content: center;
  }

  .team-stage-side {
    min-height: auto;
  }

  .team-vote-modal__choices {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .team-lobby-page {
    gap: 0.75rem;
  }

  .team-lobby-hero {
    padding: 0.85rem;
    border-radius: 18px;
  }

  .team-lobby-hero__title {
    font-size: 1.35rem;
  }

  .team-lobby-hero__text,
  .team-room-card__hint,
  .team-stage-prompt__text,
  .team-stage-prompt__meta,
  .team-stage-modal__subtitle,
  .team-vote-modal__status {
    font-size: 0.9rem;
  }

  .team-mode-strip,
  .team-room-card,
  .team-mode-empty {
    border-radius: 18px;
  }

  .team-mode-strip {
    grid-template-columns: 1fr;
    padding: 0.3rem;
  }

  .team-mode-tab {
    padding: 0.7rem 0.75rem;
  }

  .team-lobby-modal__grid,
  .team-room-card__top {
    grid-template-columns: 1fr;
  }

  .team-stage-modal__head,
  .team-stage-modal__actions,
  .team-vote-modal__head {
    display: grid;
  }

  .team-stage-modal,
  .team-vote-modal {
    width: calc(100vw - 0.5rem);
    padding: 0.75rem;
    border-radius: 16px;
  }

  .team-stage-modal__hud,
  .team-vote-modal__score {
    gap: 0.55rem;
  }

  .team-stage-stat {
    min-width: 0;
    border-radius: 12px;
  }

  .team-stage-side {
    padding: 0.65rem;
  }

  .team-stage-player {
    gap: 0.55rem;
  }

  .team-stage-player__avatar {
    width: 34px;
    height: 34px;
    border-radius: 10px;
  }

  .team-vote-card {
    grid-template-columns: auto 1fr;
    justify-items: start;
    align-items: center;
    text-align: left;
  }

  .team-stage-stat,
  .team-stage-modal__launch {
    width: 100%;
  }

  .team-stage-modal__wait,
  .team-vote-modal__timer {
    text-align: left;
  }
}
</style>
