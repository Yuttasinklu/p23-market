<script setup lang="ts">
import { useMMarket } from "~/composables/useMMarket";
import { useLocale } from "~/composables/useLocale";

const { exchangeRate } = useMMarket()
const { t } = useLocale()
</script>

<template>
  <div class="stack">
    <section class="card stack">
      <p class="pill">White Paper</p>
      <h1 class="title">{{ t("about.title") }}</h1>
      <p class="muted">{{ t("about.subtitle") }}</p>
    </section>

    <section class="card stack">
      <h2>{{ t("about.problemTitle") }}</h2>
      <p class="muted">{{ t("about.problemBody") }}</p>
    </section>

    <section class="card stack">
      <h2>{{ t("about.whyTitle") }}</h2>
      <p class="muted">{{ t("about.whyBody") }}</p>
    </section>

    <section class="card stack">
      <h2>{{ t("about.principlesTitle") }}</h2>
      <ul class="muted" style="margin: 0; padding-left: 1.1rem;">
        <li>{{ t("about.principles1") }}</li>
        <li>{{ t("about.principles2") }}</li>
        <li>{{ t("about.principles3") }}</li>
        <li>{{ t("about.principles4") }}</li>
      </ul>
    </section>

    <section class="card stack">
      <h2>{{ t("about.scopeTitle") }}</h2>
      <ul class="muted" style="margin: 0; padding-left: 1.1rem;">
        <li>{{ t("about.scope1") }}</li>
        <li>{{ t("about.scope2") }}</li>
        <li>{{ t("about.scope3") }}</li>
        <li>{{ t("about.scope4") }}</li>
        <li>{{ t("about.scope5") }}</li>
      </ul>
    </section>

    <section class="card stack">
      <h2>{{ t("about.currencyTitle") }}</h2>
      <p class="value value--coin">
        1<img src="/images/m-coin.svg" alt="coin" class="coin-unit" /> = {{ exchangeRate }} THB
      </p>
      <p class="muted">{{ t("about.currencyHint") }}</p>
    </section>

    <section class="card stack">
      <h2>{{ t("about.disclaimerTitle") }}</h2>
      <p class="muted">{{ t("about.disclaimerBody") }}</p>
    </section>

    <section class="card stack">
      <h2>{{ t("about.securityTitle") }}</h2>
      <p class="muted">{{ t("about.securityBody") }}</p>
    </section>

    <section class="card stack">
      <h2>{{ t("about.outcomeTitle") }}</h2>
      <p class="muted">{{ t("about.outcomeBody") }}</p>
    </section>
  </div>
</template>
