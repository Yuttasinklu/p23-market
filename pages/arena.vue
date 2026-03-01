<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue"
import { useMMarket } from "~/composables/useMMarket"
import { useLocale } from "~/composables/useLocale"
import { useApi } from "~/composables/useApi"
import { useToast } from "~/composables/useToast"

type ArenaChoice = "rock" | "paper" | "scissors"
type MatchResult = "win" | "lose" | "draw"

interface ArenaRoom {
  id: string
  name?: string
  ownerId: string
  ownerDisplayName?: string
  ownerAvatarIndex?: number
  amount: number
  status: "open"
  createdAt: number
}

interface ArenaMatch {
  id: string
  roomId: string
  ownerId: string
  challengerId: string
  amount: number
  ownerChoice: ArenaChoice
  challengerChoice: ArenaChoice
  winnerUserId?: string
  resolvedAt: number
}

const { currentUser, playerById, formatTime, reloadData } = useMMarket()
const { t } = useLocale()
const { apiFetch } = useApi()
const { pushError, pushSuccess } = useToast()

const authToken = useState<string | null>("authToken", () => null)
const rooms = useState<ArenaRoom[]>("arena-rooms", () => [])
const matches = useState<ArenaMatch[]>("arena-matches", () => [])

const showCreateModal = ref(false)
const showVersusModal = ref(false)
const showHistoryModal = ref(false)
const loadingRooms = ref(false)
const loadingMatches = ref(false)
const isCreatingRoom = ref(false)
const roomName = ref("")
const amount = ref(10)
const choice = ref<ArenaChoice>("rock")
const myChoice = ref<ArenaChoice | null>(null)
const revealedOwnerChoice = ref<ArenaChoice | null>(null)
const matchResult = ref<MatchResult | null>(null)
const resultStatusMessage = ref("")
const activeRoom = ref<ArenaRoom | null>(null)
const isResolving = ref(false)
const resolveTimer = ref<ReturnType<typeof setTimeout> | null>(null)
const roomsInterval = ref<ReturnType<typeof setInterval> | null>(null)
const amountStep = 5
const minAmount = 5

const authHeaders = computed(() =>
  authToken.value ? { Authorization: `Bearer ${authToken.value}` } : {}
)

const choiceOptions = computed<Array<{ value: ArenaChoice; label: string; image: string }>>(() => [
  { value: "rock", label: t("arena.choiceRock"), image: "/images/rps-rock-card.png" },
  { value: "paper", label: t("arena.choicePaper"), image: "/images/rps-paper-card.png" },
  { value: "scissors", label: t("arena.choiceScissor"), image: "/images/rps-scissor-card.png" }
])

const normalizeChoice = (value: unknown): ArenaChoice =>
  value === "scissor" ? "scissors" : (value as ArenaChoice)

const mapRoom = (raw: Record<string, any>): ArenaRoom => ({
  id: String(raw.id || ""),
  name: typeof raw.name === "string"
    ? raw.name
    : typeof raw.roomName === "string"
      ? raw.roomName
      : typeof raw.title === "string"
        ? raw.title
        : undefined,
  ownerId: String(raw.ownerId || ""),
  ownerDisplayName: raw.ownerDisplayName || undefined,
  ownerAvatarIndex: Number.isInteger(raw.ownerAvatarIndex) ? Number(raw.ownerAvatarIndex) : undefined,
  amount: Number(raw.amount || 0),
  status: "open",
  createdAt: Number(raw.createdAt || 0)
})

const mapMatch = (raw: Record<string, any>): ArenaMatch => ({
  id: String(raw.id || ""),
  roomId: String(raw.roomId || ""),
  ownerId: String(raw.ownerId || ""),
  challengerId: String(raw.challengerId || ""),
  amount: Number(raw.amount || 0),
  ownerChoice: normalizeChoice(raw.ownerChoice),
  challengerChoice: normalizeChoice(raw.challengerChoice),
  winnerUserId: raw.winnerUserId || raw.result?.winnerUserId || undefined,
  resolvedAt: Number(raw.resolvedAt || 0)
})

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

