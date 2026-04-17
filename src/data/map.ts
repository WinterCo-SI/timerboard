export type MapTriagePreset = 'all' | 'friendlySov' | 'friendlyMajors' | 'hostileMajors' | 'keepstars';

import {
  REGION_CONNECTIONS as GENERATED_REGION_CONNECTIONS,
  REGION_EDGES as GENERATED_REGION_EDGES,
  REGION_POSITIONS as GENERATED_REGION_POSITIONS,
  REGION_SYSTEMS as GENERATED_REGION_SYSTEMS,
  REGION_SYSTEM_POSITIONS as GENERATED_REGION_SYSTEM_POSITIONS,
} from './map.generated';

export const MAP_TRIAGE_PRESETS: Record<MapTriagePreset, string> = {
  all: 'All timers',
  friendlySov: 'Friendly sov',
  friendlyMajors: 'Friendly majors',
  hostileMajors: 'Hostile majors',
  keepstars: 'Keepstars',
};

export interface WaveMeta {
  id: 'now' | 'soon' | 'later' | 'future';
  label: string;
  maxMs: number;
  color: string;
  cls: string;
}

export const MAP_WAVES: WaveMeta[] = [
  { id: 'now', label: '0-2h', maxMs: 2 * 3600 * 1000, color: '#ff4d5d', cls: 'wave-now' },
  { id: 'soon', label: '2-6h', maxMs: 6 * 3600 * 1000, color: '#ffb22e', cls: 'wave-soon' },
  { id: 'later', label: '6-12h', maxMs: 12 * 3600 * 1000, color: '#35b8ff', cls: 'wave-later' },
  { id: 'future', label: '12h+', maxMs: Number.POSITIVE_INFINITY, color: '#a8b3c2', cls: 'wave-future' },
];
export const REGION_POSITIONS: Record<string, [number, number]> = GENERATED_REGION_POSITIONS;

export const REGION_SYSTEMS: Record<string, string[]> = GENERATED_REGION_SYSTEMS;

export const REGION_SYSTEM_POSITIONS: Record<string, Record<string, [number, number]>> = GENERATED_REGION_SYSTEM_POSITIONS;

export const REGION_EDGES: Record<string, Array<[string, string]>> = GENERATED_REGION_EDGES;

export const REGION_CONNECTIONS: Array<[string, string]> = GENERATED_REGION_CONNECTIONS;
