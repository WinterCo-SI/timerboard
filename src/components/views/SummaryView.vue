<script setup lang="ts">
import { useTranslation } from 'i18next-vue';
import { computed } from 'vue';
import {
  translateRegion,
  translateState,
  translateStructure,
  translateSystem,
} from '../../i18n';
import type { Timer } from '../../types/timer';
import {
  countdown,
  countdownClass,
  formatLocalDayLabel,
  isVisualMajor,
  localBlockLabel,
  localBlockStart,
  localDateKey,
  localTodayDate,
  timerDateTime,
} from '../../utils/timer-utils';

const props = defineProps<{
  timers: Timer[];
  nowMs: number;
}>();

const { t } = useTranslation();

interface SummaryRow {
  date: string;
  region: string;
  blockStart: number;
  timers: Timer[];
}

type SideClass = 'hostile' | 'friendly' | 'mixed';

const SUMMARY_CORE_STRUCTURES = new Set([
  'Keepstar',
  'Sotiyo',
  'Fortizar',
  'IHub',
  'TCU',
  'Skyhook',
  'Orbital Skyhook',
]);

function blockLabel(start: number): string {
  return localBlockLabel(start);
}


function isSummaryCoreTimer(timer: Timer): boolean {
  return SUMMARY_CORE_STRUCTURES.has(timer.structure);
}

function timerSummaryKey(timer: Timer): string {
  return `${localDateKey(timer)}|${localBlockStart(timer)}|${timer.region || 'Unknown'}`;
}

function countBy(
  timers: Timer[],
  field: 'structure' | 'state',
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const timer of timers) {
    const key = timer[field] || 'Unknown';
    out[key] = (out[key] ?? 0) + 1;
  }
  return out;
}

