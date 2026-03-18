<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { useMMarket, type Player } from "~/composables/useMMarket";

type RpsMove = "rock" | "paper" | "scissors";

interface Contestant {
  id: string;
  displayName: string;
  avatarIndex: number;
  source: "player" | "bot";
}

interface TeamState {
  id: string;
  name: string;
  accent: string;
  strategy: RpsMove;
  roster: Contestant[];
  score: number;
}

interface RoundDuel {
  id: string;
  left: Contestant;
  right: Contestant;
  leftMove: RpsMove;
  rightMove: RpsMove;
  winner: "left" | "right" | "draw";
}

interface RoundLogEntry {
  id: string;
  round: number;
  duels: RoundDuel[];
  leftWins: number;
  rightWins: number;
  winner: "left" | "right" | "draw";
  summary: string;
}

const { allPlayers, currentUser } = useMMarket();
const route = useRoute();

const targetTeamSize = 3;
const maxTeamSize = 4;
const winThreshold = 3;

const fallbackContestants: Contestant[] = [
  { id: "bot-a", displayName: "Tempo", avatarIndex: 0, source: "bot" },
  { id: "bot-b", displayName: "Pixel", avatarIndex: 1, source: "bot" },
  { id: "bot-c", displayName: "Orbit", avatarIndex: 2, source: "bot" },
  { id: "bot-d", displayName: "Jolt", avatarIndex: 3, source: "bot" },
  { id: "bot-e", displayName: "Nova", avatarIndex: 4, source: "bot" },
  { id: "bot-f", displayName: "Mica", avatarIndex: 5, source: "bot" },
  { id: "bot-g", displayName: "Blip", avatarIndex: 6, source: "bot" },
  { id: "bot-h", displayName: "Flash", avatarIndex: 7, source: "bot" },
];

const moveMeta: Array<{ value: RpsMove; label: string; glyph: string; hint: string }> = [
  { value: "rock", label: "Rock", glyph: "R", hint: "steady pressure" },
  { value: "paper", label: "Paper", glyph: "P", hint: "wide control" },
  { value: "scissors", label: "Scissors", glyph: "S", hint: "sharp counter" },
];

const contestants = computed<Contestant[]>(() => {
  const players = allPlayers.value.filter((player) => player.role === "player");
  if (!players.length) return fallbackContestants;

  const mapped = players.map((player: Player) => ({
    id: player.id,
    displayName: player.displayName,
    avatarIndex: player.avatarIndex || 0,
    source: "player" as const,
  }));

  if (!currentUser.value) return mapped;

  const prioritized = mapped.find((item) => item.id === currentUser.value?.id);
  if (!prioritized) return mapped;

  return [prioritized, ...mapped.filter((item) => item.id !== prioritized.id)];
});

const leftTeam = ref<TeamState>({
  id: "left",
  name: "Solar Drip",
  accent: "sun",
  strategy: "rock",
  roster: [],
  score: 0,
});

const rightTeam = ref<TeamState>({
  id: "right",
  name: "Night Current",
  accent: "night",
  strategy: "scissors",
  roster: [],
  score: 0,
});

const roundLog = ref<RoundLogEntry[]>([]);
const matchMessage = ref("Draft both crews and trigger the clash.");
const initializedRoster = ref(false);

const avatarPath = (index: number) => `/images/avatars/${index}.png`;

const rosterIds = (team: TeamState) => new Set(team.roster.map((player) => player.id));

const availableForTeam = (teamId: TeamState["id"]) => {
  const takenByLeft = rosterIds(leftTeam.value);
  const takenByRight = rosterIds(rightTeam.value);
  return contestants.value.filter((contestant) => {
    if (teamId === "left") return !takenByRight.has(contestant.id);
    return !takenByLeft.has(contestant.id);
  });
};

const benchPlayers = computed(() => {
  const used = new Set([
    ...leftTeam.value.roster.map((player) => player.id),
    ...rightTeam.value.roster.map((player) => player.id),
  ]);
  return contestants.value.filter((contestant) => !used.has(contestant.id));
});