const winTauntKeys = [
  "arena.resultTauntWin1",
  "arena.resultTauntWin2",
  "arena.resultTauntWin3",
  "arena.resultTauntWin4"
]

const loseTauntKeys = [
  "arena.resultTauntLose1",
  "arena.resultTauntLose2",
  "arena.resultTauntLose3",
  "arena.resultTauntLose4"
]

const drawTauntKeys = [
  "arena.resultTauntDraw1",
  "arena.resultTauntDraw2",
  "arena.resultTauntDraw3"
]

const pickRandom = (items: string[]) =>
  items[Math.floor(Math.random() * items.length)]

const buildResultStatusText = (result: MatchResult) => {
  if (!currentUser.value || !activeRoom.value) return ""
  const opponent = activeOwner.value?.displayName || t("arena.opponentSide")
  const amount = activeRoom.value.amount

  if (result === "win") {
    return t(pickRandom(winTauntKeys), {
      winner: currentUser.value.displayName,
      loser: opponent,
      amount
    })
  }

  if (result === "lose") {
    return t(pickRandom(loseTauntKeys), {
      winner: opponent,
      loser: currentUser.value.displayName,
      amount
    })
  }

  return t(pickRandom(drawTauntKeys), { amount })
}

const playerChoiceClass = (value: ArenaChoice) => {
  const isPicked = myChoice.value === value
  return {
    "is-active": isPicked,
    "is-picked": isPicked && !!matchResult.value,
    "is-win": isPicked && matchResult.value === "win",
    "is-lose": isPicked && matchResult.value === "lose",
    "is-draw": isPicked && matchResult.value === "draw"
  }
}

const opponentChoiceClass = (value: ArenaChoice) => {
  const isPicked = !!matchResult.value && revealedOwnerChoice.value === value
  const opponentResult =
    matchResult.value === "win"
      ? "lose"
      : matchResult.value === "lose"
        ? "win"
        : matchResult.value
  return {
    "is-hidden": !matchResult.value,
    "is-active": isPicked,
    "is-picked": isPicked,
    "is-unpicked": !!matchResult.value && !isPicked,
    "is-win": isPicked && opponentResult === "win",
    "is-lose": isPicked && opponentResult === "lose",
    "is-draw": isPicked && opponentResult === "draw"
  }
}

const playerName = (id?: string, fallback?: string) =>
  playerById(id)?.displayName || fallback || id || "-"

const extractApiError = (error: unknown, fallback: string) => {
  const maybe = error as { data?: { error?: { message?: string }; message?: string }; message?: string }
  return maybe?.data?.error?.message || maybe?.data?.message || maybe?.message || fallback
}

const refreshRooms = async () => {
  loadingRooms.value = true
  try {
    const response = await apiFetch<{ items: Array<Record<string, any>> }>("arena/rooms", {
      method: "GET",
      headers: authHeaders.value
    })
    rooms.value = Array.isArray(response.items)
      ? response.items.map((item) => mapRoom(item))
      : []
  } catch {
    rooms.value = []
  } finally {
    loadingRooms.value = false
  }
}

const refreshRoomList = async () => {
  await refreshRooms()
}

const refreshMatches = async () => {
  loadingMatches.value = true
  try {
    const response = await apiFetch<{ items: Array<Record<string, any>> }>("arena/matches", {
      method: "GET",
      headers: authHeaders.value
    })
    matches.value = Array.isArray(response.items)
      ? response.items.map((item) => mapMatch(item))
      : []
  } catch {
    matches.value = []
  } finally {
    loadingMatches.value = false
  }
}

const openCreateModal = () => {
  if (!currentUser.value) {
    pushError(t("arena.loginHint"))
    return
  }
  roomName.value = ""
  showCreateModal.value = true
}

