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

const avatarSeed = (name: string) =>
  [...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0)

const avatarStyle = (name: string) => {
  const seed = avatarSeed(name) % 360
  return {
    background: `linear-gradient(135deg, hsl(${seed} 75% 62%), hsl(${(seed + 42) % 360} 70% 48%))`
  }
}

const avatarText = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "P"

const leaderboardScore = (coin: number) => coin

</script>

<template>
  <div class="leaderboard-page">
    <h1 class="title leaderboard-title">
      <span class="leaderboard-title__icon" aria-hidden="true">🏆</span>
      Leaderboard
    </h1>

    <section class="leaderboard-podium">
      <article
        v-for="player in podium"
        :key="`${player.id}-${player.rank}`"
        class="leaderboard-podium__item"
        :class="`is-${player.place}`"
      >
        <p class="leaderboard-podium__name">{{ player.displayName }}</p>
        <div class="leaderboard-podium__avatar-ring">
          <span class="leaderboard-avatar" :style="avatarStyle(player.displayName)">
            {{ avatarText(player.displayName) }}
          </span>
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
              <div class="leaderboard-player">
                <span class="leaderboard-avatar leaderboard-avatar--sm" :style="avatarStyle(player.displayName)">
                  {{ avatarText(player.displayName) }}
                </span>
                <span>{{ player.displayName }}</span>
              </div>
            </td>
            <td class="value--coin">{{ player.coin }}</td>
            <td>{{ player.bankDebt }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
