<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue"
import { useMMarket } from "~/composables/useMMarket"
import { useLocale } from "~/composables/useLocale"

type ArenaChoice = "rock" | "paper" | "scissor"

interface ArenaRoom {
  id: string
  ownerId: string
  amount: number
  ownerChoice: ArenaChoice
  status: "open"
  createdAt: number
}
type MatchResult = "win" | "lose" | "draw"
interface ArenaMatch {
  id: string
  roomId: string
  ownerId: string
  challengerId: string
  amount: number
  ownerChoice: ArenaChoice
  challengerChoice: ArenaChoice
  result: MatchResult
  winnerUserId?: string
  resolvedAt: number
}

const { currentUser, playerById, formatTime } = useMMarket()
const { t } = useLocale()
const nowUnix = () => Math.floor(Date.now() / 1000)

const rooms = useState<ArenaRoom[]>("arena-rooms", () => [
  {
    id: "r1",
    ownerId: "u2",
    amount: 25,
    ownerChoice: "rock",
    status: "open",
    createdAt: nowUnix() - 60 * 18
  },
  {
    id: "r2",
    ownerId: "u4",
    amount: 50,
    ownerChoice: "paper",
    status: "open",
    createdAt: nowUnix() - 60 * 9
  },
  {
    id: "r3",
    ownerId: "u8",
    amount: 15,
    ownerChoice: "scissor",
    status: "open",
    createdAt: nowUnix() - 60 * 4
  },
  {
    id: "r4",
    ownerId: "u3",
    amount: 60,
    ownerChoice: "rock",
    status: "open",
    createdAt: nowUnix() - 60 * 25
  },
  {
    id: "r5",
    ownerId: "u6",
    amount: 35,
    ownerChoice: "paper",
    status: "open",
    createdAt: nowUnix() - 60 * 12
  },
  {
    id: "r6",
    ownerId: "u10",
    amount: 80,
    ownerChoice: "scissor",
    status: "open",
    createdAt: nowUnix() - 60 * 7
  },
  {
    id: "r7",
    ownerId: "u11",
    amount: 45,
    ownerChoice: "paper",
    status: "open",
    createdAt: nowUnix() - 60 * 2
  }
])
const showCreateModal = ref(false)
const showVersusModal = ref(false)
const showHistoryModal = ref(false)
const amount = ref(50)
const choice = ref<ArenaChoice>("rock")
const myChoice = ref<ArenaChoice | null>(null)
const matchResult = ref<MatchResult | null>(null)
const activeRoom = ref<ArenaRoom | null>(null)
const isResolving = ref(false)
const resolveTimer = ref<ReturnType<typeof setTimeout> | null>(null)
const message = ref("")
const amountStep = 5
const minAmount = 5
const choiceOptions = computed<Array<{ value: ArenaChoice; label: string; image: string }>>(() => [
  { value: "rock", label: t("arena.choiceRock"), image: "/images/rps-rock-card.png" },
  { value: "paper", label: t("arena.choicePaper"), image: "/images/rps-paper-card.png" },
  { value: "scissor", label: t("arena.choiceScissor"), image: "/images/rps-scissor-card.png" }
])
const matches = useState<ArenaMatch[]>("arena-matches", () => [
  {
    id: "m1",
    roomId: "r91",
    ownerId: "u4",
    challengerId: "u2",
    amount: 25,
    ownerChoice: "rock",
    challengerChoice: "paper",
    result: "lose",
    winnerUserId: "u2",
    resolvedAt: nowUnix() - 60 * 20
  },
  {
    id: "m2",
    roomId: "r92",
    ownerId: "u8",
    challengerId: "u3",
    amount: 15,
    ownerChoice: "paper",
    challengerChoice: "paper",
    result: "draw",
    resolvedAt: nowUnix() - 60 * 8
  }
])

const openRooms = computed(() =>
  [...rooms.value].sort((a, b) => b.createdAt - a.createdAt)
)
const recentMatches = computed(() =>
  [...matches.value]
    .sort((a, b) => b.resolvedAt - a.resolvedAt)
    .slice(0, 50)
)
const activeOwner = computed(() =>
  activeRoom.value ? playerById(activeRoom.value.ownerId) : null
)
const resultText = computed(() => {
  if (!matchResult.value) return ""
  if (matchResult.value === "win") return t("arena.resultWin")
  if (matchResult.value === "lose") return t("arena.resultLose")
  return t("arena.resultDraw")
})

const openCreateModal = () => {
  if (!currentUser.value) {
    message.value = t("arena.loginHint")
    return
  }
  message.value = ""
  showCreateModal.value = true
}

const createRoom = () => {
  if (!currentUser.value) {
    message.value = t("arena.loginHint")
    return
  }
  rooms.value.unshift({
    id: `r${rooms.value.length + 1}`,
    ownerId: currentUser.value.id,
    amount: Number(amount.value),
    ownerChoice: choice.value,
    status: "open",
    createdAt: nowUnix()
  })
  showCreateModal.value = false
  message.value = t("arena.created")
}