function sortedCounts(
  timers: Timer[],
  field: 'structure' | 'state',
): Array<{ name: string; count: number }> {
  const counts = countBy(timers, field);
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function structuresText(timers: Timer[]): string {
  return sortedCounts(timers, 'structure')
    .map(({ name, count }) => `${count} ${translateStructure(name)}`)
    .join(', ');
}

function statesText(timers: Timer[]): string {
  return sortedCounts(timers, 'state')
    .map(({ name, count }) => `${count} ${translateState(name)}`)
    .join(', ');
}

function sideClassFor(timers: Timer[]): SideClass {
  const hostile = timers.filter((timer) => timer.status === 'Hostile').length;
  const friendly = timers.filter((timer) => timer.status === 'Friendly').length;
  if (hostile && friendly) return 'mixed';
  return hostile ? 'hostile' : 'friendly';
}

function uniqueSystemsText(timers: Timer[]): string {
  const systems = Array.from(new Set(timers.map((timer) => timer.system)));
  const head = systems
    .slice(0, 8)
    .map((system) => translateSystem(system))
    .join(', ');
  const extra = Math.max(0, systems.length - 8);
  return `${head}${extra ? `, ${t('summary.more', { count: extra })}` : ''}`;
}

function firstMs(timers: Timer[]): number {
  const sorted = [...timers].sort(
    (a, b) => timerDateTime(a).getTime() - timerDateTime(b).getTime(),
  );
  return timerDateTime(sorted[0]!).getTime();
}

const rows = computed<SummaryRow[]>(() => {
  const upcoming = props.timers.filter(
    (timer) => timerDateTime(timer).getTime() > props.nowMs,
  );
  const clusters: Record<string, Timer[]> = {};
  for (const timer of upcoming) {
    const key = timerSummaryKey(timer);
    if (!clusters[key]) clusters[key] = [];
    clusters[key].push(timer);
  }

  const rowsByKey: Record<string, SummaryRow> = {};
  for (const timer of upcoming) {
    const key = timerSummaryKey(timer);
    const clusterSize = clusters[key]?.length ?? 0;
    if (!isSummaryCoreTimer(timer) && clusterSize < 2) continue;

    const region = timer.region || 'Unknown';
    const rowKey = `${localDateKey(timer)}|${localBlockStart(timer)}|${region}`;
    if (!rowsByKey[rowKey]) {
      rowsByKey[rowKey] = {
        date: localDateKey(timer),
        blockStart: localBlockStart(timer),
        region,
        timers: [],
      };
    }
    rowsByKey[rowKey].timers.push(timer);
  }

  return Object.values(rowsByKey).sort((a, b) => {
    const ah = a.timers.filter((timer) => timer.status === 'Hostile').length;
    const bh = b.timers.filter((timer) => timer.status === 'Hostile').length;
    return (
      a.date.localeCompare(b.date) ||
      a.blockStart - b.blockStart ||
      bh - ah ||
      b.timers.length - a.timers.length ||
      a.region.localeCompare(b.region)
    );
  });
});

const dayKeys = computed(() =>
  Array.from(new Set(rows.value.map((row) => row.date))).sort(),
);
const today = computed(() => localTodayDate(new Date(props.nowMs)));

const summaryMeta = computed(() => {
  const keyTimers = rows.value.reduce((sum, row) => sum + row.timers.length, 0);
  const regions = new Set(rows.value.map((row) => row.region)).size;
  return {
    keyTimers,
    blocks: rows.value.length,
    regions,
  };
});

const rowsByDate = computed<Record<string, SummaryRow[]>>(() => {
  const out: Record<string, SummaryRow[]> = {};
  for (const row of rows.value) {
    if (!out[row.date]) out[row.date] = [];
    out[row.date].push(row);
  }
  return out;
});
</script>

<template>
  <div class="view-summary active-view">
    <div class="summary-head">
      <div>
        <div class="summary-title">{{ t('summary.title') }}</div>
        <div class="summary-subtitle">{{ t('summary.subtitle') }}</div>
      </div>
      <div class="summary-meta">
        <span class="summary-chip">{{ t('summary.keyTimers', { count: summaryMeta.keyTimers }) }}</span>
        <span class="summary-chip">{{ t('summary.timeBlock', { count: summaryMeta.blocks }) }}</span>
        <span class="summary-chip">{{ t('summary.region', { count: summaryMeta.regions }) }}</span>
      </div>
    </div>

    <div v-if="!rows.length" class="summary-empty">{{ t('summary.empty') }}</div>

    <div v-for="date in dayKeys" :key="date" class="summary-day">
      <div class="summary-day-head" :class="{ today: date === today }">
        <span>{{ formatLocalDayLabel(date, new Date(nowMs)) }}</span>
        <span class="summary-day-line" />
        <span>{{ t('table.timerCount', { count: (rowsByDate[date] ?? []).reduce((sum, row) => sum + row.timers.length, 0) }) }}</span>
      </div>

      <section
        v-for="row in rowsByDate[date] ?? []"
        :key="`${row.date}-${row.region}-${row.blockStart}`"
        class="summary-block"
        :class="[
          sideClassFor(row.timers),
          { major: row.timers.some((timer) => isVisualMajor(timer)) },
          { urgent: firstMs(row.timers) - nowMs < 2 * 3600 * 1000 },
        ]"
      >
        <div class="summary-block-head">
          <div class="summary-window-wrap">
            <div class="summary-window">{{ blockLabel(row.blockStart) }}</div>
            <div class="summary-kicker">{{ firstMs(row.timers) - nowMs < 6 * 3600 * 1000 ? t('summary.soonestPressure') : t('common.timeBlock') }}</div>
          </div>
          <div>
            <div class="summary-region">{{ translateRegion(row.region) }}</div>
            <div class="summary-region-meta">
              <span class="summary-priority" :class="sideClassFor(row.timers)">{{ t(`common.${sideClassFor(row.timers)}`) }}</span>
              <span v-if="row.timers.some((timer) => isVisualMajor(timer))" class="summary-priority major">{{ t('common.major') }}</span>
              <span v-if="firstMs(row.timers) - nowMs < 2 * 3600 * 1000" class="summary-priority urgent">0-2h</span>
            </div>
          </div>
          <div class="summary-counts">
            <span class="summary-count">{{ t('table.timerCount', { count: row.timers.length }) }}</span>
            <span class="summary-count hostile">{{ t('summary.hostileShort', { count: row.timers.filter((timer) => timer.status === 'Hostile').length }) }}</span>
            <span class="summary-count friendly">{{ t('summary.friendlyShort', { count: row.timers.filter((timer) => timer.status === 'Friendly').length }) }}</span>
          </div>
        </div>
        <div class="summary-body">
          <div class="summary-lead">{{ t('summary.lead', { structures: structuresText(row.timers), region: translateRegion(row.region) }) }}</div>
          <div class="summary-structure-chips">
            <span
              v-for="item in sortedCounts(row.timers, 'structure')"
              :key="`${row.date}-${row.region}-${row.blockStart}-${item.name}`"
              class="summary-struct-chip"
              :class="{ major: SUMMARY_CORE_STRUCTURES.has(item.name) && ['Keepstar', 'Sotiyo', 'Fortizar'].includes(item.name) }"
            >
              {{ item.count }} {{ translateStructure(item.name) }}
            </span>
          </div>
          <div class="summary-detail">
            <span>{{ t('summary.systems') }} <span class="summary-systems">{{ uniqueSystemsText(row.timers) || '--' }}</span></span>
            <span>{{ t('summary.states') }} {{ statesText(row.timers) || '--' }}</span>
            <span>
              {{ t('summary.first') }}
              <span class="summary-eta countdown" :class="countdownClass(firstMs(row.timers) - nowMs)">
                {{ countdown(firstMs(row.timers) - nowMs) }}
              </span>
            </span>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.summary-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border);
}