const totalRoundsPlayed = computed(() => roundLog.value.length);
const activeRoomName = computed(() => String(route.query.roomName || "Open scrim room"));
const activeGameMode = computed(() => String(route.query.mode || "team-rps"));
const currentLeader = computed(() => {
  if (leftTeam.value.score === rightTeam.value.score) return "Dead even";
  return leftTeam.value.score > rightTeam.value.score ? leftTeam.value.name : rightTeam.value.name;
});

const matchWinner = computed(() => {
  if (leftTeam.value.score >= winThreshold) return leftTeam.value;
  if (rightTeam.value.score >= winThreshold) return rightTeam.value;
  return null;
});

const canPlayRound = computed(() => {
  if (matchWinner.value) return false;
  return leftTeam.value.roster.length > 0 && rightTeam.value.roster.length > 0;
});

const shuffle = <T,>(items: T[]) => {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const next = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[next]] = [copy[next], copy[index]];
  }
  return copy;
};

const makeBalancedDraft = () => {
  const pool = shuffle(contestants.value).slice(0, Math.min(contestants.value.length, maxTeamSize * 2));
  const half = Math.max(1, Math.min(targetTeamSize, Math.ceil(pool.length / 2)));
  leftTeam.value.roster = pool.slice(0, half);
  rightTeam.value.roster = pool.slice(half, half * 2);

  if (!rightTeam.value.roster.length && pool[half]) {
    rightTeam.value.roster = [pool[half]];
  }

  leftTeam.value.score = 0;
  rightTeam.value.score = 0;
  roundLog.value = [];
  matchMessage.value = "Fresh draft loaded. Pick a strategy and play the opening round.";
};

watch(
  contestants,
  (next) => {
    if (!next.length || initializedRoster.value) return;
    makeBalancedDraft();
    initializedRoster.value = true;
  },
  { immediate: true },
);

const assignToTeam = (teamId: TeamState["id"], contestant: Contestant) => {
  const team = teamId === "left" ? leftTeam.value : rightTeam.value;
  const otherTeam = teamId === "left" ? rightTeam.value : leftTeam.value;

  if (team.roster.some((member) => member.id === contestant.id)) return;
  if (team.roster.length >= maxTeamSize) return;

  otherTeam.roster = otherTeam.roster.filter((member) => member.id !== contestant.id);
  team.roster = [...team.roster, contestant];
};

const removeFromTeam = (teamId: TeamState["id"], contestantId: string) => {
  const team = teamId === "left" ? leftTeam.value : rightTeam.value;
  team.roster = team.roster.filter((member) => member.id !== contestantId);
};

const beats = (left: RpsMove, right: RpsMove) =>
  (left === "rock" && right === "scissors")
  || (left === "paper" && right === "rock")
  || (left === "scissors" && right === "paper");

const weightedMove = (strategy: RpsMove): RpsMove => {
  const roll = Math.random();
  if (roll < 0.6) return strategy;
  if (roll < 0.8) return strategy === "rock" ? "paper" : strategy === "paper" ? "scissors" : "rock";
  return strategy === "rock" ? "scissors" : strategy === "paper" ? "rock" : "paper";
};

const playRound = () => {
  if (!canPlayRound.value) return;

  const duelCount = Math.min(leftTeam.value.roster.length, rightTeam.value.roster.length);
  const duels: RoundDuel[] = [];
  let leftWins = 0;
  let rightWins = 0;

  for (let index = 0; index < duelCount; index += 1) {
    const left = leftTeam.value.roster[index];
    const right = rightTeam.value.roster[index];
    const leftMove = weightedMove(leftTeam.value.strategy);
    const rightMove = weightedMove(rightTeam.value.strategy);
    let winner: RoundDuel["winner"] = "draw";

    if (beats(leftMove, rightMove)) {
      winner = "left";
      leftWins += 1;
    } else if (beats(rightMove, leftMove)) {
      winner = "right";
      rightWins += 1;
    }

    duels.push({
      id: `${Date.now()}-${index}`,
      left,
      right,
      leftMove,
      rightMove,
      winner,
    });
  }

  const leftBonus = Math.max(0, leftTeam.value.roster.length - duelCount);
  const rightBonus = Math.max(0, rightTeam.value.roster.length - duelCount);
  leftWins += leftBonus;
  rightWins += rightBonus;

  let roundWinner: RoundLogEntry["winner"] = "draw";
  if (leftWins > rightWins) {
    leftTeam.value.score += 1;
    roundWinner = "left";
  } else if (rightWins > leftWins) {
    rightTeam.value.score += 1;
    roundWinner = "right";
  }

  const round = totalRoundsPlayed.value + 1;
  const summary =
    roundWinner === "draw"
      ? `Round ${round} stalls out at ${leftWins}-${rightWins}.`
      : roundWinner === "left"
        ? `Round ${round} goes to ${leftTeam.value.name} by ${leftWins}-${rightWins}.`
        : `Round ${round} goes to ${rightTeam.value.name} by ${rightWins}-${leftWins}.`;

  roundLog.value = [
    {
      id: `round-${round}-${Date.now()}`,
      round,
      duels,
      leftWins,
      rightWins,
      winner: roundWinner,
      summary,
    },
    ...roundLog.value,
  ];

  if (matchWinner.value) {
    matchMessage.value = `${matchWinner.value.name} take the match ${leftTeam.value.score}-${rightTeam.value.score}.`;
    return;
  }

  matchMessage.value = summary;
};

