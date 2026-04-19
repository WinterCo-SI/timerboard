<script setup lang="ts">
import { useTranslation } from 'i18next-vue';
import { computed, reactive, ref, watch } from 'vue';
import {
  MAP_TRIAGE_PRESETS,
  MAP_WAVES,
  type MapTriagePreset,
  REGION_CONNECTIONS,
  REGION_EDGES,
  REGION_POSITIONS,
  REGION_SYSTEM_POSITIONS,
  REGION_SYSTEMS,
} from '../../data/map';
import { MAJOR_STRUCTURES } from '../../data/timers';
import {
  translateRegion,
  translateState,
  translateStatus,
  translateStructure,
  translateSystem,
} from '../../i18n';
import type { Timer } from '../../types/timer';
import {
  eveTimeContext,
  localTimeLabel,
  localTimeZoneLabel,
  timerDateTime,
  normalizeRegionId,
  normalizeSystemId,
} from '../../utils/timer-utils';

const VISUAL_MAJOR_STRUCTURES = new Set(['Keepstar', 'Sotiyo', 'Fortizar']);

const props = defineProps<{
  timers: Timer[];
  nowMs: number;
}>();

const { t } = useTranslation();

const REGION_VIEW_WIDTH = 1000;
const REGION_VIEW_HEIGHT = 760;
const REGION_VIEW_PADDING = 24;
const UNIVERSE_VIEW_WIDTH = 1000;
const UNIVERSE_VIEW_HEIGHT = 700;
const UNIVERSE_VIEW_PADDING = 24;
const DRAG_CLICK_THRESHOLD = 5;

// Region circle sizing constants
const REGION_BASE_RADIUS = 8;
const REGION_RADIUS_SCALE = 1.5;
const REGION_MIN_RADIUS = 10;
const REGION_MAX_RADIUS = 22;

// Zoom limits
const ZOOM_MIN = 1;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.1;

const selectedRegion = ref<string | null>(null);
const universeScale = ref(1);
const regionScale = ref(1);
const triagePreset = ref<MapTriagePreset>('all');
const panX = ref(0);
const panY = ref(0);
const universePanX = ref(0);
const universePanY = ref(0);
const dragState = reactive({
  active: false,
  startX: 0,
  startY: 0,
  originX: 0,
  originY: 0,
});
const universeDragState = reactive({
  active: false,
  moved: false,
  startX: 0,
  startY: 0,
  originX: 0,
  originY: 0,
});
const pinchState = reactive({
  active: false,
  startDist: 0,
  startScale: 1,
  centerX: 0,
  centerY: 0,
});
const twoFingerPan = reactive({
  active: false,
  lastCenterX: 0,
  lastCenterY: 0,
});
const mapTooltipEl = ref<HTMLElement | null>(null);
const mapTooltip = reactive({
  visible: false,
  x: 0,
  y: 0,
  title: '',
  rows: [] as Array<{
    id: string;
    status: 'Hostile' | 'Friendly';
    label: string;
    name?: string;
    owner?: string;
    structure?: string;
    state?: string;
    countdown: string;
    countdownCls: '' | 'soon' | 'urgent';
  }>,
});


function timerRegion(timer: Timer): string {
  return timer.region || 'Unknown';
}

const systemAliasMapByRegion = computed(() => {
  const map: Record<string, Record<string, string>> = {};
  const regions = new Set([
    ...Object.keys(REGION_SYSTEMS),
    ...Object.keys(REGION_SYSTEM_POSITIONS),
    ...Object.keys(REGION_EDGES),
  ]);

  for (const region of regions) {
    const aliases: Record<string, string> = {};
    for (const system of REGION_SYSTEMS[region] ?? []) {
      aliases[normalizeSystemId(system)] = system;
    }
    for (const system of Object.keys(REGION_SYSTEM_POSITIONS[region] ?? {})) {
      aliases[normalizeSystemId(system)] = system;
    }
    for (const [a, b] of REGION_EDGES[region] ?? []) {
      aliases[normalizeSystemId(a)] = a;
      aliases[normalizeSystemId(b)] = b;
    }
    map[region] = aliases;
  }

  return map;
});

function resolveSystemName(region: string, raw: string): string {
  return systemAliasMapByRegion.value[region]?.[normalizeSystemId(raw)] ?? raw;
}

function passesPreset(timer: Timer, preset: MapTriagePreset): boolean {
  switch (preset) {
    case 'friendlySov':
      return (
        timer.status === 'Friendly' &&
        (timer.structure === 'IHub' || timer.structure === 'TCU')
      );
    case 'friendlyMajors':
      return (
        timer.status === 'Friendly' &&
        MAJOR_STRUCTURES.includes(timer.structure)
      );
    case 'hostileMajors':
      return (
        timer.status === 'Hostile' && MAJOR_STRUCTURES.includes(timer.structure)
      );
    case 'keepstars':
      return timer.structure === 'Keepstar';
    default:
      return true;
  }
}

function waveMetaFromMs(ms: number) {
  return (
    MAP_WAVES.find((wave) => ms <= wave.maxMs) ??
    MAP_WAVES[MAP_WAVES.length - 1]
  );
}

const triageTimers = computed(() => {
  return props.timers.filter(
    (timer) =>
      timerDateTime(timer).getTime() > props.nowMs &&
      passesPreset(timer, triagePreset.value),
  );
});

const byRegion = computed(() => {
  const data: Record<
    string,
    {
      total: number;
      hostile: number;
      friendly: number;
      next?: Timer;
      waveCls: string;
      waveColor: string;
      hasMajor: boolean;
    }
  > = {};

  for (const timer of triageTimers.value) {
    const region = timerRegion(timer);
    if (!data[region]) {
      data[region] = {
        total: 0,
        hostile: 0,
        friendly: 0,
        waveCls: 'wave-future',
        waveColor: '#a8b3c2',
        hasMajor: false,
      };
    }
    data[region].total += 1;
    if (timer.status === 'Hostile') data[region].hostile += 1;
    else data[region].friendly += 1;
    if (VISUAL_MAJOR_STRUCTURES.has(timer.structure))
      data[region].hasMajor = true;

    if (
      !data[region].next ||
      timerDateTime(timer).getTime() <
        timerDateTime(data[region].next).getTime()
    ) {
      data[region].next = timer;
    }
  }

  for (const [region, details] of Object.entries(data)) {
    if (!details.next) continue;
    const ms = timerDateTime(details.next).getTime() - props.nowMs;
    const wave = waveMetaFromMs(ms);
    details.waveCls = wave.cls;
    details.waveColor = wave.color;
    data[region] = details;
  }

  return Object.entries(data).sort(
    (a, b) => b[1].total - a[1].total || a[0].localeCompare(b[0]),
  );
});

