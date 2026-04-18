<script setup lang="ts">
import type { TimerView } from '../types/timer';
import { useRouter } from 'vue-router';
import { computed } from 'vue';
import { useTimerboard } from '../composables/useTimerboard';

defineProps<{
  currentView: TimerView;
  clock: string;
}>();

const emit = defineEmits<{
  openImport: [];
  toggleTheme: [];
}>();

const router = useRouter();
const store = useTimerboard();

const showApiRefresh = computed(() => store.hasApi && !store.hasSse);
const nextRefreshMs = computed(() => {
  if (!store.lastFetchMs || !store.pollMs) return 0;
  const elapsed = store.nowMs - (store.lastFetchMs || 0);
  const remaining = Math.max(0, store.pollMs - elapsed);
  return remaining;
});

function formatMs(ms: number) {
  const s = Math.ceil(ms / 1000);
  if (s >= 60) return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  return `${s}s`;
}

const views: Array<{ id: TimerView; label: string; title: string }> = [
  { id: 'summary', label: 'Summary', title: 'Command summary' },
  { id: 'table', label: 'Table', title: 'Table view' },
  { id: 'dense', label: 'Dense', title: 'Dense cards' },
  { id: 'gantt', label: 'Timeline', title: 'Timeline view' },
  { id: 'map', label: 'Map', title: 'Regional pressure map' },
];

void emit;
void views;
</script>

<template>
  <header class="header">
    <div class="header-left">
      <button class="brand-btn" title="Back to table view" @click="emit('setView', 'table')">
        <img src="/favicon.png" class="brand-logo" alt="WInterCo. logo" />
        <span class="brand-copy">
          <span class="title">WinterCo. Timerboard</span>
        </span>
      </button>
      <div class="clock-box">
        <div class="live-clock">{{ clock }}</div>
        <div class="clock-label">EVE Time</div>
      </div>
    </div>

    <nav class="header-nav" aria-label="Timerboard views">
      <button
        v-for="view in views"
        :key="view.id"
        class="tool-btn view-btn"
        :class="{ active: currentView === view.id }"
        :title="view.title"
        @click="() => router.push({ name: view.id })"
      >
        {{ view.label }}
      </button>
    </nav>

    <div class="header-actions">
      <button v-if="showApiRefresh" class="tool-btn" @click="store.manualRefresh()">Refresh ({{ formatMs(nextRefreshMs) }})</button>
      <button v-if="!store.disablePaste" class="tool-btn" title="Paste timers from Discord" @click="emit('openImport')">Paste timers</button>
      <button class="tool-btn" @click="emit('toggleTheme')">Theme</button>
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
