<script setup lang="ts">
import type { Timer } from '../../types/timer';
import {
  countdown,
  countdownClass,
  formatLocalDayLabel,
  isVisualMajor,
  localTimeLabel,
  localTimeOfDayClass,
  localTimeZoneLabel,
  stateKey,
  timerDateTime,
} from '../../utils/timer-utils';

defineProps<{
  groups: Record<string, Timer[]>;
  dates: string[];
  today: string;
  nowMs: number;
}>();
</script>

<template>
  <div class="view-dense active-view">
    <section v-for="date in dates" :key="date" class="dense-day">
      <div class="dense-section-header" :class="{ today: date === today }">
        <span>{{ formatLocalDayLabel(date, new Date(nowMs)) }}</span>
        <span class="dsh-count">{{ groups[date]?.length ?? 0 }} timers</span>
      </div>
      <div class="dense-grid">
        <article
          v-for="timer in groups[date]"
          :key="`${timer.date}-${timer.time}-${timer.system}`"
          class="dense-card"
          :class="[
            localTimeOfDayClass(timer),
            { major: isVisualMajor(timer), hostile: timer.status === 'Hostile', elapsed: timerDateTime(timer).getTime() <= nowMs },
          ]"
          :title="`${timer.system} · ${timer.name}\n${timer.structure} · ${timer.state}`"
        >
          <div class="dense-card-top">
            <div class="dense-card-prime">
              <span class="dense-time">{{ localTimeLabel(timer) }} {{ localTimeZoneLabel(timer) }}</span>
              <span class="dense-system">{{ timer.system }}</span>
            </div>
            <div class="dense-card-side">
              <span class="dense-star">{{ isVisualMajor(timer) ? '★' : '' }}</span>
              <span
                class="dense-owner"
                :class="timer.status === 'Friendly' ? 'ours' : 'theirs'"
                :title="timer.owner ? `Owner: ${timer.owner}` : (timer.status || '')"
              >
              </span>
              <span class="dense-cd" :class="countdownClass(timerDateTime(timer).getTime() - nowMs)">
                {{ timerDateTime(timer).getTime() <= nowMs ? 'elapsed' : countdown(timerDateTime(timer).getTime() - nowMs) }}
              </span>
            </div>
          </div>

          <div class="dense-card-main">
            <div class="dense-badges">
              <span class="dense-struct">{{ timer.structure }}</span>
              <span class="dense-state" :class="stateKey(timer.state)">{{ timer.state }}</span>
            </div>
            <div class="dense-name">{{ timer.name }}</div>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>

<style scoped>
.dense-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 12px;
}

.dense-section-header {
  font-size: 12px;
  color: var(--text-2);
  text-transform: uppercase;
  border-bottom: 1px solid var(--border);
  margin: 14px 0 4px;
  padding-bottom: 5px;
  display: flex;
  justify-content: space-between;
}

.dense-card {
  display: grid;
  gap: 8px;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px 12px;
  min-height: 82px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0)), var(--bg-surface);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
  transition: transform 0.12s ease, border-color 0.12s ease, box-shadow 0.12s ease, background 0.12s ease;
}

.dense-card:hover {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.035), rgba(255, 255, 255, 0.01)), var(--bg-hover);
  border-color: var(--border-mid);
  transform: translateY(-1px);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.16);
}

.dense-card.morning {
  background: linear-gradient(180deg, rgba(59, 105, 180, 0.12), rgba(255, 255, 255, 0)), var(--bg-surface);
}

.dense-card.afternoon {
  background: linear-gradient(180deg, rgba(160, 120, 40, 0.1), rgba(255, 255, 255, 0)), var(--bg-surface);
}

.dense-card.evening {
  background: linear-gradient(180deg, rgba(90, 50, 140, 0.12), rgba(255, 255, 255, 0)), var(--bg-surface);
}

.dense-card.hostile {
  border-color: rgba(192, 64, 74, 0.35);
  background: linear-gradient(180deg, rgba(192, 64, 74, 0.13), rgba(255, 255, 255, 0)), var(--bg-surface);
}

.dense-card.elapsed {
  opacity: 0.42;
}

.dense-card.major {
  border-left: 5px solid #ffd166;
  box-shadow: inset 0 0 0 1px rgba(255, 209, 102, 0.12), 0 10px 24px rgba(0, 0, 0, 0.16);
}

.dense-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.dense-card-prime,
.dense-card-side,
.dense-badges {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.dense-card-main {
  display: grid;
  gap: 6px;
}

.dense-star {
  width: 12px;
  color: #ffd166;
  text-align: center;
  text-shadow: 0 0 8px rgba(255, 209, 102, 0.45);
}

.dense-owner {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.dense-owner.ours {
  background: var(--green);
}

.dense-owner.theirs {
  background: var(--red);
}

.dense-time {
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 800;
  color: var(--text-1);
  white-space: nowrap;
}

.dense-card.major .dense-time {
  color: #ffd166;
}

.dense-system {
  font-size: 14px;
  font-weight: 800;
  color: var(--blue);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Ensure consistent vertical alignment between time and system (fixes small offset in today's section) */
.dense-time,
.dense-system {
  display: inline-flex;
  align-items: center;
  line-height: 1;
  vertical-align: middle;
}

.dense-struct,
.dense-state {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 3px 8px;
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;
}

.dense-struct {
  color: var(--text-1);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border);
}

.dense-card.major .dense-struct {
  color: #ffd166;
  border-color: rgba(255, 209, 102, 0.45);
  background: rgba(255, 209, 102, 0.12);
}

.dense-state.final {
  color: var(--green);
  background: rgba(61, 158, 106, 0.12);
  border: 1px solid rgba(61, 158, 106, 0.28);
}

.dense-state.armor {
  color: var(--amber);
  background: rgba(176, 122, 32, 0.12);
  border: 1px solid rgba(176, 122, 32, 0.28);
}

.dense-state.anchor {
  color: var(--yellow);
  background: rgba(154, 138, 48, 0.12);
  border: 1px solid rgba(154, 138, 48, 0.28);
}

.dense-state.hull {
  color: var(--red);
  background: rgba(192, 64, 74, 0.12);
  border: 1px solid rgba(192, 64, 74, 0.28);
}

.dense-name {
  font-size: 11px;
  color: var(--text-3);
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.dense-cd {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-3);
  white-space: nowrap;
}

@media (max-width: 820px) {
  .dense-grid {
    grid-template-columns: 1fr;
  }
}
</style>