const byRegionMap = computed(() => Object.fromEntries(byRegion.value));
const topRegions = computed(() => byRegion.value.slice(0, 15));

function hexToRgb(hex: string) {
  const h = hex.replace('#', '');
  const bigint = parseInt(
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h,
    16,
  );
  return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
}

function isLightColor(hexOrRgb: string) {
  try {
    const c = hexOrRgb.trim();
    const rgb = c.startsWith('#') ? hexToRgb(c) : null;
    const r = rgb ? rgb.r : 0;
    const g = rgb ? rgb.g : 0;
    const b = rgb ? rgb.b : 0;
    // Perceived luminance
    const lum = 0.2126 * (r / 255) + 0.7152 * (g / 255) + 0.0722 * (b / 255);
    return lum > 0.6;
  } catch {
    return false;
  }
}

const actionGroups = computed(() => {
  const groups: Record<
    string,
    Array<{
      system: string;
      region: string;
      timers: Timer[];
      earliestMs: number;
    }>
  > = {};
  const source = selectedRegion.value
    ? triageTimers.value.filter(
        (timer) => timerRegion(timer) === selectedRegion.value,
      )
    : triageTimers.value;

  for (const timer of source) {
    const region = timerRegion(timer);
    const system = resolveSystemName(region, timer.system);
    const wave = waveMetaFromMs(timerDateTime(timer).getTime() - props.nowMs);
    if (!groups[wave.id]) groups[wave.id] = [];
    const existing = groups[wave.id].find(
      (item) => item.system === system && item.region === region,
    );
    if (existing) {
      existing.timers.push(timer);
      existing.earliestMs = Math.min(
        existing.earliestMs,
        timerDateTime(timer).getTime(),
      );
    } else {
      groups[wave.id].push({
        system,
        region,
        timers: [timer],
        earliestMs: timerDateTime(timer).getTime(),
      });
    }
  }

  return MAP_WAVES.map((wave) => ({
    wave,
    items: (groups[wave.id] ?? []).sort(
      (a, b) =>
        a.earliestMs - b.earliestMs || b.timers.length - a.timers.length,
    ),
  })).filter((group) => group.items.length > 0);
});

const regionTopology = computed(() => {
  const region = selectedRegion.value;
  if (!region) {
    return {
      region: null,
      systems: [] as string[],
      edges: [] as Array<[string, string]>,
      positions: {} as Record<string, [number, number]>,
    };
  }

  const knownSystems = REGION_SYSTEMS[region] ?? [];
  const generatedPositions = REGION_SYSTEM_POSITIONS[region] ?? {};
  const generatedSystems = Object.keys(generatedPositions);
  const timerSystems = Array.from(
    new Set(
      triageTimers.value
        .filter((timer) => timerRegion(timer) === region)
        .map((timer) => resolveSystemName(region, timer.system)),
    ),
  );

  const systems = Array.from(
    new Set([...knownSystems, ...generatedSystems, ...timerSystems]),
  ).sort((a, b) => a.localeCompare(b));

  const edgeSource = REGION_EDGES[region] ?? [];
  const edgeSet = new Set(systems);
  const edges = edgeSource
    .map(
      ([a, b]) =>
        [resolveSystemName(region, a), resolveSystemName(region, b)] as [
          string,
          string,
        ],
    )
    .filter(([a, b]) => edgeSet.has(a) && edgeSet.has(b));

  const positions: Record<string, [number, number]> = { ...generatedPositions };

  const missingSystems = systems.filter((system) => !positions[system]);
  if (missingSystems.length) {
    const existing = Object.values(positions);
    const cx = existing.length
      ? Math.round(
          existing.reduce((acc, pos) => acc + pos[0], 0) / existing.length,
        )
      : 500;
    const cy = existing.length
      ? Math.round(
          existing.reduce((acc, pos) => acc + pos[1], 0) / existing.length,
        )
      : 360;
    const ringWidth = 90;
    const rings = Math.max(
      1,
      Math.ceil(Math.sqrt(Math.max(1, missingSystems.length)) / 2),
    );

    missingSystems.forEach((system, index) => {
      const ringIndex = index % rings;
      const sector = Math.floor(index / rings);
      const angle =
        (sector / Math.max(1, Math.ceil(missingSystems.length / rings))) *
        Math.PI *
        2;
      const radius = 120 + ringIndex * ringWidth;
      const x = Math.round(cx + Math.cos(angle) * radius);
      const y = Math.round(cy + Math.sin(angle) * radius * 0.72);
      positions[system] = [x, y];
    });
  }

  const displayPositions: Record<string, [number, number]> = {};
  for (const [system, pos] of Object.entries(positions)) {
    // Use resolved system name keys so positions match `systems` which are resolved
    const resolved = resolveSystemName(region, system);
    displayPositions[resolved] = [pos[0], REGION_VIEW_HEIGHT - pos[1]];
  }

  return { region, systems, edges, positions: displayPositions };
});

function systemTimers(system: string): Timer[] {
  const region = selectedRegion.value;
  if (!region) return [];
  return triageTimers.value.filter(
    (timer) =>
      timerRegion(timer) === region &&
      resolveSystemName(region, timer.system) === system,
  );
}

function systemNodeColor(system: string): string {
  const timers = systemTimers(system);
  if (!timers.length) return 'rgba(42,48,64,0.78)';
  const first = timers
    .slice()
    .sort((a, b) => timerDateTime(a).getTime() - timerDateTime(b).getTime())[0];
  if (!first) return 'rgba(42,48,64,0.78)';
  return waveMetaFromMs(timerDateTime(first).getTime() - props.nowMs).color;
}

function systemNodeStroke(system: string): string {
  const timers = systemTimers(system);
  if (!timers.length) return 'rgba(90,100,120,0.7)';
  const hostile = timers.filter((timer) => timer.status === 'Hostile').length;
  const friendly = timers.length - hostile;
  if (hostile > friendly) return 'rgba(192,64,74,0.95)';
  if (friendly > hostile) return 'rgba(61,158,106,0.95)';
  return 'rgba(212,220,232,0.75)';
}

