<script setup lang="ts">
import { useTranslation } from 'i18next-vue';
import { computed } from 'vue';
import {
  translateStatus,
  translateStructure,
  translateSystem,
} from '../../i18n';
import type { Timer } from '../../types/timer';
import {
  eveTimeContext,
  formatLocalDayLabel,
  isVisualMajor,
  localDayProgressPercent,
  localTimeLabel,
  localTimelinePercent,
  localTimeZoneLabel,
  timerDateTime,
} from '../../utils/timer-utils';

const props = defineProps<{
  groups: Record<string, Timer[]>;
  dates: string[];
  today: string;
  nowMs: number;
}>();

const { t } = useTranslation();

const ownersByDate = computed(() => {
  const map: Record<string, string[]> = {};
  for (const date of props.dates) {
    const timers = props.groups[date] || [];
    const owners = Array.from(
      new Set(timers.map((t) => (t as any).owner).filter(Boolean)),
    );
    if (owners.length) map[date] = owners;
  }
  return map;
});

const HOURS = 24;
const PX_PER_HOUR = 100;
const TOTAL_WIDTH = HOURS * PX_PER_HOUR;
const HOUR_LABELS = Array.from({ length: HOURS }, (_, hour) => hour);

function elapsedWidthForNow(ms: number): number {
  return (localDayProgressPercent(new Date(ms)) / 100) * TOTAL_WIDTH;
}

function leftForTimer(timer: Timer): number {
  return (localTimelinePercent(timer) / 100) * TOTAL_WIDTH;
}
</script>

<template>
  <div class="view-gantt active-view">
    <div class="tl-legend">
      <span class="tl-legend-item"><span class="tl-legend-swatch ours" /> {{ t('common.friendly') }}</span>
      <span class="tl-legend-item"><span class="tl-legend-swatch theirs" /> {{ t('common.hostile') }}</span>
      <span class="tl-legend-item"><span class="tl-legend-swatch major" /> ★ {{ t('common.major') }}</span>
      <span class="tl-legend-hint">{{ t('gantt.scrollHint') }}</span>
    </div>

    <section v-for="date in dates" :key="date" class="tl-section">
      <div class="tl-section-header" :class="{ today: date === today }">
        {{ formatLocalDayLabel(date, new Date(nowMs)) }}
        <span class="dsh-count">{{ t('table.timerCount', { count: groups[date]?.length ?? 0 }) }}</span>
        <template v-if="ownersByDate[date] && ownersByDate[date].length">
          <span class="dsh-owners"> — {{ ownersByDate[date].join(', ') }}</span>
        </template>
      </div>
      <div class="tl-scroll">
        <div class="tl-inner" :style="{ width: `${TOTAL_WIDTH}px` }">
          <div class="tl-axis">
            <div v-for="hour in HOUR_LABELS" :key="hour" class="tl-axis-hour" :style="{ width: `${PX_PER_HOUR}px`, flex: 'none' }">
              {{ String(hour).padStart(2, '0') }}:00
            </div>
          </div>

          <div
            v-if="date === today"
            class="tl-elapsed-overlay"
            :style="{ width: `${elapsedWidthForNow(nowMs)}px` }"
          />
          <div
            v-if="date === today"
            class="tl-now-line"
            :style="{ left: `${elapsedWidthForNow(nowMs)}px` }"
          />
          <div
            v-if="date === today"
            class="tl-now-time"
            :style="{ left: `${elapsedWidthForNow(nowMs)}px` }"
          >
            {{ localTimeLabel(new Date(nowMs)) }}
          </div>

          <div class="tl-rows">
            <div
              v-for="timer in groups[date]"
              :key="`${timer.date}-${timer.time}-${timer.system}-${timer.name}`"
              class="tl-row"
              :class="{ hostile: timer.status === 'Hostile', elapsed: timerDateTime(timer).getTime() <= nowMs }"
            >
              <div
                v-for="hour in HOUR_LABELS"
                :key="`${timer.date}-${timer.time}-${timer.system}-grid-${hour}`"
                class="tl-gridline"
                :class="{ 'major-hour': hour % 6 === 0 }"
                :style="{ left: `${hour * PX_PER_HOUR}px` }"
              />

              <div
                class="tl-pill"
                :class="{ major: isVisualMajor(timer), ours: timer.status === 'Friendly', theirs: timer.status === 'Hostile' }"
                :style="{ left: `${leftForTimer(timer)}px` }"
                :title="`${localTimeLabel(timer)} ${localTimeZoneLabel(timer)} - ${eveTimeContext(timer)} - ${translateSystem(timer.system)} - ${timer.name} (${translateStructure(timer.structure)}) - ${translateStatus(timer.status)}`"
              >
                <span class="tl-pill-text">
                  {{ isVisualMajor(timer) ? `${t('common.major')} ` : '' }}{{ localTimeLabel(timer) }} {{ localTimeZoneLabel(timer) }} - {{ translateSystem(timer.system) }} - {{ timer.name }} - {{ eveTimeContext(timer) }}
                  <template v-if="(timer as any).owner"> ({{ (timer as any).owner }})</template>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.tl-scroll {
  overflow-x: auto;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 3px;
  border-top: none;
  border-top-left-radius: 0;
  border-top-right-radius: 0;
  scrollbar-color: var(--border-mid) var(--bg-header);
  scrollbar-width: thin;
}

