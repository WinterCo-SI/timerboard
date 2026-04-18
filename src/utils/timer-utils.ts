import { MAJOR_STRUCTURES, SYSTEM_REGION_LOOKUP, VISUAL_MAJOR_STRUCTURES } from '../data/timers';
import type { Timer } from '../types/timer';

const TIMER_TEXT_LIMITS = {
  region: 80,
  system: 32,
  name: 180,
  structure: 64,
  state: 32,
  countdown: 32,
  tag: 32,
};

export function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

export function timerDateTime(timer: Pick<Timer, 'date' | 'time'>): Date {
  return new Date(`${timer.date}T${timer.time}:00Z`);
}

export function countdown(ms: number): string {
  if (ms <= 0) return 'elapsed';
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 48) return `${Math.floor(h / 24)}d ${h % 24}h`;
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
}

export function countdownClass(ms: number): '' | 'soon' | 'urgent' {
  if (ms <= 0) return '';
  if (ms < 30 * 60 * 1000) return 'urgent';
  if (ms < 2 * 3600 * 1000) return 'soon';
  return '';
}

export function todayUtcDate(now: Date): string {
  return now.toISOString().split('T')[0] ?? '';
}

export function toUtcClock(now: Date): string {
  return `${pad2(now.getUTCHours())}:${pad2(now.getUTCMinutes())}:${pad2(now.getUTCSeconds())}`;
}

export function formatDate(date: string, withYear = true): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(withYear ? { year: 'numeric' } : {}),
    timeZone: 'UTC',
  });
}

export function stateKey(state: string): 'final' | 'armor' | 'anchor' | 'hull' | '' {
  const value = state.toLowerCase();
  if (value === 'final') return 'final';
  if (value === 'armor' || value === 'armour') return 'armor';
  if (value.includes('anchor')) return 'anchor';
  if (value === 'hull') return 'hull';
  return '';
}

export function normalizeRegionName(raw: string): string {
  const value = raw.trim();
  if (!value) return '';
  return value
    .split(/\s+/)
    .map((chunk) => `${chunk.charAt(0).toUpperCase()}${chunk.slice(1).toLowerCase()}`)
    .join(' ');
}

export function normalizeStructureName(raw: string): string {
  const value = raw
    .replace(/^[\[]|[\]]$/g, '')
    .replace(/^[^A-Za-z]+/, '')
    .trim();
  const lower = value.toLowerCase();

  const table: Array<[string, string]> = [
    ['ansiblex jump bridge', 'Ansiblex Jump Bridge'],
    ['orbital skyhook', 'Orbital Skyhook'],
    ['metenox moon drill', 'Metenox Moon Drill'],
    ['metenox', 'Metenox Moon Drill'],
    ['motonox moon drill', 'Metenox Moon Drill'],
    ['moon drill', 'Metenox Moon Drill'],
    ['skyhhook', 'Orbital Skyhook'],
    ['skyhook', 'Orbital Skyhook'],
    ['astra', 'Astrahus'],
    ['ansi', 'Ansiblex Jump Bridge'],
    ['ihub', 'Infrastructure Hub'],
    ['infrastructure hub', 'Infrastructure Hub'],
    ['i-hub', 'Infrastructure Hub'],
    ['tcu', 'TCU'],
    ['fortizar', 'Fortizar'],
  ];

  const found = table.find(([needle]) => lower.includes(needle));
  if (found) return found[1];

  return value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : 'Unknown';
}

