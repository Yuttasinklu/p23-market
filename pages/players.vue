<script setup lang="ts">
import { computed } from "vue"
import { useMMarket } from "~/composables/useMMarket"
import { useLocale } from "~/composables/useLocale"

const { allPlayers } = useMMarket()
const { t } = useLocale()

const rankedPlayers = computed(() =>
  [...allPlayers.value]
    .filter((player) => player.role === "player")
    .sort((a, b) => (b.coin - a.coin) || (a.bankDebt - b.bankDebt))
)

const topThree = computed(() => rankedPlayers.value.slice(0, 3))
const remainingPlayers = computed(() => rankedPlayers.value.slice(3))
const podium = computed(() => {
  const first = topThree.value[0]
  const second = topThree.value[1]
  const third = topThree.value[2]
  return [
    second ? { ...second, rank: 2, place: "left" } : null,
    first ? { ...first, rank: 1, place: "center" } : null,
    third ? { ...third, rank: 3, place: "right" } : null
  ].filter(Boolean)
})

const avatarPath = (index: number) => `/images/avatars/${index}.png`

const leaderboardScore = (coin: number) => coin

</script>

<template>
  <div class="leaderboard-page">
    <h1 class="title leaderboard-title">
      <span class="leaderboard-title__icon" aria-hidden="true">🏆</span>
      {{ t("players.leaderboard") }}
    </h1>

    <section class="leaderboard-podium">
      <article
        v-for="player in podium"
        :key="`${player.id}-${player.rank}`"
        class="leaderboard-podium__item"
        :class="`is-${player.place}`"
      >
        <p class="leaderboard-podium__name">{{ player.displayName }}</p>
        <p class="leaderboard-podium__username">@{{ player.username }}</p>
        <div class="leaderboard-podium__avatar-ring">
          <img
            :src="avatarPath(player.avatarIndex || 0)"
            :alt="player.displayName"
            class="leaderboard-avatar"
          />
        </div>
        <div class="leaderboard-podium__block">
          <img src="/images/m-coin.svg" alt="M-coin" class="leaderboard-podium__badge" />
          <p class="leaderboard-podium__score">{{ leaderboardScore(player.coin) }}</p>
          <p class="leaderboard-podium__debt">{{ t("common.debt") }}: {{ player.bankDebt }}</p>
          <p class="leaderboard-podium__rank">{{ player.rank }}</p>
        </div>
      </article>
    </section>

    <div class="table-wrap leaderboard-table">
      <table class="table">
        <thead>
          <tr>
            <th>#</th>
            <th>{{ t("common.player") }}</th>
            <th>{{ t("common.coin") }}</th>
            <th>{{ t("common.debt") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(player, index) in remainingPlayers" :key="player.id">
            <td>{{ index + 4 }}</td>
            <td>
              <strong>{{ player.displayName }}</strong>
            </td>
            <td class="value--coin">{{ player.coin }}</td>
            <td>{{ player.bankDebt }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