const resetMatch = () => {
  leftTeam.value.score = 0;
  rightTeam.value.score = 0;
  roundLog.value = [];
  matchMessage.value = "Scoreboard cleared. Same crews, new bragging rights.";
};

const autofillStrategies = () => {
  const options: RpsMove[] = ["rock", "paper", "scissors"];
  leftTeam.value.strategy = options[Math.floor(Math.random() * options.length)];
  rightTeam.value.strategy = options[Math.floor(Math.random() * options.length)];
};
</script>

<template>
  <div class="team-rps-page">
    <section class="team-rps-hero">
      <div class="team-rps-hero__copy">
        <p class="team-rps-hero__eyebrow">New Mode</p>
        <div class="team-rps-hero__chips">
          <span class="team-rps-chip">{{ activeGameMode }}</span>
          <span class="team-rps-chip">{{ activeRoomName }}</span>
        </div>
        <h1 class="team-rps-hero__title">Team RPS Clash</h1>
        <p class="team-rps-hero__text">
          A separate party mode for quick crew-versus-crew rock paper scissors. Draft two sides,
          lock a team strategy, and let the rounds decide who gets the bragging rights.
        </p>
      </div>
      <div class="team-rps-hero__scoreboard">
        <div class="team-rps-hero__score">
          <span>{{ leftTeam.name }}</span>
          <strong>{{ leftTeam.score }}</strong>
        </div>
        <div class="team-rps-hero__middle">
          <span>Best of {{ winThreshold * 2 - 1 }}</span>
          <b>VS</b>
          <small>{{ totalRoundsPlayed }} rounds played</small>
        </div>
        <div class="team-rps-hero__score">
          <span>{{ rightTeam.name }}</span>
          <strong>{{ rightTeam.score }}</strong>
        </div>
      </div>
    </section>

    <section class="team-rps-status">
      <p class="team-rps-status__line">{{ matchMessage }}</p>
      <p class="team-rps-status__meta">
        Leader: <strong>{{ currentLeader }}</strong>
        <span v-if="currentUser"> • You are logged in as {{ currentUser.displayName }}</span>
      </p>
    </section>

    <section class="team-rps-controls">
      <button class="btn team-rps-btn team-rps-btn--accent" type="button" @click="makeBalancedDraft">
        Shuffle draft
      </button>
      <button class="btn team-rps-btn" type="button" @click="autofillStrategies">
        Randomize strategies
      </button>
      <button class="btn team-rps-btn" type="button" :disabled="!canPlayRound" @click="playRound">
        Play round
      </button>
      <button class="btn team-rps-btn" type="button" @click="resetMatch">
        Reset score
      </button>
    </section>

    <section class="team-rps-board">
      <article class="team-card team-card--sun">
        <header class="team-card__header">
          <input v-model="leftTeam.name" class="team-card__name" maxlength="24" />
          <p class="team-card__caption">Warm pressure and heavy throws.</p>
        </header>

        <div class="team-card__strategy">
          <button
            v-for="move in moveMeta"
            :key="`left-${move.value}`"
            type="button"
            class="team-card__move"
            :class="{ 'is-active': leftTeam.strategy === move.value }"
            @click="leftTeam.strategy = move.value"
          >
            <span>{{ move.glyph }}</span>
            <strong>{{ move.label }}</strong>
            <small>{{ move.hint }}</small>
          </button>
        </div>

        <div class="team-card__roster">
          <article v-for="player in leftTeam.roster" :key="player.id" class="team-member">
            <img :src="avatarPath(player.avatarIndex)" :alt="player.displayName" class="team-member__avatar" />
            <div>
              <strong>{{ player.displayName }}</strong>
              <small>{{ player.source === "bot" ? "bot crew" : "live roster" }}</small>
            </div>
            <button type="button" class="team-member__remove" @click="removeFromTeam('left', player.id)">
              Remove
            </button>
          </article>
          <p v-if="!leftTeam.roster.length" class="team-card__empty">No crew yet. Add players from the bench below.</p>
        </div>
      </article>

      <article class="team-card team-card--night">
        <header class="team-card__header">
          <input v-model="rightTeam.name" class="team-card__name" maxlength="24" />
          <p class="team-card__caption">Sharp reads and late counters.</p>
        </header>

        <div class="team-card__strategy">
          <button
            v-for="move in moveMeta"
            :key="`right-${move.value}`"
            type="button"
            class="team-card__move"
            :class="{ 'is-active': rightTeam.strategy === move.value }"
            @click="rightTeam.strategy = move.value"
          >
            <span>{{ move.glyph }}</span>
            <strong>{{ move.label }}</strong>
            <small>{{ move.hint }}</small>
          </button>
        </div>

        <div class="team-card__roster">
          <article v-for="player in rightTeam.roster" :key="player.id" class="team-member">
            <img :src="avatarPath(player.avatarIndex)" :alt="player.displayName" class="team-member__avatar" />
            <div>
              <strong>{{ player.displayName }}</strong>
              <small>{{ player.source === "bot" ? "bot crew" : "live roster" }}</small>
            </div>
            <button type="button" class="team-member__remove" @click="removeFromTeam('right', player.id)">
              Remove
            </button>
          </article>
          <p v-if="!rightTeam.roster.length" class="team-card__empty">No crew yet. Add players from the bench below.</p>
        </div>
      </article>
    </section>

    <section class="bench card">
      <div class="bench__header">
        <div>
          <p class="bench__eyebrow">Bench</p>
          <h2 class="bench__title">Available players</h2>
        </div>
        <p class="bench__note">Add up to {{ maxTeamSize }} members per side.</p>
      </div>

      <div class="bench__grid">
        <article v-for="player in benchPlayers" :key="player.id" class="bench-player">
          <img :src="avatarPath(player.avatarIndex)" :alt="player.displayName" class="bench-player__avatar" />
          <div class="bench-player__copy">
            <strong>{{ player.displayName }}</strong>
            <small>{{ player.source === "bot" ? "fallback bot" : "market player" }}</small>
          </div>
          <div class="bench-player__actions">
            <button type="button" class="bench-player__add is-sun" @click="assignToTeam('left', player)">
              {{ leftTeam.name }}
            </button>
            <button type="button" class="bench-player__add is-night" @click="assignToTeam('right', player)">
              {{ rightTeam.name }}
            </button>
          </div>
        </article>
      </div>
    </section>

    <section class="round-feed card">
      <div class="round-feed__header">
        <div>
          <p class="round-feed__eyebrow">Match feed</p>
          <h2 class="round-feed__title">Round breakdown</h2>
        </div>
        <p class="round-feed__note">Each team strategy biases member throws for that round.</p>
      </div>

      <div v-if="roundLog.length" class="round-feed__list">
        <article v-for="entry in roundLog" :key="entry.id" class="round-entry">
          <div class="round-entry__summary">
            <div>
              <p class="round-entry__label">Round {{ entry.round }}</p>
              <strong>{{ entry.summary }}</strong>
            </div>
            <span class="round-entry__score">{{ entry.leftWins }} - {{ entry.rightWins }}</span>
          </div>

          <div class="round-entry__duels">
            <div v-for="duel in entry.duels" :key="duel.id" class="duel-row">
              <span>{{ duel.left.displayName }} {{ duel.leftMove }}</span>
              <b>
                {{
                  duel.winner === "draw"
                    ? "draw"
                    : duel.winner === "left"
                      ? leftTeam.name
                      : rightTeam.name
                }}
              </b>
              <span>{{ duel.rightMove }} {{ duel.right.displayName }}</span>
            </div>
          </div>
        </article>
      </div>
      <p v-else class="round-feed__empty">No rounds yet. Draft crews, pick strategies, and hit play.</p>
    </section>
  </div>