function systemRadius(system: string): number {
  const count = systemTimers(system).length;
  if (!count) return 5;
  return Math.max(8, Math.min(18, 8 + count * 2));
}

function systemPrimaryStructure(system: string): string {
  const timers = systemTimers(system);
  if (!timers.length) return 'No active timers';
  return timers
    .map((timer) => timer.structure)
    .slice(0, 3)
    .join(', ');
}

function systemHasMajor(system: string): boolean {
  return systemTimers(system).some((timer) =>
    VISUAL_MAJOR_STRUCTURES.has(timer.structure),
  );
}

function tooltipCountdown(ms: number): string {
  if (ms <= 0) return '';
  const totalMinutes = Math.max(1, Math.round(ms / 60000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days) return `${days}d ${hours}h`;
  if (hours) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function tooltipCountdownClass(ms: number): '' | 'soon' | 'urgent' {
  if (ms <= 0) return '';
  if (ms < 30 * 60 * 1000) return 'urgent';
  if (ms < 2 * 3600 * 1000) return 'soon';
  return '';
}

function positionMapTooltip(clientX: number, clientY: number) {
  const offset = 12;
  let x = clientX + offset;
  let y = clientY + offset;

  const width = mapTooltipEl.value?.offsetWidth ?? 220;
  const height = mapTooltipEl.value?.offsetHeight ?? 120;
  const maxX = Math.max(8, window.innerWidth - width - 8);
  const maxY = Math.max(8, window.innerHeight - height - 8);

  if (x > maxX) x = clientX - width - offset;
  if (y > maxY) y = clientY - height - offset;

  mapTooltip.x = Math.max(8, Math.min(maxX, x));
  mapTooltip.y = Math.max(8, Math.min(maxY, y));
}

function showMapTooltip(
  title: string,
  rows: Array<{
    id: string;
    status: 'Hostile' | 'Friendly';
    name?: string;
    structure?: string;
    state?: string;
    countdown: string;
    countdownCls: '' | 'soon' | 'urgent';
  }>,
  event: MouseEvent,
) {
  mapTooltip.title = title;
  mapTooltip.rows = rows;
  mapTooltip.visible = true;
  positionMapTooltip(event.clientX, event.clientY);
}

function moveMapTooltip(event: MouseEvent) {
  if (!mapTooltip.visible) return;
  positionMapTooltip(event.clientX, event.clientY);
}

function hideMapTooltip() {
  mapTooltip.visible = false;
  mapTooltip.rows = [];
}

function returnToUniverse() {
  selectedRegion.value = null;
  hideMapTooltip();
}

function onRegionHover(region: string, event: MouseEvent) {
  const rows = triageTimers.value
    .filter((timer) => timerRegion(timer) === region)
    .slice()
    .sort((a, b) => timerDateTime(a).getTime() - timerDateTime(b).getTime())
    .slice(0, 8)
    .map((timer, index) => {
      const ms = timerDateTime(timer).getTime() - props.nowMs;
      return {
        id: `${region}-${timer.system}-${timer.time}-${index}`,
        status: timer.status,
        name: timer.name,
        owner: (timer as any).owner || '',
        structure: timer.structure,
        state: timer.state,
        countdown: tooltipCountdown(ms),
        countdownCls: tooltipCountdownClass(ms),
      };
    });

  showMapTooltip(translateRegion(region), rows, event);
}

function onSystemHover(system: string, event: MouseEvent) {
  const rows = systemTimers(system)
    .slice()
    .sort((a, b) => timerDateTime(a).getTime() - timerDateTime(b).getTime())
    .slice(0, 10)
    .map((timer, index) => {
      const ms = timerDateTime(timer).getTime() - props.nowMs;
      return {
        id: `${system}-${timer.time}-${index}`,
        status: timer.status,
        owner: (timer as any).owner || '',
        name: timer.name,
        structure: timer.structure,
        state: timer.state,
        countdown: tooltipCountdown(ms),
        countdownCls: tooltipCountdownClass(ms),
      };
    });

  showMapTooltip(translateSystem(system), rows, event);
}

function onUniverseRegionClick(region: string, event: MouseEvent) {
  if (universeDragState.moved) {
    event.preventDefault();
    return;
  }
  if (byRegionMap.value[region]) {
    selectedRegion.value = region;
  }
}

function regionRadius(region: string): number {
  const total = byRegionMap.value[region]?.total ?? 0;
  if (!total) return 8;
  return Math.max(
    REGION_MIN_RADIUS,
    Math.min(
      REGION_MAX_RADIUS,
      REGION_BASE_RADIUS + total * REGION_RADIUS_SCALE,
    ),
  );
}

function hostileWedgePath(
  x: number,
  y: number,
  r: number,
  hostile: number,
  total: number,
): string {
  if (!hostile || !total) return '';
  const frac = hostile / total;
  if (frac <= 0) return '';
  const angle = frac * 2 * Math.PI;
  const x1 = x + r * Math.sin(0);
  const y1 = y - r * Math.cos(0);
  const x2 = x + r * Math.sin(angle);
  const y2 = y - r * Math.cos(angle);
  const largeArc = frac > 0.5 ? 1 : 0;
  return `M${x},${y} L${x1},${y1} A${r},${r} 0 ${largeArc} 1 ${x2},${y2} Z`;
}

const regionPanBounds = computed(() => {
  const topology = regionTopology.value;
  if (!selectedRegion.value || !topology.systems.length) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const system of topology.systems) {
    const pos = topology.positions[system];
    if (!pos) continue;
    const reach = systemRadius(system) + 14;
    minX = Math.min(minX, pos[0] - reach);
    maxX = Math.max(maxX, pos[0] + reach);
    minY = Math.min(minY, pos[1] - reach);
    maxY = Math.max(maxY, pos[1] + reach);
  }

  // account for current region scale when clamping pan so bounds match zoom
  const s = regionScale.value || 1;
  let minPanX = REGION_VIEW_PADDING - minX * s;
  let maxPanX = REGION_VIEW_WIDTH - REGION_VIEW_PADDING - maxX * s;
  let minPanY = REGION_VIEW_PADDING - minY * s;
  let maxPanY = REGION_VIEW_HEIGHT - REGION_VIEW_PADDING - maxY * s;

  if (minPanX > maxPanX) {
    const left = maxPanX;
    const right = minPanX;
    minPanX = left;
    maxPanX = right;
  }

  if (minPanY > maxPanY) {
    const top = maxPanY;
    const bottom = minPanY;
    minPanY = top;
    maxPanY = bottom;
  }

  return { minX: minPanX, maxX: maxPanX, minY: minPanY, maxY: maxPanY };
});

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function applyZoom(
  current: number,
  delta: number,
  step = ZOOM_STEP,
  min = ZOOM_MIN,
  max = ZOOM_MAX,
) {
  const factor = Math.sign(delta) * step;
  const next = current * (1 - factor);
  const clamped = clamp(next, min, max);
  return clamped;
}

function handleUniverseWheel(e: WheelEvent) {
  const svg = (e.currentTarget as Element).closest('svg') as SVGElement | null;
  if (!svg) {
    universeScale.value = applyZoom(universeScale.value, e.deltaY);
    return;
  }
  const rect = svg.getBoundingClientRect();
  const clientX = e.clientX - rect.left;
  const clientY = e.clientY - rect.top;

  const currentScale = universeScale.value;
  const svgX = (clientX - universePanX.value) / currentScale;
  const svgY = (clientY - universePanY.value) / currentScale;

  const nextScale = applyZoom(currentScale, e.deltaY);
  // compute new pan so that svgX/svgY remain under cursor
  const nextPanX = clientX - svgX * nextScale;
  const nextPanY = clientY - svgY * nextScale;

  universeScale.value = nextScale;
  const clamped = clampUniversePan(nextPanX, nextPanY);
  universePanX.value = clamped.x;
  universePanY.value = clamped.y;
}

function handleRegionWheel(e: WheelEvent) {
  const svg = (e.currentTarget as Element).closest('svg') as SVGElement | null;
  if (!svg) {
    regionScale.value = applyZoom(regionScale.value, e.deltaY);
    return;
  }
  const rect = svg.getBoundingClientRect();
  const clientX = e.clientX - rect.left;
  const clientY = e.clientY - rect.top;

  const currentScale = regionScale.value;
  const svgX = (clientX - panX.value) / currentScale;
  const svgY = (clientY - panY.value) / currentScale;

  const nextScale = applyZoom(currentScale, e.deltaY);
  const nextPanX = clientX - svgX * nextScale;
  const nextPanY = clientY - svgY * nextScale;

  regionScale.value = nextScale;
  const clamped = clampPan(nextPanX, nextPanY);
  panX.value = clamped.x;
  panY.value = clamped.y;
}

function getTouchDistance(a: Touch, b: Touch) {
  const dx = a.clientX - b.clientX;
  const dy = a.clientY - b.clientY;
  return Math.hypot(dx, dy);
}

function getTouchCenter(a: Touch, b: Touch) {
  return { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 };
}

function startPinch(e: TouchEvent, target: 'universe' | 'region') {
  if (!e.touches || e.touches.length < 2) return;
  const [a, b] = [e.touches[0], e.touches[1]];
  // start by assuming two-finger pan until pinch is detected on move
  twoFingerPan.active = true;
  const center = getTouchCenter(a, b);
  twoFingerPan.lastCenterX = center.x;
  twoFingerPan.lastCenterY = center.y;
  pinchState.active = false;
  pinchState.startDist = getTouchDistance(a, b);
  pinchState.startScale =
    target === 'universe' ? universeScale.value : regionScale.value;
  pinchState.centerX = center.x;
  pinchState.centerY = center.y;
}

function movePinch(e: TouchEvent, target: 'universe' | 'region') {
  if (!e.touches || e.touches.length < 2) return;
  const [a, b] = [e.touches[0], e.touches[1]];
  const dist = getTouchDistance(a, b);

  // determine if gesture is a pinch (scale change) or two-finger pan (center movement)
  const scaleDelta =
    Math.abs(dist - pinchState.startDist) / (pinchState.startDist || 1);
  const center = getTouchCenter(a, b);

  // threshold: if scale changed more than 5% treat as pinch
  if (scaleDelta > 0.05) {
    twoFingerPan.active = false;
    pinchState.active = true;
  }

  if (pinchState.active) {
    if (!pinchState.startDist) return;
    const scaleFactor = dist / pinchState.startDist;
    const nextScale = clamp(
      pinchState.startScale * scaleFactor,
      ZOOM_MIN,
      ZOOM_MAX,
    );
    const svg = (e.currentTarget as Element).closest(
      'svg',
    ) as SVGElement | null;
    const rect = svg?.getBoundingClientRect();
    const clientX = rect ? pinchState.centerX - rect.left : pinchState.centerX;
    const clientY = rect ? pinchState.centerY - rect.top : pinchState.centerY;

    if (target === 'universe') {
      const currentScale = universeScale.value;
      const svgX = (clientX - universePanX.value) / currentScale;
      const svgY = (clientY - universePanY.value) / currentScale;
      universeScale.value = nextScale;
      const nextPanX = clientX - svgX * nextScale;
      const nextPanY = clientY - svgY * nextScale;
      const clamped = clampUniversePan(nextPanX, nextPanY);
      universePanX.value = clamped.x;
      universePanY.value = clamped.y;
    } else {
      const currentScale = regionScale.value;
      const svgX = (clientX - panX.value) / currentScale;
      const svgY = (clientY - panY.value) / currentScale;
      regionScale.value = nextScale;
      const nextPanX = clientX - svgX * nextScale;
      const nextPanY = clientY - svgY * nextScale;
      const clamped = clampPan(nextPanX, nextPanY);
      panX.value = clamped.x;
      panY.value = clamped.y;
    }
  } else if (twoFingerPan.active) {
    // two-finger pan: move by delta of centers
    const dx = center.x - twoFingerPan.lastCenterX;
    const dy = center.y - twoFingerPan.lastCenterY;
    twoFingerPan.lastCenterX = center.x;
    twoFingerPan.lastCenterY = center.y;

    if (target === 'universe') {
      const next = clampUniversePan(
        universePanX.value + dx,
        universePanY.value + dy,
      );
      universePanX.value = next.x;
      universePanY.value = next.y;
    } else {
      const next = clampPan(panX.value + dx, panY.value + dy);
      panX.value = next.x;
      panY.value = next.y;
    }
  }
}

function endPinch() {
  pinchState.active = false;
  pinchState.startDist = 0;
}

function handleUniverseTouchStart(e: TouchEvent) {
  startPinch(e, 'universe');
}

function handleUniverseTouchMove(e: TouchEvent) {
  movePinch(e, 'universe');
}

function handleUniverseTouchEnd(e: TouchEvent) {
  endPinch();
}

function handleRegionTouchStart(e: TouchEvent) {
  startPinch(e, 'region');
}

function handleRegionTouchMove(e: TouchEvent) {
  movePinch(e, 'region');
}

function handleRegionTouchEnd(e: TouchEvent) {
  endPinch();
}

function clampPan(nextX: number, nextY: number): { x: number; y: number } {
  const bounds = regionPanBounds.value;
  return {
    x: clamp(nextX, bounds.minX, bounds.maxX),
    y: clamp(nextY, bounds.minY, bounds.maxY),
  };
}

const universePanBounds = computed(() => {
  const entries = Object.entries(REGION_POSITIONS);
  if (!entries.length) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const [region, pos] of entries) {
    const radius = regionRadius(region);
    const labelReach = radius + 18;
    minX = Math.min(minX, pos[0] - labelReach);
    maxX = Math.max(maxX, pos[0] + labelReach);
    minY = Math.min(minY, pos[1] - labelReach);
    maxY = Math.max(maxY, pos[1] + labelReach);
  }

  // account for current universe scale when clamping pan so bounds match zoom
  const s = universeScale.value || 1;
  let minPanX = UNIVERSE_VIEW_PADDING - minX * s;
  let maxPanX = UNIVERSE_VIEW_WIDTH - UNIVERSE_VIEW_PADDING - maxX * s;
  let minPanY = UNIVERSE_VIEW_PADDING - minY * s;
  let maxPanY = UNIVERSE_VIEW_HEIGHT - UNIVERSE_VIEW_PADDING - maxY * s;

  if (minPanX > maxPanX) {
    const left = maxPanX;
    const right = minPanX;
    minPanX = left;
    maxPanX = right;
  }

  if (minPanY > maxPanY) {
    const top = maxPanY;
    const bottom = minPanY;
    minPanY = top;
    maxPanY = bottom;
  }

  return { minX: minPanX, maxX: maxPanX, minY: minPanY, maxY: maxPanY };
});