const decreaseAmount = () => {
  amount.value = Math.max(minAmount, amount.value - amountStep)
}

const increaseAmount = () => {
  amount.value += amountStep
}

const resetVersusState = () => {
  myChoice.value = null
  matchResult.value = null
  isResolving.value = false
  if (resolveTimer.value) {
    clearTimeout(resolveTimer.value)
    resolveTimer.value = null
  }
}

const closeVersusModal = () => {
  showVersusModal.value = false
  activeRoom.value = null
  resetVersusState()
}

const decideMatchResult = (mine: ArenaChoice, owner: ArenaChoice): MatchResult => {
  if (mine === owner) return "draw"
  if (
    (mine === "rock" && owner === "scissor") ||
    (mine === "paper" && owner === "rock") ||
    (mine === "scissor" && owner === "paper")
  ) {
    return "win"
  }
  return "lose"
}

const playChoice = (selectedChoice: ArenaChoice) => {
  if (!activeRoom.value || isResolving.value) return
  if (!currentUser.value) return
  myChoice.value = selectedChoice
  matchResult.value = null
  isResolving.value = true
  if (resolveTimer.value) clearTimeout(resolveTimer.value)
  resolveTimer.value = setTimeout(() => {
    if (!activeRoom.value || !myChoice.value || !currentUser.value) return
    const resolved = decideMatchResult(myChoice.value, activeRoom.value.ownerChoice)
    matchResult.value = resolved
    const winnerUserId =
      resolved === "draw"
        ? undefined
        : resolved === "win"
          ? currentUser.value.id
          : activeRoom.value.ownerId
    matches.value.unshift({
      id: `m${matches.value.length + 1}`,
      roomId: activeRoom.value.id,
      ownerId: activeRoom.value.ownerId,
      challengerId: currentUser.value.id,
      amount: activeRoom.value.amount,
      ownerChoice: activeRoom.value.ownerChoice,
      challengerChoice: myChoice.value,
      result: resolved,
      winnerUserId,
      resolvedAt: nowUnix()
    })
    if (matches.value.length > 50) matches.value.length = 50
    isResolving.value = false
  }, 850)
}

const joinRoom = (room: ArenaRoom) => {
  if (!currentUser.value) {
    message.value = t("arena.loginHint")
    return
  }
  if (room.ownerId === currentUser.value.id) {
    message.value = t("msg.receiverSelf")
    return
  }
  message.value = ""
  activeRoom.value = room
  resetVersusState()
  showVersusModal.value = true
}

onBeforeUnmount(() => {
  if (resolveTimer.value) clearTimeout(resolveTimer.value)
})
</script>