export function isValidTimerDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function isValidTimerTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function cleanText(value: unknown, maxLen: number): string {
  return String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

export function normalizeTimerState(value: unknown): string {
  const cleaned = cleanText(value, TIMER_TEXT_LIMITS.state);
  const key = stateKey(cleaned);
  if (key === 'final') return 'Hull';
  if (key === 'armor') return 'Armor';
  if (key === 'anchor') return 'Anchoring';
  if (key === 'hull') return 'Hull';
  return cleaned ? `${cleaned.charAt(0).toUpperCase()}${cleaned.slice(1).toLowerCase()}` : 'Hull';
}

function normalizeTimerStatus(value: unknown): 'Friendly' | 'Hostile' {
  return String(value ?? '').trim() === 'Friendly' ? 'Friendly' : 'Hostile';
}

export function enrichTimerRegions(list: Timer[]): Timer[] {
  return list.map((timer) => {
    const fallback = SYSTEM_REGION_LOOKUP[timer.system] ?? '';
    const region = timer.region.trim() || fallback;
    return { ...timer, region };
  });
}

export function sanitizeTimer(raw: Partial<Timer>): Timer | null {
  const date = cleanText(raw.date, 10);
  const time = cleanText(raw.time, 5);
  const system = cleanText(raw.system, TIMER_TEXT_LIMITS.system);

  if (!isValidTimerDate(date) || !isValidTimerTime(time) || !system) return null;

  return {
    date,
    time,
    system,
    region: normalizeRegionName(cleanText(raw.region, TIMER_TEXT_LIMITS.region)),
    name: cleanText(raw.name || '--', TIMER_TEXT_LIMITS.name) || '--',
    structure: normalizeStructureName(cleanText(raw.structure || 'Unknown', TIMER_TEXT_LIMITS.structure)),
    state: normalizeTimerState(raw.state),
    status: normalizeTimerStatus(raw.status),
    owner: cleanText((raw as any).owner || (raw as any).owner_ticker || '', TIMER_TEXT_LIMITS.tag),
    countdown: cleanText(raw.countdown, TIMER_TEXT_LIMITS.countdown),
    tag: cleanText(raw.tag, TIMER_TEXT_LIMITS.tag),
  };
}

export function sanitizeTimerList(list: Partial<Timer>[]): Timer[] {
  return enrichTimerRegions(list.map(sanitizeTimer).filter((timer): timer is Timer => Boolean(timer)));
}

export function timeOfDayClass(time: string): 'morning' | 'afternoon' | 'evening' {
  const hour = Number.parseInt(time.split(':')[0] ?? '0', 10);
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

export function isMajor(timer: Timer): boolean {
  return MAJOR_STRUCTURES.includes(timer.structure);
}

export function isVisualMajor(timer: Timer): boolean {
  return VISUAL_MAJOR_STRUCTURES.includes(timer.structure);
}

const FRIENDLY_OWNER_TICKERS = new Set([
  '.away/evil.', '.los/frt', '.red-/frt', '.stor/test', '8dir/test', 'b0rt/test', 'cacx/frt',
  'drowi/test', 'frcc/frt', 'frt', 'frtbm/frt', 'k.d.j/test', 'ktro/test', 'lumbo/test',
  'mace1/test', 'nc', 'nhpp/nc', 'p3wn/nc', 'sard./frt', 'sc-un/frt', 'sibsq/sb-sq',
  'suad/test', 'test', 'tiaas/test', 'ukoc/test', 'upvot/test', 'xbda/test', 'yuese/frt',
]);
const HOSTILE_OWNER_TICKERS = new Set(['init', 'initiative', 'condi']);

function classifyOwnerStatus(ownerRaw: string): 'Friendly' | 'Hostile' {
  const key = ownerRaw.trim().toLowerCase();
  if (key === 'friendly') return 'Friendly';
  if (key === 'hostile') return 'Hostile';
  if (FRIENDLY_OWNER_TICKERS.has(key)) return 'Friendly';
  if (HOSTILE_OWNER_TICKERS.has(key)) return 'Hostile';
  return 'Hostile';
}

function extractRegionAndSystem(raw: string): { region: string; system: string } {
  const regionMatch = raw.match(/^\[([^\]]+)\]\s*/);
  const region = regionMatch ? normalizeRegionName(regionMatch[1] ?? '') : '';
  const system = (regionMatch ? raw.slice(regionMatch[0].length) : raw).trim();
  return { region, system };
}

function looksLikeStructure(value: string): boolean {
  const lower = value.toLowerCase();
  const structureKeywords = [
    'keepstar', 'fortizar', 'sotiyo', 'azbel', 'tatara', 'athanor', 'raitaru', 'astrahus', 'astra',
    'ansiblex', 'jump bridge', 'cyno jammer', 'cyno beacon', 'metenox moon drill', 'moon drill',
    'orbital skyhook', 'skyhook', 'ihub', 'tcu', 'ansi', 'poco',
  ];
  return structureKeywords.some((keyword) => lower.includes(keyword));
}

export function parseDiscordTimerLine(line: string): Timer | null {
  const raw = line.trim();
  if (!raw) return null;

  const pattern = /^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})\s+(.+?)\s+-\s+(.+?)\s+\[(.+?)\]\[([^\]]+)\]\[([^\]]+)\]\s*(?:\(([^)]+)\))?\s*(?:\[(#[^\]]+)\])?\s*$/i;
  const match = raw.match(pattern);
  if (!match) return null;

  const date = match[1] ?? '';
  const time = match[2] ?? '';
  const where = match[3] ?? '';
  const name = match[4] ?? '';
  const first = (match[5] ?? '').trim();
  const second = (match[6] ?? '').trim();
  const third = (match[7] ?? '').trim();
  const countdownRaw = (match[8] ?? '').trim();
  const tagRaw = (match[9] ?? '').trim();

  const { region, system } = extractRegionAndSystem(where);

  const [structureRaw, ownerRaw, stateRaw] = looksLikeStructure(first)
    ? [first, second, third]
    : looksLikeStructure(second)
      ? [second, first, third]
      : [first, second, third];

  const parsed = sanitizeTimer({
    date,
    time,
    region,
    system,
    name,
    structure: structureRaw,
    state: stateRaw,
    status: classifyOwnerStatus(ownerRaw),
    countdown: countdownRaw,
    tag: tagRaw,
  });

  return parsed;
}
