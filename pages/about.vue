<script setup lang="ts">
import { useMMarket } from "~/composables/useMMarket";
import { useLocale } from "~/composables/useLocale";

const { exchangeRate } = useMMarket()
const { t } = useLocale()
</script>

<template>
  <div class="stack whitepaper-page">
    <section class="card stack whitepaper-section whitepaper-section--hero">
      <p class="pill">White Paper</p>
      <h1 class="title">{{ t("about.title") }}</h1>
      <p class="muted">{{ t("about.subtitle") }}</p>
    </section>

    <section class="card stack whitepaper-section whitepaper-section--problem">
      <h2 class="whitepaper-title">
        <span class="whitepaper-title__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none"><path d="M12 8v5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="16.5" r="1" fill="currentColor"/><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/></svg>
        </span>
        {{ t("about.problemTitle") }}
      </h2>
      <p class="muted">{{ t("about.problemBody") }}</p>
    </section>

    <section class="card stack whitepaper-section whitepaper-section--why">
      <h2 class="whitepaper-title">
        <span class="whitepaper-title__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none"><path d="M6 12h12M12 6v12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/></svg>
        </span>
        {{ t("about.whyTitle") }}
      </h2>
      <p class="muted">{{ t("about.whyBody") }}</p>
    </section>

    <section class="card stack whitepaper-section whitepaper-section--principles">
      <h2 class="whitepaper-title">
        <span class="whitepaper-title__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none"><path d="M8 12l2.5 2.5L16 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><rect x="4" y="4" width="16" height="16" rx="3" stroke="currentColor" stroke-width="2"/></svg>
        </span>
        {{ t("about.principlesTitle") }}
      </h2>
      <ul class="muted whitepaper-list">
        <li>{{ t("about.principles1") }}</li>
        <li>{{ t("about.principles2") }}</li>
        <li>{{ t("about.principles3") }}</li>
        <li>{{ t("about.principles4") }}</li>
      </ul>
    </section>

    <section class="card stack whitepaper-section whitepaper-section--scope">
      <h2 class="whitepaper-title">
        <span class="whitepaper-title__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none"><path d="M5 7h14M5 12h14M5 17h9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><rect x="3" y="4" width="18" height="16" rx="3" stroke="currentColor" stroke-width="2"/></svg>
        </span>
        {{ t("about.scopeTitle") }}
      </h2>
      <ul class="muted whitepaper-list">
        <li>{{ t("about.scope1") }}</li>
        <li>{{ t("about.scope2") }}</li>
        <li>{{ t("about.scope3") }}</li>
        <li>{{ t("about.scope4") }}</li>
        <li>{{ t("about.scope5") }}</li>
      </ul>
    </section>

    <section class="card stack whitepaper-section whitepaper-section--tokenomics">
      <h2 class="whitepaper-title">
        <span class="whitepaper-title__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/><path d="M9.5 9.5c0-1.1.9-2 2-2h1c1.1 0 2 .9 2 2 0 1.1-.9 2-2 2h-1c-1.1 0-2 .9-2 2s.9 2 2 2h1c1.1 0 2-.9 2-2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M12 6v12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        </span>
        {{ t("about.tokenomicsTitle") }}
      </h2>
      <ul class="muted whitepaper-list">
        <li>{{ t("about.tokenomics1") }}</li>
        <li>{{ t("about.tokenomics2") }}</li>
        <li>{{ t("about.tokenomics3") }}</li>
        <li>{{ t("about.tokenomics4") }}</li>
        <li>{{ t("about.tokenomics4b") }}</li>
        <li>{{ t("about.tokenomics5", { rate: exchangeRate }) }}</li>
      </ul>
    </section>

    <section class="card stack whitepaper-section whitepaper-section--usage">
      <h2 class="whitepaper-title">
        <span class="whitepaper-title__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none"><path d="M12 8v8M8 12h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/><path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a2 2 0 0 1-4 0v-.2a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a2 2 0 0 1 0-4h.2a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1 1 0 0 0 1.1.2h.1a1 1 0 0 0 .6-.9V4a2 2 0 1 1 4 0v.2a1 1 0 0 0 .6.9h.1a1 1 0 0 0 1.1-.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1 1 0 0 0-.2 1.1v.1a1 1 0 0 0 .9.6H20a2 2 0 1 1 0 4h-.2a1 1 0 0 0-.9.6z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>
        </span>
        {{ t("about.usageTitle") }}
      </h2>
      <p class="muted whitepaper-usage__lead">{{ t("about.usageLead") }}</p>

      <div class="whitepaper-usage">
        <div class="whitepaper-usage__row is-lose">
          <strong class="whitepaper-usage__tag">{{ t("about.usageLose") }}</strong>
          <span class="whitepaper-usage__arrow">-&gt;</span>
          <span>{{ t("about.usageLoseAction") }}</span>
        </div>

        <div class="whitepaper-usage__row is-win">
          <strong class="whitepaper-usage__tag">{{ t("about.usageWin") }}</strong>
          <span class="whitepaper-usage__arrow">-&gt;</span>
          <span>{{ t("about.usageWinAction") }}</span>
        </div>
      </div>
      <p class="muted">{{ t("about.usageNote") }}</p>
    </section>

    <section class="card stack whitepaper-section whitepaper-section--disclaimer">
      <h2 class="whitepaper-title">
        <span class="whitepaper-title__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none"><path d="M12 3l9 16H3L12 3z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12 9v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="16.5" r="1" fill="currentColor"/></svg>
        </span>
        {{ t("about.disclaimerTitle") }}
      </h2>
      <p class="muted">{{ t("about.disclaimerBody") }}</p>
    </section>

    <section class="card stack whitepaper-section whitepaper-section--security">
      <h2 class="whitepaper-title">
        <span class="whitepaper-title__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none"><path d="M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6l7-3z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </span>
        {{ t("about.securityTitle") }}
      </h2>
      <p class="muted">{{ t("about.securityBody") }}</p>
    </section>

    <section class="card stack whitepaper-section whitepaper-section--outcome">
      <h2 class="whitepaper-title">
        <span class="whitepaper-title__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none"><path d="M7 12l3 3 7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/></svg>
        </span>
        {{ t("about.outcomeTitle") }}
      </h2>
      <p class="muted">{{ t("about.outcomeBody") }}</p>
      <p class="whitepaper-final-note">{{ t("about.finalNote") }}</p>
    </section>
  </div>
</template>