</template>

<style scoped>
.team-rps-page {
  --page-bg: linear-gradient(180deg, rgba(38, 13, 8, 0.94), rgba(15, 8, 27, 0.96));
  --page-line: rgba(255, 210, 168, 0.18);
  --page-text: #fff5e8;
  --page-muted: rgba(255, 233, 212, 0.72);
  --sun-1: #ff9e57;
  --sun-2: #ffce73;
  --night-1: #6ec5ff;
  --night-2: #93a0ff;
  --panel: rgba(255, 245, 233, 0.06);
  display: grid;
  gap: 1.25rem;
  color: var(--page-text);
}

.team-rps-hero,
.team-rps-status,
.team-rps-controls,
.team-rps-board,
.bench,
.round-feed {
  position: relative;
  overflow: hidden;
}

.team-rps-hero {
  display: grid;
  gap: 1rem;
  padding: 1.4rem;
  border: 1px solid var(--page-line);
  border-radius: 28px;
  background:
    radial-gradient(circle at top left, rgba(255, 158, 87, 0.3), transparent 30%),
    radial-gradient(circle at right center, rgba(110, 197, 255, 0.24), transparent 28%),
    var(--page-bg);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.3);
}

.team-rps-hero__eyebrow,
.bench__eyebrow,
.round-feed__eyebrow {
  margin-bottom: 0.35rem;
  color: var(--page-muted);
  font-size: 0.72rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.team-rps-hero__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.8rem;
}