const universeRegionLinks = computed(() => {
  return REGION_CONNECTIONS.map(([a, b]) => {
    const from = REGION_POSITIONS[a];
    const to = REGION_POSITIONS[b];
    if (!from || !to) return null;
    // const activeA = Boolean(byRegionMap.value[a]);
    // const activeB = Boolean(byRegionMap.value[b]);
    return {
      key: `${a}__${b}`,
      x1: from[0],
      y1: from[1],
      x2: to[0],
      y2: to[1],
      // active: activeA || activeB,
    };
  }).filter(
    (
      edge,
    ): edge is {
      key: string;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      active: boolean;
    } => Boolean(edge),
  );
});

function clampUniversePan(
  nextX: number,
  nextY: number,
): { x: number; y: number } {
  const bounds = universePanBounds.value;
  return {
    x: clamp(nextX, bounds.minX, bounds.maxX),
    y: clamp(nextY, bounds.minY, bounds.maxY),
  };
}

function startRegionDrag(event: PointerEvent) {
  if (!selectedRegion.value) return;
  hideMapTooltip();
  const target = event.currentTarget as SVGSVGElement | null;
  target?.setPointerCapture(event.pointerId);
  dragState.active = true;
  dragState.startX = event.clientX;
  dragState.startY = event.clientY;
  dragState.originX = panX.value;
  dragState.originY = panY.value;
}

