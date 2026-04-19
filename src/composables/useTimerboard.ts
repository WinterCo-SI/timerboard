import { defineStore } from 'pinia';
import { computed, reactive, ref } from 'vue';
import { generateSampleTimerText } from '../data/sample-timers';
import {
  MAJOR_STRUCTURES,
  RAW_TIMERS,
  SYSTEM_REGION_LOOKUP,
} from '../data/timers';
import i18next from '../i18n';
import type { FilterState, Timer, TimerStats, TimerView } from '../types/timer';
import {
  countdown,
  eveTimeContext,
  localDateKey,
  localDayProgressPercent,
  localTimeLabel,
  localTimelinePercent,
  localTimeZoneLabel,
  localTodayDate,
  normalizeStructureName,
  normalizeTimerState,
  parseDiscordTimerLine,
  sanitizeTimerList,
  stateKey,
  timerDateTime,
  toUtcClock,
} from '../utils/timer-utils';

const TIMER_DATA_KEY = 'timerboardTimersV4';
const TIMER_API_URL = import.meta.env.PUBLIC_TIMERS_API_URL?.trim() ?? '';
const TIMER_SSE_URL = import.meta.env.PUBLIC_TIMERS_SSE_URL?.trim() ?? '';
const TIMER_POLL_MS = (() => {
  const raw =
    import.meta.env.PUBLIC_TIMERS_POLL_MS ??
    import.meta.env.PUBLIC_TIMERS_POLL_INTERVAL_MS ??
    '';
  const n = Number.parseInt(String(raw), 10);
  return Number.isFinite(n) && n > 0 ? n : 5 * 60 * 1000; // default 5 minutes
})();
const DISABLE_PASTE = Boolean(import.meta.env.PUBLIC_DISABLE_PASTE_TIMERS);
const HAS_API = Boolean(TIMER_API_URL);
const HAS_SSE = Boolean(TIMER_SSE_URL);

type TimerSnapshotPayload = {
  timers?: Partial<Timer>[];
};

type TimerUpsertPayload = {
  timer?: Partial<Timer>;
  timers?: Partial<Timer>[];
};

type TimerDeletePayload = {
  key?: string;
  timer?: Partial<Timer>;
  keys?: string[];
};

