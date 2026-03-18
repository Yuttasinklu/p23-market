<script setup lang="ts">
import { navigateTo } from "#app";
import { useMMarket } from "~/composables/useMMarket";
import { useRuntimeConfig } from "#imports";

const { currentUser, isAuthenticated } = useMMarket();
const config = useRuntimeConfig();
const isLiveGameDisabled = computed(() => !config.public.enabledLiveGame);

const paths = {
  arena: "/arena",
  multiplayer: "/team",
};

const openMode = async (path: string) => {
  if (!isAuthenticated.value) return;
  if (path === paths.multiplayer && isLiveGameDisabled.value) return;
  await navigateTo(path);
};
</script>

<template>
  <section class="arena-gateway">
    <header class="arena-gateway__hero card">
      <div>
        <p class="arena-gateway__eyebrow">Play Mode</p>
        <h1 class="arena-gateway__title">Choose how you want to play.</h1>
        <p class="arena-gateway__text">
          Open the classic mode or jump into the live room lobby.
        </p>
      </div>
    </header>

    <section v-if="!isAuthenticated" class="arena-gateway__notice card">
      <strong>Login required first</strong>
      <p>Please login from the top bar before entering a game mode.</p>
    </section>

    <section class="arena-gateway__grid">
      <button
        class="arena-gateway__card card"
        :class="{ 'is-locked': !isAuthenticated }"
        type="button"
        @click="openMode(paths.arena)"
      >
        <p class="arena-gateway__label">Classic</p>
        <strong class="arena-gateway__name">Original Arena</strong>
        <div class="arena-gateway__badges">
          <span class="arena-gateway__badge">RPS</span>
          <span v-if="!isAuthenticated" class="arena-gateway__badge is-muted">Login required</span>
        </div>
        <p class="arena-gateway__copy">
          Create or join a room and play the original arena flow.
        </p>
        <span class="arena-gateway__cta">{{ isAuthenticated ? "Open Classic" : "Login first" }}</span>
      </button>

      <button
        class="arena-gateway__card card is-team"
        :class="{ 'is-locked': !isAuthenticated || isLiveGameDisabled, 'is-disabled-live': isLiveGameDisabled }"
        type="button"
        @click="openMode(paths.multiplayer)"
      >
        <span class="arena-gateway__beta">Beta version</span>
        <div v-if="isLiveGameDisabled" class="arena-gateway__overlay">
          <strong>Coming soon</strong>
          <span>Live game is disabled right now.</span>
        </div>
        <p class="arena-gateway__label">Live</p>
        <strong class="arena-gateway__name">Live Lobby</strong>
        <div class="arena-gateway__badges">
          <span class="arena-gateway__badge">Team RPS</span>
          <span class="arena-gateway__badge is-muted">Majority Die</span>
          <span class="arena-gateway__badge is-muted">Highest Number Win</span>
          <span v-if="isLiveGameDisabled" class="arena-gateway__badge is-muted">Disabled</span>
          <span v-if="!isAuthenticated" class="arena-gateway__badge is-muted">Login required</span>
        </div>
        <p class="arena-gateway__copy">
          Browse live rooms, pick a mode, and join active multiplayer matches.
        </p>
        <span class="arena-gateway__cta">
          {{ isLiveGameDisabled ? "Coming soon" : isAuthenticated ? "Open Live" : "Login first" }}
        </span>
      </button>
    </section>
  </section>
</template>

<style scoped>
button {
  border: 0;
}

.arena-gateway {
  display: grid;
  gap: 0.9rem;
}

.arena-gateway__hero,
.arena-gateway__notice,
.arena-gateway__card {
  border: 1px solid rgba(141, 197, 255, 0.14);
  border-radius: 24px;
  background: rgba(10, 23, 46, 0.82);
}

.arena-gateway__hero {
  padding: 1rem;
  background:
    radial-gradient(circle at top left, rgba(255, 184, 94, 0.18), transparent 24%),
    radial-gradient(circle at right center, rgba(96, 174, 255, 0.16), transparent 22%),
    linear-gradient(180deg, rgba(19, 23, 47, 0.96), rgba(9, 18, 37, 0.98));
}