.tl-scroll::-webkit-scrollbar {
  height: 12px;
}

.tl-scroll::-webkit-scrollbar-track {
  background: var(--bg-header);
  border-top: 1px solid var(--border);
}

.tl-scroll::-webkit-scrollbar-thumb {
  background: var(--border-mid);
  border: 2px solid var(--bg-header);
  border-radius: 8px;
}

.tl-scroll::-webkit-scrollbar-thumb:hover {
  background: var(--blue);
}

.tl-legend {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 10px;
  padding: 10px 12px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 3px;
  font-size: 12px;
  color: var(--text-3);
}

.tl-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.tl-legend-swatch {
  width: 14px;
  height: 10px;
  border-radius: 2px;
  border: 1px solid var(--border-mid);
}

.tl-legend-swatch.ours {
  background: rgba(61, 158, 106, 0.18);
  border-color: rgba(61, 158, 106, 0.5);
}

.tl-legend-swatch.theirs {
  background: rgba(192, 64, 74, 0.18);
  border-color: rgba(192, 64, 74, 0.5);
}

.tl-legend-swatch.major {
  background: rgba(255, 209, 102, 0.24);
  border-color: rgba(255, 209, 102, 0.78);
}

.tl-legend-hint {
  margin-left: auto;
  font-family: var(--font-mono);
  font-size: 12px;
}

.tl-section {
  margin-bottom: 25px;
}

.tl-section-header {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-2);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  padding: 6px 0 8px;
  margin-bottom: 0;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  gap: 10px;
}

.tl-section-header .dsh-count {
  font-size: 12px;
  color: var(--text-3);
  font-weight: 400;
  font-family: var(--font-mono);
}

.tl-section-header.today {
  color: var(--amber);
}

.tl-inner {
  position: relative;
  min-width: 1440px;
}

.tl-axis {
  position: sticky;
  top: 0;
  z-index: 10;
  height: 22px;
  background: var(--bg-header);
  border-bottom: 2px solid var(--border-mid);
  display: flex;
}

.tl-axis-hour {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-3);
  border-right: 1px solid var(--border);
  padding-left: 6px;
  display: flex;
  align-items: center;
}

.tl-elapsed-overlay {
  position: absolute;
  top: 28px;
  bottom: 0;
  left: 0;
  background: rgba(58, 112, 176, 0.08);
  pointer-events: none;
  z-index: 1;
}

.tl-now-line {
  position: absolute;
  top: 28px;
  bottom: 0;
  width: 1px;
  background: var(--blue);
  pointer-events: none;
  z-index: 12;
}

.tl-now-time {
  position: absolute;
  top: 1px;
  transform: translateX(-50%);
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--blue);
  background: var(--bg-surface);
  border: 1px solid var(--blue);
  border-radius: 3px;
  padding: 0 6px;
  z-index: 22;
  pointer-events: none;
}

.tl-row {
  position: relative;
  height: 36px;
  border-bottom: 1px solid var(--border);
  overflow: hidden;
}

.tl-row.hostile {
  background: rgba(150, 45, 50, 0.05);
}

.tl-pill {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  height: 24px;
  border-radius: 3px;
  border: 1px solid;
  display: flex;
  align-items: center;
  padding: 0 8px;
  font-size: 12px;
  background: rgba(61, 158, 106, 0.18);
  border-color: rgba(61, 158, 106, 0.5);
  z-index: 6;
  max-width: 270px;
  overflow: hidden;
}

.tl-pill-text {
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tl-gridline {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: rgba(129, 145, 171, 0.18);
  z-index: 2;
  pointer-events: none;
}

.tl-gridline.major-hour {
  background: rgba(129, 145, 171, 0.3);
}

.tl-pill.theirs {
  background: rgba(192, 64, 74, 0.18);
  border-color: rgba(192, 64, 74, 0.5);
}

.tl-pill.major {
  background: rgba(255, 209, 102, 0.24);
  border-color: rgba(255, 209, 102, 0.78);
}
</style>