.team-rps-chip {
  display: inline-flex;
  align-items: center;
  min-height: 2rem;
  padding: 0.25rem 0.8rem;
  border: 1px solid var(--page-line);
  border-radius: 999px;
  background: rgba(255, 245, 233, 0.08);
  color: var(--page-muted);
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.team-rps-hero__title {
  font-family: Georgia, "Times New Roman", serif;
  font-size: clamp(2.25rem, 6vw, 4.8rem);
  line-height: 0.95;
}

.team-rps-hero__text,
.team-rps-status__meta,
.bench__note,
.round-feed__note,
.team-card__caption,
.team-card__empty,
.round-feed__empty {
  color: var(--page-muted);
}

.team-rps-hero__scoreboard {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
}

.team-rps-hero__score,
.team-rps-hero__middle {
  display: grid;
  place-items: center;
  min-height: 124px;
  padding: 1rem;
  border-radius: 22px;
  border: 1px solid var(--page-line);
  background: var(--panel);
  text-align: center;
}

.team-rps-hero__score strong {
  font-size: clamp(2.6rem, 7vw, 4.8rem);
  line-height: 1;
}

.team-rps-hero__middle b {
  font-size: 2rem;
  letter-spacing: 0.08em;
}

.team-rps-status {
  display: grid;
  gap: 0.35rem;
  padding: 1rem 1.25rem;
  border-radius: 22px;
  border: 1px solid var(--page-line);
  background: rgba(255, 246, 237, 0.04);
}

.team-rps-status__line {
  font-size: 1.05rem;
  font-weight: 800;
}

.team-rps-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.team-rps-btn {
  min-width: 148px;
  border-color: rgba(255, 211, 179, 0.22);
  background: linear-gradient(180deg, rgba(76, 33, 20, 0.92), rgba(38, 19, 39, 0.92));
}

.team-rps-btn--accent {
  color: #361100;
  border-color: transparent;
  background: linear-gradient(135deg, var(--sun-2), var(--sun-1));
}

.team-rps-board {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.team-card {
  display: grid;
  gap: 1rem;
  padding: 1.2rem;
  border-radius: 28px;
  border: 1px solid var(--page-line);
}

.team-card--sun {
  background:
    radial-gradient(circle at top left, rgba(255, 206, 115, 0.18), transparent 26%),
    linear-gradient(180deg, rgba(71, 25, 11, 0.94), rgba(38, 16, 20, 0.95));
}

.team-card--night {
  background:
    radial-gradient(circle at top right, rgba(147, 160, 255, 0.2), transparent 26%),
    linear-gradient(180deg, rgba(21, 23, 63, 0.94), rgba(10, 14, 31, 0.96));
}

.team-card__header,
.bench__header,
.round-feed__header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: start;
}

.team-card__name {
  width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--page-text);
  font-family: Georgia, "Times New Roman", serif;
  font-size: 2rem;
  font-weight: 700;
}