function moveRegionDrag(event: PointerEvent) {
  if (!dragState.active) return;
  const next = clampPan(
    dragState.originX + (event.clientX - dragState.startX),
    dragState.originY + (event.clientY - dragState.startY),
  );
  panX.value = next.x;
  panY.value = next.y;
}

function endRegionDrag() {
  dragState.active = false;
}

function resetRegionPan() {
  panX.value = 0;
  panY.value = 0;
}

function startUniverseDrag(event: PointerEvent) {
  if (selectedRegion.value) return;
  hideMapTooltip();
  universeDragState.active = true;
  universeDragState.moved = false;
  universeDragState.startX = event.clientX;
  universeDragState.startY = event.clientY;
  universeDragState.originX = universePanX.value;
  universeDragState.originY = universePanY.value;
}

function moveUniverseDrag(event: PointerEvent) {
  if (!universeDragState.active) return;
  const dx = event.clientX - universeDragState.startX;
  const dy = event.clientY - universeDragState.startY;
  if (!universeDragState.moved && Math.hypot(dx, dy) >= DRAG_CLICK_THRESHOLD) {
    universeDragState.moved = true;
  }

  const next = clampUniversePan(
    universeDragState.originX + dx,
    universeDragState.originY + dy,
  );
  universePanX.value = next.x;
  universePanY.value = next.y;
}

function endUniverseDrag() {
  universeDragState.active = false;
  window.requestAnimationFrame(() => {
    universeDragState.moved = false;
  });
}

function resetUniversePan() {
  universePanX.value = 0;
  universePanY.value = 0;
}

watch(selectedRegion, () => {
  panX.value = 0;
  panY.value = 0;
  hideMapTooltip();
});

watch(regionPanBounds, () => {
  const next = clampPan(panX.value, panY.value);
  panX.value = next.x;
  panY.value = next.y;
});

watch(universePanBounds, () => {
  const next = clampUniversePan(universePanX.value, universePanY.value);
  universePanX.value = next.x;
  universePanY.value = next.y;
});
</script>

