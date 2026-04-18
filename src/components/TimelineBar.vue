<script setup lang="ts">
import { useTranslation } from 'i18next-vue';
import { computed, reactive, ref } from 'vue';
import { useTimerboard } from '../composables/useTimerboard';
import { translateStructure, translateSystem } from '../i18n';

const props = defineProps<{
  progressPercent: number;
  label: string;
  elapsed: number;
  total: number;
  markers: Array<{
    id: string;
    targetMs: number;
    leftPercent: number;
    status: 'Friendly' | 'Hostile';
    elapsed: boolean;
    major: boolean;
    title: string;
    time: string;
    localTimeLabel: string;
    localTimeZoneLabel: string;
    eveTimeLabel: string;
    system: string;
    structure: string;
    name?: string;
    state: string;
    region: string;
    countdown: string;
  }>;
}>();

const tooltipEl = ref<HTMLElement | null>(null);
const store = useTimerboard();
const { t } = useTranslation();

const tooltip = reactive({
  visible: false,
  x: 0,
  y: 0,
  title: '',
  subtitle: '',
  status: 'Friendly' as 'Friendly' | 'Hostile',
  // internal target timestamp (ms since epoch)
  targetMs: 0,
});

const markerStructureTooltip = computed(() => {
  const marker = props.markers.find(
    (item) => item.targetMs === tooltip.targetMs,
  );
  return marker
    ? `${translateStructure(marker.structure)} - ${marker.eveTimeLabel}`
    : '';
});