export const useTimerboard = defineStore('timerboard', () => {
  const now = ref(new Date());
  const currentView = ref<TimerView>('table');
  const isLightTheme = ref(false);
  const showImportModal = ref(false);
  const importText = ref('');
  const importStatus = ref('');

  const filters = reactive<FilterState>({
    side: [],
    state: [],
    major: false,
    regions: [],
    hiddenStructures: [],
  });

  const collapsedDates = ref<string[]>([]);

  const timers = ref<Timer[]>([]);
  let eventSource: EventSource | null = null;

  function timerKey(
    timer: Pick<Timer, 'date' | 'time' | 'system' | 'structure' | 'name'>,
  ): string {
    return `${timer.date}|${timer.time}|${timer.system}|${timer.structure}|${timer.name}`;
  }

  function sortTimersInPlace(list: Timer[]) {
    list.sort((a, b) =>
      `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`),
    );
  }

  function extractTimersPayload(payload: unknown): Partial<Timer>[] {
    // Normalize payloads from different API shapes into Partial<Timer>[]
    const mapApiTimer = (obj: any): Partial<Timer> | null => {
      if (!obj || typeof obj !== 'object') return null;

      // If already has date/time keys, prefer them
      if (obj.date && obj.time) {
        const sys = obj.system
          ? String(obj.system)
          : String(obj.system_name || obj.systemName || obj.system || '');
        const region = obj.region
          ? String(obj.region)
          : typeof sys === 'string' && sys
            ? SYSTEM_REGION_LOOKUP[sys] || ''
            : '';
        return {
          id: obj.id ? String(obj.id) : '',
          date: String(obj.date),
          time: String(obj.time),
          system: sys,
          name: obj.name
            ? String(obj.name)
            : String(obj.title || obj.name || ''),
          structure: obj.structure
            ? String(obj.structure)
            : String(obj.type || obj.structure_type || ''),
          state: obj.state
            ? String(obj.state)
            : String(obj.stage || obj.state || ''),
          // Preserve owner_ticker separately and keep status sourced from stance/status
          status: obj.stance ? String(obj.stance) : String(obj.status || ''),
          owner: obj.owner_ticker
            ? String(obj.owner_ticker)
            : obj.owner
              ? String(obj.owner)
              : '',
          region,
        };
      }

      // Support APIs that provide an ISO timestamp `until`
      if (obj.until) {
        try {
          const d = new Date(String(obj.until));
          if (!Number.isNaN(d.getTime())) {
            const date = d.toISOString().slice(0, 10);
            const time = d.toISOString().slice(11, 16);
            const sys = obj.system
              ? String(obj.system)
              : String(obj.system_name || obj.systemName || '');
            const region = obj.region
              ? String(obj.region)
              : sys
                ? SYSTEM_REGION_LOOKUP[sys] || ''
                : '';
            return {
              id: obj.id ? String(obj.id) : '',
              date,
              time,
              system: sys,
              name: obj.name
                ? String(obj.name)
                : String(obj.title || obj.name || ''),
              structure: obj.type
                ? String(obj.type)
                : String(obj.structure || ''),
              state: obj.stage ? String(obj.stage) : String(obj.state || ''),
              // Preserve owner_ticker separately and keep status sourced from stance/status
              status: obj.stance
                ? String(obj.stance)
                : String(obj.status || ''),
              owner: obj.owner_ticker
                ? String(obj.owner_ticker)
                : obj.owner
                  ? String(obj.owner)
                  : '',
              region,
            };
          }
        } catch {
          /* ignore */
        }
      }

      return null;
    };

    if (Array.isArray(payload))
      return (payload as Partial<Timer>[]).map((p) => p);
    if (!payload || typeof payload !== 'object') return [];
    const source = payload as { timers?: unknown };
    const rawList = Array.isArray(source.timers) ? source.timers : [];
    const mapped: Partial<Timer>[] = [];
    for (const item of rawList as any[]) {
      const mappedItem = mapApiTimer(item);
      if (!mappedItem) continue;
      // Ad-hoc rule: discard Orbital Skyhook entries when item.id === 'Auth'
      const idVal = item?.id ?? '';
      const struct = (mappedItem.structure || '').toLowerCase();
      const name = (mappedItem.name || '').toLowerCase();
      const status = (mappedItem.status || '').toLowerCase();
      if (String(idVal) === 'Auth' && struct.includes('skyhook') && status === 'friendly') continue;
      if (String(idVal) === 'TEST' && struct.includes('skyhook')) continue;
      if (String(idVal) === 'NC' && name.includes('[ihub]')) continue;
      mapped.push(mappedItem);
    }
    // Normalize state values and deduplicate by normalized system|name|structure|state — keep earliest timer
    const normalizeKey = (s: unknown) =>
      (typeof s === 'string' ? s : String(s ?? ''))
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
    for (const it of mapped) {
      if (it.state) it.state = normalizeTimerState(it.state);
    }

    const deduped = new Map<string, Partial<Timer>>();
    const SEAT_PRIORITY_WINDOW_MS = 2 * 60 * 1000; // 2 minutes
    for (const item of mapped) {
      // Deduplicate across states: base key excludes `state` so we can prefer SeAT when needed
      const key = `${normalizeKey(item.system)}|${normalizeKey(item.name)}|${normalizeStructureName(normalizeKey(item.structure))}`;
      const existing = deduped.get(key);
      if (!existing) {
        deduped.set(key, item);
        continue;
      }
      // If same name and very close times, prefer item with id === 'SeAT'
      try {
        const a = new Date(`${item.date}T${item.time}:00Z`).getTime();
        const b = new Date(`${existing.date}T${existing.time}:00Z`).getTime();
        if (
          !Number.isNaN(a) &&
          !Number.isNaN(b) &&
          normalizeKey(item.name) === normalizeKey(existing.name) &&
          Math.abs(a - b) <= SEAT_PRIORITY_WINDOW_MS
        ) {
          if ((item as any).id === 'SeAT' && (existing as any).id !== 'SeAT') {
            deduped.set(key, item);
            continue;
          }
          if ((existing as any).id === 'SeAT' && (item as any).id !== 'SeAT') {
            continue; // keep existing
          }
        }

        // Fallback: keep earliest
        if (!Number.isNaN(a) && (Number.isNaN(b) || a < b)) {
          deduped.set(key, item);
        }
      } catch {
        // fallback: keep existing
      }
    }

    return Array.from(deduped.values());
  }

  function setTimersFromRemote(list: Partial<Timer>[]) {
    const sanitized = sanitizeTimerList(list);
    sortTimersInPlace(sanitized);
    timers.value = sanitized;
    saveTimers();
  }

  function upsertTimers(list: Partial<Timer>[]) {
    const sanitized = sanitizeTimerList(list);
    if (!sanitized.length) return;

    const byKey = new Map(timers.value.map((item) => [timerKey(item), item]));
    for (const timer of sanitized) {
      byKey.set(timerKey(timer), timer);
    }

    const merged = Array.from(byKey.values());
    sortTimersInPlace(merged);
    timers.value = merged;
    saveTimers();
  }

  function deleteTimers(payload: TimerDeletePayload) {
    const keys = new Set<string>();
    if (typeof payload.key === 'string' && payload.key.trim())
      keys.add(payload.key.trim());
    for (const key of payload.keys ?? []) {
      if (typeof key === 'string' && key.trim()) keys.add(key.trim());
    }

    if (payload.timer) {
      const parsed = sanitizeTimer(payload.timer);
      if (parsed) keys.add(timerKey(parsed));
    }

    if (!keys.size) return;
    timers.value = timers.value.filter((timer) => !keys.has(timerKey(timer)));
    saveTimers();
  }

  function closeEventStream() {
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
  }

  function parseSseData(raw: string): unknown {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function applyServerEvent(type: string, payload: unknown) {
    if (type === 'snapshot') {
      setTimersFromRemote(extractTimersPayload(payload));
      return;
    }

    if (type === 'upsert') {
      const upsertPayload = payload as TimerUpsertPayload;
      const list = upsertPayload?.timer
        ? [upsertPayload.timer]
        : extractTimersPayload(upsertPayload);
      upsertTimers(list);
      return;
    }

    if (type === 'delete') {
      deleteTimers((payload as TimerDeletePayload) ?? {});
    }
  }

  async function fetchRemoteSnapshot() {
    if (!TIMER_API_URL) return;
    try {
      const response = await fetch(TIMER_API_URL, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        if (response.status === 401) {
          importStatus.value = i18next.t('status.api401');
          authRequired.value = true;
        } else {
          importStatus.value = i18next.t('status.apiReturned', {
            status: response.status,
          });
        }
        return;
      }

      const payload = (await response.json()) as
        | TimerSnapshotPayload
        | Partial<Timer>[];
      // Surface returned payload for diagnosis (always log so UI can be used to report issues)
      // eslint-disable-next-line no-console
      console.debug('[useTimerboard] fetchRemoteSnapshot:', {
        url: TIMER_API_URL,
        status: response.status,
        payload,
      });
      const extracted = extractTimersPayload(payload);
      if (!Array.isArray(payload) && !extracted.length) {
        console.debug(
          '[useTimerboard] fetchRemoteSnapshot: No timers extracted from payload',
          { payload },
        );
        importStatus.value = i18next.t('status.apiNoTimers', {
          keys:
            payload && typeof payload === 'object'
              ? Object.keys(payload).join(',')
              : typeof payload,
        });
        return;
      }

      // Diagnose sanitization: show counts for extracted vs sanitized
      const sanitizedPreview = sanitizeTimerList(
        Array.isArray(payload) ? (payload as Partial<Timer>[]) : extracted,
      );
      // eslint-disable-next-line no-console
      console.debug('[useTimerboard] fetchRemoteSnapshot counts:', {
        extracted: Array.isArray(payload) ? payload.length : extracted.length,
        sanitized: sanitizedPreview.length,
      });
      importStatus.value = i18next.t('status.apiTimers', {
        total: Array.isArray(payload) ? payload.length : extracted.length,
        usable: sanitizedPreview.length,
      });

      setTimersFromRemote(Array.isArray(payload) ? payload : extracted);
      lastFetchMs.value = Date.now();
    } catch {
      importStatus.value = i18next.t('status.apiFailed');
    }
  }

  function connectTimerStream() {
    if (
      !TIMER_SSE_URL ||
      typeof window === 'undefined' ||
      typeof window.EventSource === 'undefined'
    )
      return;

    closeEventStream();
    const stream = new EventSource(TIMER_SSE_URL);
    eventSource = stream;

    stream.addEventListener('snapshot', (event) => {
      const payload = parseSseData((event as MessageEvent).data);
      applyServerEvent('snapshot', payload);
    });

    stream.addEventListener('upsert', (event) => {
      const payload = parseSseData((event as MessageEvent).data);
      applyServerEvent('upsert', payload);
    });

    stream.addEventListener('delete', (event) => {
      const payload = parseSseData((event as MessageEvent).data);
      applyServerEvent('delete', payload);
    });

    stream.onmessage = (event) => {
      const payload = parseSseData(event.data);
      if (!payload || typeof payload !== 'object') return;

      const withType = payload as { type?: string; data?: unknown };
      if (!withType.type) return;
      applyServerEvent(withType.type, withType.data ?? payload);
    };

    stream.onerror = () => {
      // If SSE signals an error we can't parse status here; show reconnect message and fallback to polling.
      importStatus.value = i18next.t('status.liveDisconnected');
      // fallback to polling when stream errors
      startPolling();
    };
  }

  let pollIntervalId = 0;

  function startPolling() {
    if (pollIntervalId) return;
    if (!TIMER_API_URL) return;
    // initial fetch
    void fetchRemoteSnapshot();
    pollIntervalId = window.setInterval(
      () => void fetchRemoteSnapshot(),
      TIMER_POLL_MS,
    );
    importStatus.value = i18next.t('status.polling', {
      seconds: Math.round(TIMER_POLL_MS / 1000),
    });
  }

  function stopPolling() {
    if (pollIntervalId) {
      window.clearInterval(pollIntervalId);
      pollIntervalId = 0;
    }
  }

  async function manualRefresh() {
    try {
      await fetchRemoteSnapshot();
    } finally {
      stopPolling();
      if (!HAS_SSE && HAS_API) startPolling();
    }
  }

  function loadTimers(): Timer[] {
    try {
      const persisted = localStorage.getItem(TIMER_DATA_KEY);
      if (!persisted) return sanitizeTimerList(RAW_TIMERS);
      const parsed = JSON.parse(persisted) as Partial<Timer>[];
      return sanitizeTimerList(Array.isArray(parsed) ? parsed : RAW_TIMERS);
    } catch {
      return sanitizeTimerList(RAW_TIMERS);
    }
  }

  function saveTimers() {
    try {
      localStorage.setItem(TIMER_DATA_KEY, JSON.stringify(timers.value));
    } catch {
      // Ignore storage failures.
    }
  }

  function toggleTheme() {
    isLightTheme.value = !isLightTheme.value;
    const root = document.documentElement;
    if (isLightTheme.value) root.setAttribute('data-theme', 'light');
    else root.removeAttribute('data-theme');
  }

  function setView(view: TimerView) {
    currentView.value = view;
  }

  function closeModals() {
    showImportModal.value = false;
  }

  function openImport() {
    if (DISABLE_PASTE) {
      importStatus.value = i18next.t('status.pasteDisabled');
      return;
    }
    showImportModal.value = true;
    importText.value = '';
    importStatus.value = '';
  }

  function insertSampleTimers() {
    if (DISABLE_PASTE) {
      importStatus.value = i18next.t('status.pasteDisabled');
      return;
    }

    importText.value = generateSampleTimerText();
    importStatus.value = i18next.t('status.sampleTimersInserted', {
      count: 40,
    });
    window.setTimeout(() => {
      document.getElementById('importText')?.focus();
    }, 0);
  }

  function resetTimers() {
    timers.value = sanitizeTimerList(RAW_TIMERS);
    saveTimers();
  }

  function clearTimers() {
    timers.value = [];
    saveTimers();
  }

  function clearLocalData() {
    clearTimers();
    try {
      localStorage.removeItem(TIMER_DATA_KEY);
    } catch {
      // Ignore storage failures.
    }
  }

  function importTimers(mode: 'replace' | 'append') {
    if (DISABLE_PASTE) {
      importStatus.value = i18next.t('status.pasteDisabled');
      return;
    }
    const lines = importText.value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    const parsed: Timer[] = [];
    let failed = 0;

    for (const line of lines) {
      const timer = parseDiscordTimerLine(line);
      if (timer) parsed.push(timer);
      else if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}\b/.test(line)) failed += 1;
    }

    if (!parsed.length) {
      importStatus.value = failed
        ? i18next.t('status.noTimersParsed')
        : i18next.t('status.noTimersFound');
      return;
    }

    timers.value = mode === 'replace' ? parsed : timers.value.concat(parsed);
    sortTimersInPlace(timers.value);
    saveTimers();

    importStatus.value = `${i18next.t('status.imported', { count: parsed.length })}${failed ? i18next.t('status.failedLines', { count: failed }) : ''}`;
  }

  function toggleArrayFilter<T extends string>(arr: T[], value: T) {
    const index = arr.indexOf(value);
    if (index >= 0) arr.splice(index, 1);
    else arr.push(value);
  }

  function resetFilters() {
    filters.side = [];
    filters.state = [];
    filters.major = false;
    filters.regions = [];
    filters.hiddenStructures = [];
  }

  function toggleSide(value: 'Friendly' | 'Hostile') {
    toggleArrayFilter(filters.side, value);
  }

  function toggleState(value: 'Hull' | 'Armor' | 'Anchoring') {
    toggleArrayFilter(filters.state, value);
  }

  function toggleMajor() {
    filters.major = !filters.major;
  }

  function toggleRegion(region: string) {
    toggleArrayFilter(filters.regions, region);
  }

  function toggleStructureVisibility(structure: string, visible: boolean) {
    const hidden = filters.hiddenStructures.includes(structure);
    if (visible && hidden)
      filters.hiddenStructures = filters.hiddenStructures.filter(
        (item) => item !== structure,
      );
    if (!visible && !hidden) filters.hiddenStructures.push(structure);
  }

  function clearSideFilters() {
    filters.side = [];
  }

  function clearStateFilters() {
    filters.state = [];
  }

  function clearMajorFilter() {
    filters.major = false;
  }

  function clearRegionFilters() {
    filters.regions = [];
  }

  function clearStructureFilters() {
    filters.hiddenStructures = [];
  }

  function stateBucket(state: string): 'Hull' | 'Armor' | 'Anchoring' {
    const key = stateKey(state);
    if (key === 'hull') return 'Hull';
    if (key === 'armor') return 'Armor';
    return 'Anchoring';
  }

  const hasActiveFilters = computed(
    () =>
      filters.side.length > 0 ||
      filters.state.length > 0 ||
      filters.major ||
      filters.regions.length > 0 ||
      filters.hiddenStructures.length > 0,
  );

  const filteredTimers = computed(() => {
    return timers.value.filter((timer) => {
      if (filters.side.length > 0 && !filters.side.includes(timer.status))
        return false;
      if (
        filters.state.length > 0 &&
        !filters.state.includes(stateBucket(timer.state))
      )
        return false;
      if (filters.major && !MAJOR_STRUCTURES.includes(timer.structure))
        return false;
      if (
        filters.regions.length > 0 &&
        !filters.regions.includes(timer.region || 'Unknown')
      )
        return false;
      if (filters.hiddenStructures.includes(timer.structure)) return false;
      return true;
    });
  });

  const groupedByDate = computed(() => {
    const groups: Record<string, Timer[]> = {};
    for (const timer of filteredTimers.value) {
      const key = localDateKey(timer);
      if (!groups[key]) groups[key] = [];
      groups[key].push(timer);
    }
    Object.values(groups).forEach((timersInDay) => {
      timersInDay.sort(
        (a, b) => timerDateTime(a).getTime() - timerDateTime(b).getTime(),
      );
    });
    return groups;
  });

  const dayKeys = computed(() => Object.keys(groupedByDate.value).sort());
  const today = computed(() => localTodayDate(now.value));
  const utcClock = computed(() => toUtcClock(now.value));
  const nowMs = computed(() => now.value.getTime());

  const stats = computed<TimerStats>(() => ({
    total: timers.value.length,
    friendly: timers.value.filter((timer) => timer.status === 'Friendly')
      .length,
    hostile: timers.value.filter((timer) => timer.status === 'Hostile').length,
    major: timers.value.filter((timer) =>
      MAJOR_STRUCTURES.includes(timer.structure),
    ).length,
    armor: timers.value.filter((timer) => timer.state.toLowerCase() === 'armor')
      .length,
  }));

  const regionOptions = computed(() => {
    const unique = Array.from(
      new Set(timers.value.map((timer) => timer.region || 'Unknown')),
    );
    return unique.sort((a, b) => a.localeCompare(b));
  });

  const authRequired = ref(false);
  const lastFetchMs = ref<number>(0);

  const structureOptions = computed(() => {
    const unique = Array.from(
      new Set(timers.value.map((timer) => timer.structure)),
    );
    return unique.sort((a, b) => a.localeCompare(b));
  });

  const timeline = computed(() => {
    const progressPercent = localDayProgressPercent(now.value);

    const todaysTimers = timers.value.filter(
      (timer) => localDateKey(timer) === today.value,
    );
    const elapsed = todaysTimers.filter(
      (timer) => timerDateTime(timer).getTime() <= now.value.getTime(),
    ).length;

    const markers = todaysTimers.map((timer) => {
      const target = timerDateTime(timer);
      const isElapsed = timerDateTime(timer).getTime() <= now.value.getTime();
      return {
        id: `${timer.date}-${timer.time}-${timer.system}-${timer.structure}`,
        targetMs: target.getTime(),
        leftPercent: localTimelinePercent(target),
        status: timer.status,
        elapsed: isElapsed,
        major: MAJOR_STRUCTURES.includes(timer.structure),
        title: `${localTimeLabel(target)} ${localTimeZoneLabel(target)} - ${timer.system}`,
        name: timer.name,
        time: timer.time,
        localTimeLabel: localTimeLabel(target),
        localTimeZoneLabel: localTimeZoneLabel(target),
        eveTimeLabel: eveTimeContext(target),
        system: timer.system,
        structure: timer.structure,
        state: timer.state,
        region: timer.region || 'Unknown',
        countdown: countdown(
          timerDateTime(timer).getTime() - now.value.getTime(),
        ),
      };
    });

    return {
      progressPercent,
      elapsed,
      total: todaysTimers.length,
      label: localTimeLabel(now.value),
      markers,
    };
  });

  function collapseToggle(date: string) {
    if (collapsedDates.value.includes(date)) {
      collapsedDates.value = collapsedDates.value.filter(
        (item) => item !== date,
      );
    } else {
      collapsedDates.value.push(date);
    }
  }

  function expandAllDates() {
    collapsedDates.value = [];
  }

  function collapseAllDates() {
    collapsedDates.value = dayKeys.value.slice();
  }

  function timerCountdown(timer: Timer): string {
    return countdown(timerDateTime(timer).getTime() - now.value.getTime());
  }

  let intervalId = 0;
  let initialized = false;

  function initialize() {
    if (initialized) return;
    timers.value = loadTimers();
    void fetchRemoteSnapshot();
    // Prefer SSE when a URL is provided and the browser supports EventSource
    if (
      TIMER_SSE_URL &&
      typeof window !== 'undefined' &&
      typeof window.EventSource !== 'undefined'
    ) {
      connectTimerStream();
    } else {
      // No SSE configured or not supported — poll the API periodically
      startPolling();
    }
    intervalId = window.setInterval(() => {
      now.value = new Date();
    }, 1000);
    initialized = true;
  }

  function teardown() {
    if (intervalId) {
      window.clearInterval(intervalId);
      intervalId = 0;
    }
    closeEventStream();
    stopPolling();
    initialized = false;
  }

  return {
    now,
    currentView,
    isLightTheme,
    showImportModal,
    importText,
    importStatus,
    filters,
    timers,
    filteredTimers,
    groupedByDate,
    dayKeys,
    today,
    utcClock,
    nowMs,
    stats,
    regionOptions,
    structureOptions,
    hasActiveFilters,
    timeline,
    collapsedDates,
    setView,
    toggleTheme,
    closeModals,
    openImport,
    importTimers,
    insertSampleTimers,
    resetTimers,
    clearTimers,
    clearLocalData,
    resetFilters,
    toggleSide,
    toggleState,
    toggleMajor,
    toggleRegion,
    toggleStructureVisibility,
    clearSideFilters,
    clearStateFilters,
    clearMajorFilter,
    clearRegionFilters,
    clearStructureFilters,
    collapseToggle,
    expandAllDates,
    collapseAllDates,
    timerCountdown,
    initialize,
    teardown,
    authRequired,
    disablePaste: DISABLE_PASTE,
    lastFetchMs,
    manualRefresh,
    pollMs: TIMER_POLL_MS,
    hasApi: HAS_API,
    hasSse: HAS_SSE,
  };
});