<template>
  <section class="arena-page">
    <header class="card arena-head">
      <div class="row">
        <span class="pill">{{ openRooms.length }} {{ t("common.events") }}</span>
        <div class="arena-head__actions">
          <button class="btn" type="button" @click="showHistoryModal = true">
            {{ t("arena.history") }}
          </button>
          <button class="btn btn--primary" type="button" @click="openCreateModal">
            {{ t("arena.createRoom") }}
          </button>
        </div>
      </div>
      <p v-if="message" class="muted">{{ message }}</p>
    </header>

    <div v-if="openRooms.length" class="arena-rooms__grid">
      <article v-for="room in openRooms" :key="room.id" class="arena-room-card">
        <p class="arena-room-card__id">#{{ room.id }}</p>
        <div class="arena-room-card__meta">
          <p>
            <span class="muted">{{ t("arena.owner") }}: </span>
            <strong>{{ playerById(room.ownerId)?.displayName }}</strong>
          </p>
          <p class="value--coin">
            {{ t("arena.stake") }}: {{ room.amount }}<img src="/images/m-coin.svg" alt="coin" class="coin-unit coin-unit--sm" />
          </p>
        </div>
        <p class="arena-room-card__hint">{{ t("arena.choiceLocked") }}</p>
        <button class="btn" type="button" @click="joinRoom(room)">{{ t("arena.joinPlay") }}</button>
      </article>
    </div>
    <p v-else class="muted">{{ t("arena.noRooms") }}</p>

    <div v-if="showCreateModal" class="modal" @click.self="showCreateModal = false">
      <div class="modal__panel">
        <h3>{{ t("arena.createRoom") }}</h3>
        <form class="form" @submit.prevent="createRoom">
          <div class="field">
            <label>{{ t("arena.amount") }}</label>
            <div class="arena-amount-step">
              <button
                type="button"
                class="arena-amount-step__btn"
                :disabled="amount <= minAmount"
                @click="decreaseAmount"
              >
                -
              </button>
              <p class="arena-amount-step__value">{{ amount }} {{ t("arena.coinUnit") }}</p>
              <button
                type="button"
                class="arena-amount-step__btn"
                @click="increaseAmount"
              >
                +
              </button>
            </div>
          </div>

          <div class="field">
            <label>{{ t("arena.choice") }}</label>
            <div class="arena-options arena-options--choice">
              <button
                v-for="item in choiceOptions"
                :key="item.value"
                type="button"
                class="arena-options__btn arena-options__btn--choice"
                :class="{ 'is-active': choice === item.value }"
                @click="choice = item.value"
              >
                <img :src="item.image" :alt="item.label" class="arena-choice-card" />
              </button>
            </div>
          </div>

          <button class="btn btn--primary" type="submit">{{ t("arena.confirmCreate") }}</button>
        </form>
      </div>
    </div>

    <div v-if="showVersusModal && activeRoom" class="modal" @click.self="closeVersusModal">
      <div class="modal__panel arena-vs" :class="{ 'is-resolving': isResolving }">
        <header class="arena-vs__head">
          <h3>{{ t("arena.vsTitle") }}</h3>
          <p class="muted">
            #{{ activeRoom.id }} · {{ t("arena.stake") }} {{ activeRoom.amount }}
            <img src="/images/m-coin.svg" alt="coin" class="coin-unit coin-unit--sm" />
          </p>
        </header>

        <div class="arena-vs__board">
          <section class="arena-vs__side">
            <p class="arena-vs__label">{{ t("arena.yourSide") }}</p>
            <div class="arena-vs__cards">
              <button
                v-for="item in choiceOptions"
                :key="`mine-${item.value}`"
                type="button"
                class="arena-vs__card-btn"
                :class="{ 'is-active': myChoice === item.value }"
                :disabled="isResolving"
                @click="playChoice(item.value)"
              >
                <img :src="item.image" :alt="item.label" class="arena-choice-card" />
              </button>
            </div>
          </section>

          <section class="arena-vs__side">
            <p class="arena-vs__label">
              {{ activeOwner?.displayName || t("arena.opponentSide") }}
            </p>
            <div class="arena-vs__cards">
              <div
                v-for="item in choiceOptions"
                :key="`opp-${item.value}`"
                class="arena-vs__card-btn arena-vs__card-btn--opponent"
                :class="{
                  'is-hidden': !matchResult,
                  'is-active': matchResult && activeRoom.ownerChoice === item.value
                }"
              >
                <img :src="item.image" :alt="item.label" class="arena-choice-card" />
                <span v-if="!matchResult" class="arena-vs__cover">?</span>
              </div>
            </div>
          </section>
        </div>

        <p v-if="!myChoice" class="arena-vs__status muted">{{ t("arena.pickChoice") }}</p>
        <p v-else-if="isResolving" class="arena-vs__status muted">{{ t("arena.revealing") }}</p>
        <p v-else class="arena-vs__status" :class="`is-${matchResult}`">{{ resultText }}</p>

        <div class="row arena-vs__actions">
          <button class="btn" type="button" @click="closeVersusModal">{{ t("sidebar.close") }}</button>
        </div>
      </div>
    </div>

    <div v-if="showHistoryModal" class="modal" @click.self="showHistoryModal = false">
      <div class="modal__panel arena-history">
        <header class="arena-history__head">
          <h3>{{ t("arena.history") }}</h3>
          <p class="muted">{{ t("arena.historyHint") }}</p>
        </header>

        <div v-if="recentMatches.length" class="arena-history__list">
          <article
            v-for="match in recentMatches"
            :key="match.id"
            class="arena-history__item"
          >
            <p class="arena-history__route">
              <strong>{{ playerById(match.ownerId)?.displayName }}</strong>
              <span class="muted"> -&gt; </span>
              <strong>{{ playerById(match.challengerId)?.displayName }}</strong>
            </p>
            <p class="arena-history__meta muted">
              #{{ match.roomId }} · {{ t("arena.stake") }} {{ match.amount }}
              <img src="/images/m-coin.svg" alt="coin" class="coin-unit coin-unit--sm" />
              · {{ match.ownerChoice }} vs {{ match.challengerChoice }}
            </p>
            <p class="arena-history__meta">
              <span
                class="arena-history__result"
                :class="{
                  'is-win': match.winnerUserId,
                  'is-draw': !match.winnerUserId
                }"
              >
                {{ match.winnerUserId ? `${t("arena.winner")}: ${playerById(match.winnerUserId)?.displayName}` : t("arena.resultDraw") }}
              </span>
              <span class="muted">{{ formatTime(match.resolvedAt) }}</span>
            </p>
          </article>
        </div>
        <p v-else class="muted">{{ t("arena.noHistory") }}</p>

        <div class="row arena-vs__actions">
          <button class="btn" type="button" @click="showHistoryModal = false">{{ t("sidebar.close") }}</button>
        </div>
      </div>
    </div>
  </section>
</template>