function computeEtaFromTarget(targetMs: number, nowMs: number) {
  const ms = targetMs - nowMs;
  if (ms <= 0) return '';
  const totalMinutes = Math.max(1, Math.round(ms / 60000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days) return `${days}d ${hours}h`;
  if (hours) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

const tooltipEta = computed(() =>
  computeEtaFromTarget(tooltip.targetMs, store.nowMs),
);

const ticks = computed(() => {
  return Array.from({ length: 11 }, (_, index) => {
    const hour = (index + 1) * 2;
    return {
      hour,
      leftPercent: (hour / 24) * 100,
      label: String(hour).padStart(2, '0'),
    };
  });
});

function markerStyle(marker: (typeof props.markers)[number]) {
  const background =
    marker.status === 'Hostile'
      ? 'var(--red)'
      : marker.elapsed
        ? 'var(--text-3)'
        : 'var(--green)';

  return {
    left: `${marker.leftPercent}%`,
    background,
    opacity: marker.elapsed ? '0.4' : '0.85',
  };
}

function positionTooltip(clientX: number, clientY: number) {
  const offset = 12;
  let x = clientX + offset;
  let y = clientY + offset;

  const width = tooltipEl.value?.offsetWidth ?? 250;
  const height = tooltipEl.value?.offsetHeight ?? 110;
  const maxX = Math.max(8, window.innerWidth - width - 8);
  const maxY = Math.max(8, window.innerHeight - height - 8);

  if (x > maxX) x = clientX - width - offset;
  if (y > maxY) y = clientY - height - offset;

  tooltip.x = Math.max(8, Math.min(maxX, x));
  tooltip.y = Math.max(8, Math.min(maxY, y));
}

function showMarkerTooltip(
  marker: (typeof props.markers)[number],
  event: MouseEvent,
) {
  tooltip.title = `${marker.localTimeLabel} ${marker.localTimeZoneLabel} - ${translateSystem(marker.system)}`;
  tooltip.subtitle = marker.name || translateSystem(marker.system);
  tooltip.status = marker.status;
  tooltip.targetMs = marker.targetMs;
  tooltip.visible = true;
  positionTooltip(event.clientX, event.clientY);
}

function moveMarkerTooltip(event: MouseEvent) {
  if (!tooltip.visible) return;
  positionTooltip(event.clientX, event.clientY);
}

function hideMarkerTooltip() {
  tooltip.visible = false;
}
</script>

<template>
  <div class="timeline-wrap">
    <div class="timeline-bar">
      <div class="timeline-fill" :style="{ width: `${progressPercent}%` }" />
      <template v-for="tick in ticks" :key="tick.hour">
        <div class="timeline-tick" :style="{ left: `${tick.leftPercent}%` }" />
        <div class="timeline-tick-label" :style="{ left: `${tick.leftPercent}%` }">{{ tick.label }}</div>
      </template>
      <div
        v-for="marker in markers"
        :key="marker.id"
        class="timeline-marker"
        :class="{ major: marker.major }"
        :style="markerStyle(marker)"
        @mouseenter="showMarkerTooltip(marker, $event)"
        @mousemove="moveMarkerTooltip($event)"
        @mouseleave="hideMarkerTooltip"
      />
      <div class="timeline-now-label" :style="{ left: `${Math.min(Math.max(progressPercent, 4), 96)}%` }">
        {{ label }}
      </div>
    </div>
    <div class="timeline-meta">
      <span>00:00</span>
      <span class="timeline-elapsed-count">{{ total ? t('timeline.todayElapsed', { elapsed, total }) : '' }}</span>
      <span>23:59</span>
    </div>

    <div
      v-show="tooltip.visible"
      ref="tooltipEl"
      class="timeline-dot-tooltip"
      :style="{ left: `${tooltip.x}px`, top: `${tooltip.y}px` }"
    >
      <div class="mst-sys">{{ tooltip.title }}</div>
      <div class="mst-row">
        <span class="mst-dot" :class="tooltip.status === 'Hostile' ? 'hostile' : 'friendly'" />
        <div style="display:flex;flex-direction:column;gap:2px;flex:1;min-width:0;">
          <span style="font-weight:700;">{{ tooltip.subtitle }}</span>
          <span style="font-size:12px;color:var(--text-3);">
            {{ markerStructureTooltip }}</span>
        </div>
        <span class="mst-cd">{{ tooltipEta }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.timeline-wrap {
  margin-bottom: 10px;
}

.timeline-bar {
  position: relative;
  height: 32px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 3px;
  overflow: hidden;
}

.timeline-fill {
  position: absolute;
  inset: 0 auto 0 0;
  background: rgba(58, 112, 176, 0.15);
  border-right: 2px solid var(--blue);
  transition: width 1s linear;
}

[data-theme='light'] .timeline-fill {
  background: rgba(37, 99, 235, 0.18);
}

.timeline-now-label {
  position: absolute;
  transform: translateX(-50%);
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--blue);
  background: var(--bg-surface);
  padding: 1px 4px;
  border: 1px solid var(--blue);
  border-radius: 2px;
  white-space: nowrap;
  z-index: 4;
}

.timeline-tick {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: var(--border);
  pointer-events: none;
}

.timeline-tick-label {
  position: absolute;
  bottom: 2px;
  transform: translateX(-50%);
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-3);
  pointer-events: none;
  z-index: 1;
}

.timeline-marker {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 8px;
  height: 8px;
  border-radius: 50%;
  z-index: 3;
  cursor: pointer;
}

.timeline-marker.major {
  width: 8px;
  height: 8px;
  box-shadow: 0 0 0 1px rgba(255, 209, 102, 0.65), 0 0 10px rgba(255, 209, 102, 0.2);
}

.timeline-meta {
  display: flex;
  justify-content: space-between;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-3);
  padding-top: 2px;
}

.timeline-elapsed-count span {
  color: var(--red);
}

.timeline-dot-tooltip {
  position: fixed;
  z-index: 210;
  pointer-events: none;
  background: var(--bg-surface);
  border: 1px solid var(--border-mid);
  border-radius: 4px;
  padding: 8px 10px;
  min-width: 190px;
  max-width: 340px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  font-size: 11px;
  color: var(--text-1);
}
</style>