<template>
  <div class="view-map active-view">
    <div class="map-triage-bar">
      <span class="map-triage-label">{{ t('map.triage') }}</span>
      <select v-model="triagePreset" class="map-triage-select">
        <option v-for="(label, key) in MAP_TRIAGE_PRESETS" :key="key" :value="key">
          {{ label }}
        </option>
      </select>      
    </div>

    <div class="summary-head">
      <div>
        <div class="summary-title">{{ t('map.title') }}</div>
        <div class="summary-subtitle">{{ t('map.subtitle') }}</div>
      </div>
    </div>

    <div v-if="!byRegion.length" class="summary-empty">{{ t('map.empty') }}</div>

    <div class="map-wrap" v-else>
      <div class="map-svg-wrap">
        <nav class="map-breadcrumb" aria-label="Map navigation">
          <button
            class="map-breadcrumb-link"
            type="button"
            :aria-current="selectedRegion ? undefined : 'page'"
            @click="returnToUniverse"
          >
            {{ t('map.universe') }}
          </button>
          <template v-if="selectedRegion">
            <span class="map-breadcrumb-separator" aria-hidden="true">/</span>
            <span class="map-breadcrumb-current" aria-current="page">{{ translateRegion(selectedRegion) }}</span>
          </template>
        </nav>

        <div class="map-legend">
          <div class="map-legend-item" v-for="wave in MAP_WAVES" :key="wave.id">
            <span class="map-wave-dot" :class="wave.cls" /> {{ wave.label }}
          </div>
          <div class="map-legend-item"><span class="map-legend-dot" style="background: var(--border-mid)" /> {{ t('map.noActiveTimers') }}</div>
          <div class="map-legend-item">
            <span style="width: 7px; height: 7px; border-radius: 50%; background: #ff4d5d; border: 1px solid rgba(0, 0, 0, 0.55); display: inline-block" />
            {{ t('map.majorStructures') }}
          </div>
          <span style="color: var(--text-3); font-size: 14px">{{ t('map.legendHint') }}</span>
        </div>

        <svg
          v-if="!selectedRegion"
          viewBox="0 0 1000 700"
          xmlns="http://www.w3.org/2000/svg"
          style="width: 100%; height: auto; display: block; font-family: var(--font-sans); touch-action: none"
          :style="{ cursor: universeDragState.active ? 'grabbing' : 'grab' }"
          @pointerdown="startUniverseDrag"
          @pointermove="moveUniverseDrag"
          @wheel.prevent="handleUniverseWheel"
          @touchstart.prevent="handleUniverseTouchStart"
          @touchmove.prevent="handleUniverseTouchMove"
          @touchend.prevent="handleUniverseTouchEnd"
          @pointerup="endUniverseDrag"
          @pointercancel="endUniverseDrag"
          @pointerleave="endUniverseDrag"
          @dblclick="resetUniversePan"
        >
          <g :transform="`translate(${universePanX} ${universePanY}) scale(${universeScale})`">
            <g class="map-universe-links">
              <line
                v-for="edge in universeRegionLinks"
                :key="edge.key"
                :x1="edge.x1"
                :y1="edge.y1"
                :x2="edge.x2"
                :y2="edge.y2"
                :stroke="edge.active ? 'rgba(83, 136, 209, 0.4)' : 'rgba(82, 94, 120, 0.28)'"
                :stroke-width="edge.active ? 1.4 : 1"
              />
            </g>
            <g
              v-for="[region, pos] in Object.entries(REGION_POSITIONS)"
              :key="region"
              :style="byRegionMap[region] ? 'cursor:pointer' : ''"
              @click="onUniverseRegionClick(region, $event)"
              @mouseenter="onRegionHover(region, $event)"
              @mousemove="moveMapTooltip($event)"
              @mouseleave="hideMapTooltip"
            >
            <circle
              :cx="pos[0]"
              :cy="pos[1]"
              :r="regionRadius(region)"
              :fill="byRegionMap[region]?.waveColor ?? 'rgba(42,48,64,0.6)'"
              :fill-opacity="byRegionMap[region] ? 0.74 : 0.56"
              :stroke="
                !byRegionMap[region]
                  ? 'var(--border)'
                  : byRegionMap[region].hostile > byRegionMap[region].friendly
                    ? 'rgba(192,64,74,0.9)'
                    : byRegionMap[region].friendly > byRegionMap[region].hostile
                      ? 'rgba(61,158,106,0.9)'
                      : 'rgba(212,220,232,0.65)'
              "
              :stroke-width="byRegionMap[region] ? 1.5 : 0.5"
            />

            <path
              v-if="byRegionMap[region] && byRegionMap[region].hostile > 0"
              :d="hostileWedgePath(pos[0], pos[1], regionRadius(region), byRegionMap[region].hostile, byRegionMap[region].total)"
              fill="rgba(0,0,0,0.18)"
              stroke="none"
              pointer-events="none"
            />

            <text
              v-if="byRegionMap[region]"
              :x="pos[0]"
              :y="pos[1] + 1"
              text-anchor="middle"
              dominant-baseline="middle"
              :fill="isLightColor(byRegionMap[region].waveColor) ? 'rgba(0,0,0,0.9)' : '#fff'"
              font-size="10"
              font-weight="700"
            >
              {{ byRegionMap[region].total }}
            </text>

            <circle
              v-if="byRegionMap[region]?.hasMajor"
              :cx="pos[0] + regionRadius(region) * 0.42"
              :cy="pos[1] - regionRadius(region) * 0.32"
              r="3.2"
              fill="#ff4d5d"
              stroke="rgba(0,0,0,0.55)"
              stroke-width="1.1"
              pointer-events="none"
            />

            <text
              :x="pos[0]"
              :y="pos[1] + (byRegionMap[region] ? regionRadius(region) + 9 : 17)"
              text-anchor="middle"
              :fill="byRegionMap[region] ? '#d4dce8' : '#4a5568'"
              :font-size="byRegionMap[region] ? 9 : 7"
              pointer-events="none"
            >
              <!-- {{ shortRegionName(region) }} -->
                {{ translateRegion(region) }}
            </text>
            </g>
          </g>
        </svg>

        <svg
          v-else
          class="map-region-canvas"
          viewBox="0 0 1000 760"
          xmlns="http://www.w3.org/2000/svg"
          style="width: 100%; height: auto; display: block; touch-action: none"
          :style="{ cursor: dragState.active ? 'grabbing' : 'grab' }"
          @pointerdown="startRegionDrag"
          @pointermove="moveRegionDrag"
          @wheel.prevent="handleRegionWheel"
          @touchstart.prevent="handleRegionTouchStart"
          @touchmove.prevent="handleRegionTouchMove"
          @touchend.prevent="handleRegionTouchEnd"
          @pointerup="endRegionDrag"
          @pointercancel="endRegionDrag"
          @pointerleave="endRegionDrag"
          @dblclick="resetRegionPan"
        >
          <text x="500" y="26" text-anchor="middle" fill="var(--text-2)" font-size="16" font-weight="700">
            {{ translateRegion(selectedRegion) }}
          </text>

          <g :transform="`translate(${panX} ${panY}) scale(${regionScale})`">
            <g class="map-region-edges">
              <line
                v-for="[a, b] in regionTopology.edges"
                :key="`${a}-${b}`"
                :x1="regionTopology.positions[a]?.[0] ?? 0"
                :y1="regionTopology.positions[a]?.[1] ?? 0"
                :x2="regionTopology.positions[b]?.[0] ?? 0"
                :y2="regionTopology.positions[b]?.[1] ?? 0"
                stroke="rgba(42,48,64,0.9)"
                stroke-width="1.4"
              />
            </g>

            <g v-for="system in regionTopology.systems" :key="system">
              <circle
                :cx="regionTopology.positions[system]?.[0] ?? 0"
                :cy="regionTopology.positions[system]?.[1] ?? 0"
                :r="systemRadius(system)"
                :fill="systemNodeColor(system)"
                :stroke="systemNodeStroke(system)"
                stroke-width="1.5"
                @mouseenter="onSystemHover(system, $event)"
                @mousemove="moveMapTooltip($event)"
                @mouseleave="hideMapTooltip"
              />
              <circle
                v-if="systemHasMajor(system)"
                :cx="(regionTopology.positions[system]?.[0] ?? 0) + systemRadius(system) * 0.45"
                :cy="(regionTopology.positions[system]?.[1] ?? 0) - systemRadius(system) * 0.35"
                r="2.8"
                fill="#ff4d5d"
                stroke="rgba(0,0,0,0.55)"
                stroke-width="1"
                pointer-events="none"
              />
              <text
                :x="regionTopology.positions[system]?.[0] ?? 0"
                :y="(regionTopology.positions[system]?.[1] ?? 0) + 3"
                text-anchor="middle"
                :fill="isLightColor(systemNodeColor(system)) ? 'rgba(0,0,0,0.9)' : '#fff'"
                font-size="11"
                font-weight="700"
                pointer-events="none"
              >
                {{ systemTimers(system).length ? systemTimers(system).length : '' }}
              </text>
              <text
                :x="regionTopology.positions[system]?.[0] ?? 0"
                :y="(regionTopology.positions[system]?.[1] ?? 0) + systemRadius(system) + 10"
                text-anchor="middle"
                fill="var(--text-3)"
                font-size="8"
                pointer-events="none"
              >
                {{ translateSystem(system) }}
              </text>
            </g>
          </g>
        </svg>
      </div>

      <div class="map-sidebar">
        

        <div class="map-region-card universe-card" @click="returnToUniverse"
          :class="{active: selectedRegion === null}">
          <div class="map-rc-name">{{ t('map.universe') }}</div>
        </div>

        <div
          v-for="[region, data] in topRegions"
          :key="region"
          class="map-region-card"
          :class="{ active: selectedRegion === region }"
          @click="selectedRegion = region"
        >
          <div class="map-rc-name">
            {{ translateRegion(region) }}
            <span style="font-size: 12px; font-weight: 400; color: var(--text-3)">{{ t('map.timerCount', { count: data.total }) }}</span>
          </div>
          <div class="map-rc-bars">
            <div v-if="data.hostile" class="map-rc-bar hostile" :style="{ width: `${Math.round((data.hostile / data.total) * 80)}px` }" />
            <div v-if="data.friendly" class="map-rc-bar friendly" :style="{ width: `${Math.round((data.friendly / data.total) * 80)}px` }" />
            <span class="map-rc-nums">{{ t('map.hostileFriendlyShort', { hostile: data.hostile, friendly: data.friendly }) }}</span>
          </div>
        </div>

        <div class="map-actions">
          <div class="map-actions-title">{{ t('map.nextActions') }}</div>
          <div v-if="!actionGroups.length" class="map-actions-empty">{{ t('map.emptyActions') }}</div>
          <div v-for="group in actionGroups" :key="group.wave.id" class="map-wave-group">
            <div class="map-wave-head"><span class="map-wave-dot" :class="group.wave.cls" />{{ group.wave.label }}</div>
            <div v-for="item in group.items.slice(0, 10)" :key="`${item.region}-${item.system}`" class="map-action-row">
              <div class="map-action-main">
                <div class="map-action-sys" :title="selectedRegion ? translateSystem(item.system) : t('map.systemInRegion', { system: translateSystem(item.system), region: translateRegion(item.region) })">
                  {{ selectedRegion ? translateSystem(item.system) : t('map.systemInRegion', { system: translateSystem(item.system), region: translateRegion(item.region) }) }}
                </div>
                <div class="map-action-meta" :title="item.timers[0]?.structure">
                  {{ translateStructure(item.timers[0]?.structure) }}
                </div>
              </div>
              <div>
                <div style="display:flex;align-items:center;gap:8px;">
                  <span class="status-dot" :class="item.timers[0]?.status === 'Friendly' ? 'ours' : 'theirs'" :title="item.timers[0]?.owner ? `${translateStatus(item.timers[0].status)} - ${item.timers[0].owner}` : translateStatus(item.timers[0]?.status)" />
                  <div class="map-action-time">
                    {{ item.timers[0] ? `${localTimeLabel(item.timers[0])} ${localTimeZoneLabel(item.timers[0])}` : '' }} · {{ tooltipCountdown(item.earliestMs - props.nowMs) }}
                  </div>
                </div>
                <div class="map-action-count">{{ item.timers[0] ? eveTimeContext(item.timers[0]) : '' }} · {{ t(item.timers.length === 1 ? 'map.timerCount' : 'map.timersCount', { count: item.timers.length }) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        v-show="mapTooltip.visible"
        ref="mapTooltipEl"
        class="map-sys-tooltip"
        :style="{ left: `${mapTooltip.x}px`, top: `${mapTooltip.y}px` }"
      >
        <div class="mst-sys">{{ mapTooltip.title }}</div>
        <div v-if="!mapTooltip.rows.length" class="mst-row">
          <span>{{ t('map.noActiveTimers') }}</span>
        </div>
        <div v-for="row in mapTooltip.rows" :key="row.id" class="mst-row">
          <span class="mst-dot" :class="row.status === 'Hostile' ? 'hostile' : 'friendly'" :title="translateStatus(row.status)" />
          <div style="display:flex;flex-direction:column;gap:2px;flex:1;min-width:0;">
            <span class="mst-name" style="font-weight:700;">{{ row.name }}<span v-if="row.owner"> ({{ row.owner }})</span></span>
            <span class="mst-struct" style="font-size:12px;color:var(--text-3);">{{ translateStructure(row.structure) }} · {{ translateState(row.state) }}</span>
          </div>
          <span class="mst-cd" :class="row.countdownCls">{{ row.countdown }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.summary-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
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
}

.summary-empty {
  padding: 36px 12px;
  text-align: center;
  color: var(--text-3);
  background: var(--bg-surface);
  border: 1px solid var(--border);
}

.map-wrap {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  align-items: flex-start;
}

.map-svg-wrap {
  flex: 1;
  min-width: 300px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 8px;
  overflow: hidden;
}

.map-svg-wrap svg {
  width: 100%;
  height: auto;
  display: block;
}

.map-breadcrumb {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  color: var(--text-3);
  font-size: 11px;
}

.map-breadcrumb-link {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 3px;
  color: var(--text-2);
  cursor: pointer;
  font-family: var(--font-sans);
  font-size: 14px;
  font-weight: 600;
  padding: 4px 8px;
  transition: border-color 0.1s, color 0.1s, background 0.1s;
}

.map-breadcrumb-link:hover {
  background: var(--bg-hover);
  border-color: var(--border-mid);
  color: var(--text-1);
}

.map-breadcrumb-link[aria-current='page'] {
  color: var(--text-1);
  cursor: default;
}

.map-breadcrumb-separator {
  color: var(--text-3);
  font-family: var(--font-mono);
}

.map-breadcrumb-current {
  color: var(--text-1);
  font-size: 14px;
  font-weight: 700;
}

.map-sidebar {
  width: 20rem;
  flex-shrink: 0;
}

.map-region-card {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 3px;
  padding: 8px 10px;
  margin-bottom: 6px;
  cursor: pointer;
  transition: border-color 0.1s;
}

.map-region-card:hover {
  border-color: var(--border-mid);
}

.map-region-card.active {
  border-color: var(--blue);
}

.map-rc-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-1);
  margin-bottom: 4px;
}