.team-card__strategy {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.65rem;
}

.team-card__move {
  display: grid;
  gap: 0.22rem;
  padding: 0.85rem;
  border: 1px solid rgba(255, 233, 212, 0.12);
  border-radius: 20px;
  background: rgba(255, 245, 233, 0.05);
  color: inherit;
  cursor: pointer;
  text-align: left;
}

.team-card__move span {
  display: inline-grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  font-weight: 800;
}

.team-card__move.is-active {
  transform: translateY(-1px);
  border-color: rgba(255, 233, 212, 0.34);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.2);
}

.team-card__roster,
.round-feed__list {
  display: grid;
  gap: 0.75rem;
}

.team-member,
.bench-player,
.round-entry {
  display: grid;
  gap: 0.75rem;
  padding: 0.85rem;
  border-radius: 20px;
  border: 1px solid rgba(255, 233, 212, 0.12);
  background: rgba(255, 245, 233, 0.05);
}

.team-member {
  grid-template-columns: auto 1fr auto;
  align-items: center;
}

.team-member__avatar,
.bench-player__avatar {
  width: 52px;
  height: 52px;
  border-radius: 16px;
  object-fit: cover;
  border: 1px solid rgba(255, 233, 212, 0.16);
}

.team-member small,
.bench-player__copy small {
  display: block;
  margin-top: 0.2rem;
  color: var(--page-muted);
}

.team-member__remove,
.bench-player__add {
  border: 0;
  border-radius: 999px;
  padding: 0.6rem 0.8rem;
  font-weight: 700;
  cursor: pointer;
}

.team-member__remove {
  background: rgba(255, 255, 255, 0.12);
  color: var(--page-text);
}

.bench__grid,
.round-entry__duels {
  display: grid;
  gap: 0.8rem;
}

.bench-player {
  grid-template-columns: auto 1fr auto;
  align-items: center;
}

.bench-player__actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.bench-player__add.is-sun {
  background: linear-gradient(135deg, var(--sun-2), var(--sun-1));
  color: #351304;
}

.bench-player__add.is-night {
  background: linear-gradient(135deg, var(--night-1), var(--night-2));
  color: #091325;
}

.bench__title,
.round-feed__title {
  font-family: Georgia, "Times New Roman", serif;
  font-size: 1.8rem;
}

.round-entry__summary,
.duel-row {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: center;
}

.round-entry__label {
  margin-bottom: 0.2rem;
  color: var(--page-muted);
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.round-entry__score {
  display: inline-grid;
  place-items: center;
  min-width: 64px;
  min-height: 64px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  font-size: 1.1rem;
  font-weight: 800;
}

.duel-row {
  padding-top: 0.8rem;
  border-top: 1px solid rgba(255, 233, 212, 0.08);
  font-size: 0.94rem;
}

@media (max-width: 880px) {
  .team-rps-hero__scoreboard,
  .team-rps-board {
    grid-template-columns: 1fr;
  }

  .team-card__strategy {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .team-rps-page {
    gap: 1rem;
  }

  .team-rps-hero,
  .team-card,
  .bench,
  .round-feed {
    padding: 1rem;
  }

  .team-member,
  .bench-player,
  .round-entry__summary,
  .duel-row,
  .team-card__header,
  .bench__header,
  .round-feed__header {
    grid-template-columns: 1fr;
    display: grid;
  }

  .team-rps-controls {
    display: grid;
  }

  .team-rps-btn,
  .bench-player__add,
  .team-member__remove {
    width: 100%;
  }
}
</style>