.arena-gateway__eyebrow,
.arena-gateway__label {
  color: #95b9e7;
  font-size: 0.76rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.arena-gateway__title {
  margin-top: 0.25rem;
  font-family: Georgia, "Times New Roman", serif;
  font-size: clamp(1.45rem, 3vw, 2.4rem);
  line-height: 1.02;
}

.arena-gateway__text,
.arena-gateway__copy {
  margin-top: 0.45rem;
  color: #b9d7f8;
}

.arena-gateway__notice {
  display: grid;
  gap: 0.2rem;
  padding: 0.9rem 1rem;
  background: linear-gradient(180deg, rgba(78, 43, 18, 0.92), rgba(44, 23, 10, 0.94));
  border-color: rgba(255, 184, 94, 0.2);
}

.arena-gateway__notice.is-ready {
  background: linear-gradient(180deg, rgba(14, 72, 52, 0.92), rgba(10, 43, 31, 0.94));
  border-color: rgba(101, 215, 161, 0.22);
}

.arena-gateway__notice strong {
  color: #fff2d4;
}

.arena-gateway__notice.is-ready strong {
  color: #ffffff;
}

.arena-gateway__notice p {
  color: rgba(255, 238, 207, 0.82);
}

.arena-gateway__notice.is-ready p {
  color: rgba(255, 255, 255, 0.82);
}

.arena-gateway__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.9rem;
}

.arena-gateway__card {
  position: relative;
  display: grid;
  gap: 0.4rem;
  padding: 1rem;
  text-align: left;
  color: inherit;
  appearance: none;
  transition: border-color 160ms ease, transform 160ms ease, background 160ms ease;
}

.arena-gateway__card:hover {
  border-color: rgba(255, 209, 117, 0.36);
  transform: translateY(-1px);
}

.arena-gateway__card.is-locked {
  opacity: 0.84;
}

.arena-gateway__card.is-locked:hover {
  transform: none;
  border-color: rgba(141, 197, 255, 0.14);
}

.arena-gateway__card.is-disabled-live {
  overflow: hidden;
}

.arena-gateway__card.is-team {
  background:
    radial-gradient(circle at top right, rgba(85, 194, 255, 0.14), transparent 30%),
    rgba(10, 23, 46, 0.82);
}

.arena-gateway__overlay {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 0.2rem;
  padding: 1rem;
  background: rgba(6, 12, 24, 0.72);
  backdrop-filter: blur(4px);
  text-align: center;
}

.arena-gateway__overlay strong {
  color: #ffffff;
  font-size: 1.05rem;
}

.arena-gateway__overlay span {
  color: rgba(220, 236, 255, 0.86);
  font-size: 0.9rem;
}

.arena-gateway__beta {
  display: inline-flex;
  width: fit-content;
  margin-bottom: 0.15rem;
  padding: 0.18rem 0.55rem;
  border-radius: 999px;
  background: rgba(255, 122, 122, 0.14);
  border: 1px solid rgba(255, 122, 122, 0.2);
  color: #ffb1b1;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.arena-gateway__name {
  font-size: 1.2rem;
}

.arena-gateway__badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-top: 0.1rem;
}

.arena-gateway__badge {
  display: inline-flex;
  align-items: center;
  min-height: 1.7rem;
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 209, 117, 0.18);
  background: rgba(255, 209, 117, 0.1);
  color: #ffe09c;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.arena-gateway__badge.is-muted {
  border-color: rgba(141, 197, 255, 0.14);
  background: rgba(141, 197, 255, 0.08);
  color: #a8caef;
}

.arena-gateway__cta {
  display: inline-flex;
  width: fit-content;
  margin-top: 0.35rem;
  padding: 0.45rem 0.7rem;
  border-radius: 999px;
  background: rgba(255, 209, 117, 0.12);
  color: #ffe09c;
  font-weight: 700;
}

@media (max-width: 640px) {
  .arena-gateway__grid {
    grid-template-columns: 1fr;
  }

  .arena-gateway__hero,
  .arena-gateway__card {
    border-radius: 18px;
  }

  .arena-gateway__hero,
  .arena-gateway__card {
    padding: 0.85rem;
  }

  .arena-gateway__title {
    font-size: 1.3rem;
  }
}
</style>