.map-rc-bars {
  display: flex;
  gap: 4px;
  align-items: center;
}

.map-rc-bar {
  height: 6px;
  border-radius: 2px;
  min-width: 4px;
}

.map-rc-bar.hostile {
  background: var(--red);
}

.map-rc-bar.friendly {
  background: var(--green);
}

.map-rc-nums {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-3);
  margin-left: 4px;
}

.map-legend {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 12px;
  color: var(--text-3);
  margin-bottom: 8px;
  align-items: center;
}

.map-legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.map-legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.map-triage-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.map-triage-label {
  font-size: 14px;
  color: var(--text-3);
  text-transform: uppercase;
}

.map-triage-select {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  color: var(--text-1);
  border-radius: 3px;
  padding: 4px 8px;
  font-size: 14px;
}

.map-wave-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.22);
  display: inline-block;
}

.map-wave-dot.wave-now {
  background: #ff4d5d;
}

.map-wave-dot.wave-soon {
  background: #ffb22e;
}

.map-wave-dot.wave-later {
  background: #35b8ff;
}

.map-wave-dot.wave-future {
  background: #a8b3c2;
}

.map-actions {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 3px;
  padding: 10px 12px;
  margin-top: 8px;
}

.map-actions-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-1);
  margin-bottom: 8px;
}