const createRoom = async () => {
  if (isCreatingRoom.value) return
  if (!currentUser.value) {
    pushError(t("arena.loginHint"))
    return
  }
  const trimmedRoomName = roomName.value.trim()
  if (!trimmedRoomName) {
    pushError(t("arena.roomNameRequired"))
    return
  }
  isCreatingRoom.value = true
  try {
    await apiFetch("arena/rooms", {
      method: "POST",
      headers: authHeaders.value,
      body: {
        name: trimmedRoomName,
        amount: Number(amount.value),
        choice: choice.value
      }
    })
    showCreateModal.value = false
    roomName.value = ""
    pushSuccess(t("arena.created"))
    await Promise.all([refreshRooms(), reloadData()])
  } catch (error) {
    pushError(extractApiError(error, t("arena.loginHint")))
  } finally {
    isCreatingRoom.value = false
  }
}

const decreaseAmount = () => {
  amount.value = Math.max(minAmount, amount.value - amountStep)
}

const increaseAmount = () => {
  amount.value += amountStep
}

const resetVersusState = () => {
  myChoice.value = null
  revealedOwnerChoice.value = null
  matchResult.value = null
  resultStatusMessage.value = ""
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

const joinRoom = (room: ArenaRoom) => {
  if (!currentUser.value) {
    pushError(t("arena.loginHint"))
    return
  }
  if (room.ownerId === currentUser.value.id) {
    pushError(t("msg.receiverSelf"))
    return
  }

  activeRoom.value = room
  resetVersusState()
  showVersusModal.value = true
}

const playChoice = async (selectedChoice: ArenaChoice) => {
  if (!activeRoom.value || isResolving.value || !!matchResult.value || !currentUser.value) return

  myChoice.value = selectedChoice
  matchResult.value = null
  revealedOwnerChoice.value = null
  isResolving.value = true

  try {
    const response = await apiFetch<{ ok?: boolean; match: Record<string, any> }>(
      `arena/rooms/${activeRoom.value.id}/join`,
      {
        method: "POST",
        headers: authHeaders.value,
        body: {
          choice: selectedChoice
        }
      }
    )

    const resolved = mapMatch(response.match || {})
    if (resolveTimer.value) clearTimeout(resolveTimer.value)
    resolveTimer.value = setTimeout(async () => {
      revealedOwnerChoice.value = resolved.ownerChoice
      matchResult.value = !resolved.winnerUserId
        ? "draw"
        : resolved.winnerUserId === currentUser.value?.id
          ? "win"
          : "lose"
      if (matchResult.value) {
        resultStatusMessage.value = buildResultStatusText(matchResult.value)
      }
      isResolving.value = false

      await Promise.all([refreshRooms(), refreshMatches(), reloadData()])
    }, 850)
  } catch (error) {
    isResolving.value = false
    pushError(extractApiError(error, t("arena.loginHint")))
  }
}

onMounted(async () => {
  await Promise.all([refreshRooms(), refreshMatches()])
  roomsInterval.value = setInterval(() => {
    void refreshRooms()
  }, 10000)
})

watch(authToken, async () => {
  await Promise.all([refreshRooms(), refreshMatches()])
})

onBeforeUnmount(() => {
  if (resolveTimer.value) clearTimeout(resolveTimer.value)
  if (roomsInterval.value) clearInterval(roomsInterval.value)
})
</script>

<template>
  <section class="arena-page">
    <header class="card arena-head">
      <div class="row">
        <span class="pill">{{ openRooms.length }} {{ t("common.events") }}</span>
        <div class="arena-head__actions">
          <button class="btn" type="button" :disabled="loadingRooms" @click="refreshRoomList">
            Refresh Rooms
          </button>
          <button class="btn" type="button" @click="showHistoryModal = true">
            {{ t("arena.history") }}
          </button>
          <button class="btn btn--primary" type="button" @click="openCreateModal">
            {{ t("arena.createRoom") }}
          </button>
        </div>
      </div>
    </header>

    <div v-if="openRooms.length" class="arena-rooms__grid">
      <article v-for="room in openRooms" :key="room.id" class="arena-room-card">
        <p v-if="room.name" class="arena-room-card__id">{{ room.name }}</p>
        <p v-else class="arena-room-card__id">#{{ room.id }}</p>
        <div class="arena-room-card__meta">
          <p>
            <span class="muted">{{ t("arena.owner") }}: </span>
            <strong>{{ playerName(room.ownerId, room.ownerDisplayName) }}</strong>
          </p>
          <p class="value--coin">
            {{ t("arena.stake") }}: {{ room.amount }}<img src="/images/m-coin.svg" alt="coin" class="coin-unit coin-unit--sm" />
          </p>
        </div>
        <p class="arena-room-card__hint">{{ t("arena.choiceLocked") }}</p>
        <button class="btn" type="button" @click="joinRoom(room)">{{ t("arena.joinPlay") }}</button>
      </article>
    </div>
    <p v-else class="muted">{{ loadingRooms ? "Loading..." : t("arena.noRooms") }}</p>

    <div v-if="showCreateModal" class="modal" @click.self="showCreateModal = false">
      <div class="modal__panel">
        <h3>{{ t("arena.createRoom") }}</h3>
        <form class="form" @submit.prevent="createRoom">
          <div class="field">
            <label for="arena-room-name">{{ t("arena.roomName") }}</label>
            <input
              id="arena-room-name"
              v-model="roomName"
              class="input"
              :placeholder="t('arena.roomNamePlaceholder')"
              maxlength="48"
              required
              :disabled="isCreatingRoom"
            />
          </div>

          <div class="field">
            <label>{{ t("arena.amount") }}</label>
            <div class="arena-amount-step">
              <button
                type="button"
                class="arena-amount-step__btn"
                :disabled="amount <= minAmount || isCreatingRoom"
                @click="decreaseAmount"
              >
                -
              </button>
              <p class="arena-amount-step__value">{{ amount }} {{ t("arena.coinUnit") }}</p>
              <button
                type="button"
                class="arena-amount-step__btn"
                :disabled="isCreatingRoom"
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
                :disabled="isCreatingRoom"
                @click="choice = item.value"
              >
                <img :src="item.image" :alt="item.label" class="arena-choice-card" />
              </button>
            </div>
          </div>

          <button class="btn btn--primary" type="submit" :disabled="isCreatingRoom">
            {{ isCreatingRoom ? "Creating..." : t("arena.confirmCreate") }}
          </button>
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
                :class="playerChoiceClass(item.value)"
                :disabled="isResolving || !!matchResult"
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
                :class="opponentChoiceClass(item.value)"
              >
                <img :src="item.image" :alt="item.label" class="arena-choice-card" />
                <span v-if="!matchResult" class="arena-vs__cover">?</span>
              </div>
            </div>
          </section>
        </div>

        <p v-if="!myChoice" class="arena-vs__status muted">{{ t("arena.pickChoice") }}</p>
        <p v-else-if="isResolving" class="arena-vs__status muted">{{ t("arena.revealing") }}</p>
        <p v-else class="arena-vs__status" :class="`is-${matchResult}`">{{ resultStatusMessage || resultText }}</p>

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
              <strong>{{ playerName(match.ownerId) }}</strong>
              <span class="muted"> -&gt; </span>
              <strong>{{ playerName(match.challengerId) }}</strong>
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
                {{ match.winnerUserId ? `${t("arena.winner")}: ${playerName(match.winnerUserId)}` : t("arena.resultDraw") }}
              </span>
              <span class="muted">{{ formatTime(match.resolvedAt) }}</span>
            </p>
          </article>
        </div>
        <p v-else class="muted">{{ loadingMatches ? "Loading..." : t("arena.noHistory") }}</p>

        <div class="row arena-vs__actions">
          <button class="btn" type="button" @click="showHistoryModal = false">{{ t("sidebar.close") }}</button>
        </div>
      </div>
    </div>
  </section>
</template>