.summary-title {
  font-size: 16px;
  font-weight: 700;
}

.summary-subtitle {
  font-size: 14px;
  color: var(--text-3);
  margin-top: 3px;
  line-height: 1.35;
}

.summary-meta {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.summary-chip {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 3px;
  padding: 5px 8px;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-2);
  white-space: nowrap;
}

.summary-empty {
  padding: 36px 12px;
  text-align: center;
  color: var(--text-3);
  font-size: 12px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 3px;
}

.summary-day {
  margin-bottom: 18px;
}

.summary-day-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 7px;
  color: var(--text-2);
  font-size: 14px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.summary-day-head.today {
  color: var(--amber);
}

.summary-day-line {
  height: 1px;
  background: var(--border);
  flex: 1;
}

.summary-block {
  position: relative;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-left: 6px solid var(--border-mid);
  border-radius: 6px;
  margin-bottom: 9px;
  overflow: hidden;
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.1);
}

.summary-block.hostile {
  border-left-color: var(--red);
  background: rgba(192, 64, 74, 0.1);
}

.summary-block.mixed {
  border-left-color: var(--amber);
  background: linear-gradient(90deg, rgba(192, 64, 74, 0.12), rgba(61, 158, 106, 0.06));
}

.summary-block.friendly {
  border-left-color: var(--green);
  background: rgba(61, 158, 106, 0.07);
}

.summary-block.major {
  box-shadow: inset 0 0 0 1px rgba(255, 209, 102, 0.16), 0 8px 22px rgba(0, 0, 0, 0.12);
}

.summary-block.urgent {
  border-color: rgba(192, 64, 74, 0.75);
}

.summary-block-head {
  display: grid;
  grid-template-columns: 120px minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  padding: 10px 12px;
  background: rgba(0, 0, 0, 0.1);
  border-bottom: 1px solid var(--border);
}

.summary-window-wrap {
  display: grid;
  gap: 2px;
}

.summary-window {
  font-family: var(--font-mono);
  font-size: 16px;
  font-weight: 800;
  color: var(--text-1);
  white-space: nowrap;
}

.summary-kicker {
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--text-3);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.summary-region {
  font-size: 16px;
  font-weight: 800;
  color: var(--text-1);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.summary-region-meta {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
  margin-top: 3px;
}

.summary-priority {
  font-size: 14px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-1);
  border-radius: 3px;
  padding: 1px 5px;
  background: var(--bg);
  border: 1px solid var(--border);
}

.summary-priority.hostile {
  color: var(--red);
  border-color: rgba(192, 64, 74, 0.55);
  background: rgba(192, 64, 74, 0.1);
}

.summary-priority.mixed {
  color: var(--amber);
  border-color: rgba(176, 122, 32, 0.55);
  background: rgba(176, 122, 32, 0.1);
}

.summary-priority.friendly {
  color: var(--green);
  border-color: rgba(61, 158, 106, 0.55);
  background: rgba(61, 158, 106, 0.1);
}

.summary-priority.major {
  color: #ffd166;
  border-color: rgba(255, 209, 102, 0.55);
  background: rgba(255, 209, 102, 0.12);
}

.summary-priority.urgent {
  color: var(--red);
  border-color: rgba(192, 64, 74, 0.75);
  background: rgba(192, 64, 74, 0.16);
}

.summary-counts {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.summary-count {
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 700;
  color: var(--text-2);
  border: 1px solid var(--border);
  border-radius: 3px;
  padding: 3px 6px;
  background: var(--bg);
}

.summary-count.hostile {
  color: var(--red);
}

.summary-count.friendly {
  color: var(--green);
}

.summary-body {
  padding: 10px 12px;
}

.summary-lead {
  font-size: 14px;
  color: var(--text-1);
  line-height: 1.35;
  margin-bottom: 8px;
  font-weight: 700;
}

.summary-structure-chips {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.summary-struct-chip {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-2);
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 3px 7px;
}

.summary-struct-chip.major {
  color: #ffd166;
  border-color: rgba(255, 209, 102, 0.55);
  background: rgba(255, 209, 102, 0.12);
}

.summary-detail {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  font-size: 12px;
  color: var(--text-3);
  line-height: 1.35;
}

.summary-detail span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.summary-systems {
  font-family: var(--font-mono);
  color: var(--text-2);
}

.summary-eta {
  font-family: var(--font-mono);
  color: var(--amber);
}

@media (max-width: 760px) {
  .summary-block-head {
    grid-template-columns: 1fr;
    gap: 5px;
  }

  .summary-counts {
    justify-content: flex-start;
  }
}
</style>
