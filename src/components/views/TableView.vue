<script setup lang="ts">
import { useTranslation } from 'i18next-vue';
import { computed } from 'vue';
import {
  translateRegion,
  translateState,
  translateStatus,
  translateStructure,
  translateSystem,
} from '../../i18n';
import type { Timer } from '../../types/timer';
import {
  countdown,
  countdownClass,
  eveTimeLabel,
  formatLocalDayLabel,
  isVisualMajor,
  localTimeLabel,
  localTimeOfDayClass,
  localTimeZoneLabel,
  stateKey,
  timerDateTime,
} from '../../utils/timer-utils';

const props = defineProps<{
  groups: Record<string, Timer[]>;
  dates: string[];
  today: string;
  nowMs: number;
  collapsedDates: string[];
}>();

const emit = defineEmits<{
  toggleDay: [date: string];
}>();

const collapsed = computed(() => new Set(props.collapsedDates));
const { t } = useTranslation();

function structureClass(structure: string): string {
  if (structure === 'Keepstar') return 'keepstar';
  if (structure === 'Sotiyo') return 'sotiyo';
  if (structure === 'Fortizar') return 'fortizar';
  return '';
}
</script>

<template>
  <div class="view-table active-view">
    <section v-for="date in dates" :id="`dg-${date}`" :key="date" class="date-group" :class="{ collapsed: collapsed.has(date) }">
      <header class="date-header" @click="emit('toggleDay', date)">
        <span class="date-chevron">▾</span>
        <div class="date-label" :class="{ today: date === today }">{{ formatLocalDayLabel(date, new Date(nowMs)) }}</div>
        <div class="date-line" />
        <div class="date-count">{{ t('table.timerCount', { count: groups[date]?.length ?? 0 }) }}</div>
      </header>

      <div class="date-body">
        <table class="timer-table">
          <thead>
            <tr>
              <th />
              <th>{{ t('table.columns.time') }}</th>
              <th>{{ t('table.columns.region') }}</th>
              <th>{{ t('table.columns.system') }}</th>
              <th class="col-name">{{ t('table.columns.name') }}</th>
              <th>{{ t('table.columns.structure') }}</th>
              <th>{{ t('table.columns.state') }}</th>
              <th>{{ t('table.columns.owner') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="timer in groups[date]"
              :key="`${timer.date}-${timer.time}-${timer.system}-${timer.name}`"
              :class="[
                localTimeOfDayClass(timer),
                { major: isVisualMajor(timer), hostile: timer.status === 'Hostile', elapsed: timerDateTime(timer).getTime() <= nowMs },
              ]"
            >
              <td style="width: 22px; text-align: center"><span class="major-star">{{ isVisualMajor(timer) ? '★' : '' }}</span></td>
              <td style="width: 185px">
                <div class="cell-time-row" style="display:flex;gap:8px;align-items:center;">
                  <div class="cell-time">{{ localTimeLabel(timer) }}</div>
                  <div class="local-time">{{ localTimeZoneLabel(timer) }}</div>
                  <div class="eve-time">{{ eveTimeLabel(timer) }} EVE</div>
                </div>
                <div class="countdown" :class="countdownClass(timerDateTime(timer).getTime() - nowMs)">
                  {{ timerDateTime(timer).getTime() <= nowMs ? '' : countdown(timerDateTime(timer).getTime() - nowMs) }}
                </div>
              </td>
              <td style="width: 100px" class="cell-system">{{ translateRegion(timer.region) }}</td>
              <td style="width: 100px"><span class="cell-system">{{ translateSystem(timer.system) }}</span></td>
              <td class="col-name"><span class="cell-name" :title="timer.name">{{ timer.name || '--' }}</span></td>
              <td>
                  <span class="struct-badge" :class="structureClass(timer.structure)">{{ translateStructure(timer.structure) }}</span>
              </td>
              <td><span class="state-badge" :class="stateKey(timer.state)">{{ translateState(timer.state) }}</span></td>
              <td>
                <span
                  class="status-dot"
                  :class="timer.status === 'Friendly' ? 'ours' : 'theirs'"
                  :title="timer.owner ? `${translateStatus(timer.status)} - ${timer.owner}` : translateStatus(timer.status)"
                >
                  {{ timer.status === 'Friendly' ? t('common.ours') : t('common.theirs') }}
                  <span v-if="timer.owner"> ({{ timer.owner }})</span>
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<style scoped>
.date-group {
  margin-bottom: 18px;
}

.date-header {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  border-radius: 3px;
  padding: 3px 4px;
  margin: 0 -4px 5px;
}

.date-header:hover {
  background: var(--bg-hover);
}

.date-chevron {
  font-size: 12px;
  color: var(--text-3);
  transition: transform 0.18s;
  width: 12px;
  text-align: center;
}

.date-group.collapsed .date-chevron {
  transform: rotate(-90deg);
}

.date-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-2);
  text-transform: uppercase;
}

.date-label.today {
  color: var(--amber);
}

.date-line {
  flex: 1;
  height: 1px;
  background: var(--border);
}

.date-count {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-3);
}

.date-group.collapsed .date-body {
  display: none;
}

.date-body {
  width: 100%;
  overflow-x: auto;
}

.timer-table {
  width: 100%;
  min-width: 760px;
  border-collapse: collapse;
  border: 1px solid var(--border);
  border-radius: 3px;
  overflow: hidden;
}

.timer-table thead th {
  background: var(--bg-header);
  border-bottom: 1px solid var(--border-mid);
  padding: 5px 8px;
  font-size: 14px;
  text-transform: uppercase;
  color: var(--text-3);
  text-align: left;
}

.timer-table tbody tr {
  border-bottom: 1px solid var(--border);
  transition: background 0.1s;
}

.timer-table tbody tr:last-child {
  border-bottom: none;
}

.timer-table tbody tr:hover td {
  background: var(--bg-hover) !important;
}

.timer-table tbody td {
  padding: 6px 8px;
}

tr.morning td {
  background: var(--morning);
}

tr.afternoon td {
  background: var(--afternoon);
}

tr.evening td {
  background: var(--evening);
}

tr.hostile td {
  background: rgba(150, 45, 50, 0.08) !important;
}

tr.hostile:hover td {
  background: rgba(150, 45, 50, 0.14) !important;
}

tr.major td:first-child {
  border-left: 5px solid #f2b84b;
}

tr.major .cell-time {
  color: #ffd166;
  font-weight: 800;
}

tr.major .cell-system {
  font-weight: 800;
  color: var(--text-2);
}

tr.major .cell-name {
  font-weight: 700;
}

tr.elapsed td {
  opacity: 0.38;
}

tr.elapsed .cell-time {
  text-decoration: line-through;
  text-decoration-color: var(--text-3);
}

.cell-name {
  font-size: 14px;
  color: var(--text-1);
  /* max-width: 180px; */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}

.cell-time {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-1);
  white-space: nowrap;
}

.local-time {
  font-size: 12px;
  color: var(--text-1);
  white-space: nowrap;
}

.eve-time {
  color: var(--text-2);
  font-family: var(--font-mono);
  font-size: 11px;
  white-space: nowrap;
}

.countdown {
  font-size: 12px;
  color: var(--text-3);
  margin-top: 1px;
}

.cell-system {
  font-size: 14px;
  color: var(--blue);
  white-space: nowrap;
}
</style>