.map-actions-empty {
  font-size: 11px;
  color: var(--text-3);
}

.map-wave-group {
  margin-top: 12px;
}

.map-wave-group:first-of-type {
  margin-top: 0;
}

.map-wave-head {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 700;
  color: var(--text-2);
  text-transform: uppercase;
  margin-bottom: 5px;
}

.map-action-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 0;
  border-top: 1px solid var(--border);
  font-size: 14px;
}

.map-action-row:first-of-type {
  border-top: none;
}

.map-action-main {
  min-width: 0;
  flex: 1 1 0%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.map-action-row {
  font-family: var(--font-mono);
  font-weight: 700;
  color: var(--blue);
}

/* Left side should ellipsize if there's not enough space; right side has priority and won't shrink */
.map-action-main .map-action-sys,
.map-action-main .map-action-meta {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.map-action-row > div:last-child {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.map-action-meta {
    .map-action-row .status-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      display: inline-block;
      margin-right: 6px;
    }

  color: var(--text-3);
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.map-action-time {
  font-family: var(--font-mono);
  color: var(--text-1);
  white-space: nowrap;
  text-align: right;
}

.map-action-count {
  font-family: var(--font-mono);
  color: var(--text-3);
  font-size: 12px;
  text-align: right;
  white-space: nowrap;
}

.map-sys-tooltip {
  position: fixed;
  z-index: 200;
  pointer-events: none;
  background: var(--bg-surface);
  border: 1px solid var(--border-mid);
  border-radius: 4px;
  padding: 8px 10px;
  min-width: 160px;
  max-width: 360px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  font-size: 11px;
  color: var(--text-1);
}

.map-region-canvas {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.01), rgba(0, 0, 0, 0.03));
  border: 1px solid var(--border);
  border-radius: 4px;
}

/* Prevent text selection while panning or interacting with the maps */
.map-svg-wrap,
.map-svg-wrap svg,
.map-region-canvas,
.map-region-canvas svg,
.map-sidebar {
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
}

.map-region-edges line {
  transition: opacity 0.12s ease;
}

.map-universe-links line {
  transition: stroke 0.12s ease, opacity 0.12s ease;
}

.map-region-canvas g:hover > line {
  opacity: 1;
}

@media (max-width: 1439px) {
  .map-wrap {
    flex-direction: column;
  }

  .map-svg-wrap {
    width: 100%;
    min-width: 0;
  }

  .map-sidebar {
    width: 100%;
    box-sizing: border-box;
    padding-left: 8px;
    padding-right: 8px;
  }
}
</style>

