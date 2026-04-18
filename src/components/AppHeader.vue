<script setup lang="ts">
import { useTranslation } from 'i18next-vue';
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useTimerboard } from '../composables/useTimerboard';
import { changeLanguage, type SupportedLanguage } from '../i18n';
import type { TimerView } from '../types/timer';

defineProps<{
  currentView: TimerView;
  clock: string;
}>();

const emit = defineEmits<{
  openImport: [];
  setView: [view: TimerView];
  toggleTheme: [];
}>();

const router = useRouter();
const store = useTimerboard();
const { i18next, t } = useTranslation();

const showApiRefresh = computed(() => store.hasApi && !store.hasSse);
const nextRefreshMs = computed(() => {
  if (!store.lastFetchMs || !store.pollMs) return 0;
  const elapsed = store.nowMs - (store.lastFetchMs || 0);
  const remaining = Math.max(0, store.pollMs - elapsed);
  return remaining;
});

function formatMs(ms: number) {
  const s = Math.ceil(ms / 1000);
  if (s >= 60)
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  return `${s}s`;
}

const selectedLanguage = computed(() =>
  i18next.language?.startsWith('zh') ? 'zh' : 'en',
);

const views: Array<{ id: TimerView; labelKey: string; titleKey: string }> = [
  {
    id: 'summary',
    labelKey: 'header.views.summary',
    titleKey: 'header.viewTitles.summary',
  },
  {
    id: 'table',
    labelKey: 'header.views.table',
    titleKey: 'header.viewTitles.table',
  },
  {
    id: 'dense',
    labelKey: 'header.views.dense',
    titleKey: 'header.viewTitles.dense',
  },
  {
    id: 'gantt',
    labelKey: 'header.views.gantt',
    titleKey: 'header.viewTitles.gantt',
  },
  {
    id: 'map',
    labelKey: 'header.views.map',
    titleKey: 'header.viewTitles.map',
  },
];

function onLanguageChange(event: Event) {
  void changeLanguage(
    (event.target as HTMLSelectElement).value as SupportedLanguage,
  );
}

void emit;
void router;
void t;
void showApiRefresh;
void nextRefreshMs;
void formatMs;
void selectedLanguage;
void views;
void onLanguageChange;
</script>

<template>
  <header class="header">
    <div class="header-left">
      <button class="brand-btn" :title="t('header.backToTable')" @click="emit('setView', 'table')">
        <img src="/favicon.png" class="brand-logo" alt="WInterCo. logo" />
        <span class="brand-copy">
          <span class="title">{{ t('app.title') }}</span>
        </span>
      </button>
      <div class="clock-box">
        <div class="live-clock">{{ clock }}</div>
        <div class="clock-label">{{ t('header.eveTime') }}</div>
      </div>
    </div>

    <nav class="header-nav" :aria-label="t('header.navLabel')">
      <button
        v-for="view in views"
        :key="view.id"
        class="tool-btn view-btn"
        :class="{ active: currentView === view.id }"
        :title="t(view.titleKey)"
        @click="() => router.push({ name: view.id })"
      >
        {{ t(view.labelKey) }}
      </button>
    </nav>

    <div class="header-actions">
      <select class="language-select" :aria-label="t('header.language')" :value="selectedLanguage" @change="onLanguageChange">
        <option value="en">EN</option>
        <option value="zh">中文</option>
      </select>
      <button v-if="showApiRefresh" class="tool-btn" @click="store.manualRefresh()">
        {{ t('header.refresh', { time: formatMs(nextRefreshMs) }) }}
      </button>
      <button v-if="!store.disablePaste" class="tool-btn" :title="t('header.pasteTimersTitle')" @click="emit('openImport')">
        {{ t('header.pasteTimers') }}
      </button>
      <button class="tool-btn" @click="emit('toggleTheme')">{{ t('header.theme') }}</button>
    </div>
  </header>
</template>

<style scoped>
.header {
  display: grid;
  grid-template-columns: minmax(190px, auto) 1fr auto;
  align-items: center;
  margin-bottom: 14px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-mid);
  gap: 12px;
}

.header-left,
.header-nav,
.header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.header-left {
  gap: 2rem;
}

.header-nav {
  justify-content: center;
  flex-wrap: wrap;
}

.header-actions {
  justify-content: flex-end;
  flex-wrap: wrap;
}

.brand-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: none;
  border: 0;
  color: inherit;
  font: inherit;
  cursor: pointer;
  padding: 3px 4px;
  margin: -3px -4px;
  border-radius: 4px;
  text-align: left;
}

.brand-btn:hover {
  background: var(--bg-hover);
}

.brand-logo {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  flex: 0 0 auto;
  box-shadow: 0 0 0 1px var(--border);
}

.brand-copy {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}

.title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-1);
}

.clock-box {
  min-width: 74px;
  text-align: right;
}

.live-clock {
  font-family: var(--font-mono);
  font-size: 16px;
  font-weight: 500;
  color: var(--text-2);
}

.clock-label {
  font-size: 12px;
  color: var(--text-3);
}

.view-btn {
  font-size: 13px;
  position: relative;
  padding-left: 12px;
}

.view-btn.active {
  border-color: var(--green);
  color: var(--text-1);
  background: rgba(61, 158, 106, 0.16);
  box-shadow: inset 3px 0 0 var(--green);
}

.view-btn.active::before {
  content: '';
  width: 3px;
  height: 13px;
  border-radius: 2px;
  background: var(--green);
  flex: 0 0 auto;
}

.language-select {
  height: 27px;
  border: 1px solid var(--border);
  border-radius: 3px;
  background: var(--bg-surface);
  color: var(--text-2);
  font: inherit;
  font-size: 11px;
  padding: 3px 7px;
}

@media (max-width: 980px) {
  .header {
    grid-template-columns: 1fr;
  }

  .header-nav,
  .header-actions {
    justify-content: flex-start;
  }
}

/* Mobile: place brand on left and clock on right on a single row */
@media (max-width: 720px) {
  .header-left {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
  }

  .brand-copy .title {
    font-size: 14px;
  }

  .clock-box {
    text-align: right;
    min-width: auto;
    margin-left: auto;
  }
}

@media (max-width: 720px) {
  .header-nav {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 4px;
  }

  .view-btn {
    justify-content: center;
    padding: 5px 6px;
    font-size: 11px;
  }

  .view-btn.active {
    box-shadow: inset 0 -3px 0 var(--green);
  }

  .view-btn.active::before {
    display: none;
  }
}
</style>
