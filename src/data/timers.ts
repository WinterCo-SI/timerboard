import type { Timer } from '../types/timer';
import { REGION_SYSTEMS } from './map';

export const MAJOR_STRUCTURES = ['Keepstar', 'Fortizar'];
export const VISUAL_MAJOR_STRUCTURES = ['Keepstar', 'Sotiyo', 'Fortizar'];

// Build SYSTEM_REGION_LOOKUP from REGION_SYSTEMS so the map generation is authoritative
export const SYSTEM_REGION_LOOKUP: Record<string, string> = (() => {
  const out: Record<string, string> = {};
  for (const region of Object.keys(REGION_SYSTEMS)) {
    const systems = REGION_SYSTEMS[region] ?? [];
    for (const sys of systems) {
      out[sys] = region;
    }
  }
  return out;
})();

export const RAW_TIMERS: Timer[] = [
  { date: '2026-04-10', time: '13:33', system: 'Atioth', name: 'Insidious. ihub', structure: 'IHub', state: 'Final', status: 'Hostile', region: 'Geminate' },
  { date: '2026-04-11', time: '10:03', system: '6RQ9-A', name: 'TEST Forward IHub', structure: 'IHub', state: 'Final', status: 'Friendly', region: 'Geminate' },
  { date: '2026-04-11', time: '10:06', system: 'TDE4-H', name: 'TEST Border IHub', structure: 'IHub', state: 'Final', status: 'Friendly', region: 'Geminate' },
  { date: '2026-04-11', time: '10:24', system: 'D-I9HJ', name: 'Geminate Infrastructure Hub', structure: 'IHub', state: 'Armor', status: 'Friendly', region: 'Geminate' },
  { date: '2026-04-11', time: '11:12', system: 'P-FSQE', name: 'Venal TCU', structure: 'TCU', state: 'Final', status: 'Friendly', region: 'Venal' },
  { date: '2026-04-11', time: '11:47', system: 'RQH-MY', name: 'Pure Blind Infrastructure Hub', structure: 'IHub', state: 'Final', status: 'Friendly', region: 'Pure Blind' },
  { date: '2026-04-11', time: '12:18', system: 'RD-G2R', name: 'Pure Blind Frontline IHub', structure: 'IHub', state: 'Armor', status: 'Friendly', region: 'Pure Blind' },
  { date: '2026-04-11', time: '12:42', system: '00TY-J', name: 'Western TCU', structure: 'TCU', state: 'Final', status: 'Friendly', region: 'Pure Blind' },
  { date: '2026-04-11', time: '18:15', system: 'VSJ-PP', name: 'Hostile Beachhead IHub', structure: 'IHub', state: 'Armor', status: 'Hostile', region: 'Geminate' },
  { date: '2026-04-11', time: '19:40', system: 'XI-VUF', name: 'Border TCU', structure: 'TCU', state: 'Final', status: 'Friendly', region: 'Pure Blind' },
  { date: '2026-04-12', time: '09:15', system: '6RQ9-A', name: 'TEST Capital IHub', structure: 'IHub', state: 'Final', status: 'Friendly', region: 'Geminate' },
  { date: '2026-04-12', time: '09:48', system: 'TDE4-H', name: 'Geminate South IHub', structure: 'IHub', state: 'Final', status: 'Friendly', region: 'Geminate' },
  { date: '2026-04-12', time: '10:22', system: 'Atioth', name: 'Counterattack IHub', structure: 'IHub', state: 'Armor', status: 'Hostile', region: 'Geminate' },
  { date: '2026-04-12', time: '11:03', system: 'RQH-MY', name: 'Pure Blind Main IHub', structure: 'IHub', state: 'Final', status: 'Friendly', region: 'Pure Blind' },
  { date: '2026-04-12', time: '11:26', system: 'RD-G2R', name: 'Northern IHub', structure: 'IHub', state: 'Final', status: 'Friendly', region: 'Pure Blind' },
  { date: '2026-04-12', time: '12:05', system: 'Q-7SUI', name: 'Pure Blind TCU', structure: 'TCU', state: 'Final', status: 'Friendly', region: 'Pure Blind' },
  { date: '2026-04-12', time: '12:34', system: '7-K5EL', name: 'Vale Test IHub', structure: 'IHub', state: 'Final', status: 'Friendly', region: 'Vale of the Silent' },
  { date: '2026-04-12', time: '13:02', system: 'H-5GUI', name: 'Vale Forward TCU', structure: 'TCU', state: 'Armor', status: 'Friendly', region: 'Vale of the Silent' },
  { date: '2026-04-12', time: '13:41', system: 'H-UCD1', name: 'Hostile Vale IHub', structure: 'IHub', state: 'Final', status: 'Hostile', region: 'Vale of the Silent' },
  { date: '2026-04-12', time: '14:16', system: 'FS-RFL', name: 'Vale Northern Skyhook', structure: 'Skyhook', state: 'Final', status: 'Friendly', region: 'Vale of the Silent' },
  { date: '2026-04-12', time: '14:58', system: 'N-HSK0', name: 'Vale Border TCU', structure: 'TCU', state: 'Armor', status: 'Hostile', region: 'Vale of the Silent' },
  { date: '2026-04-12', time: '15:24', system: 'Q-EHMJ', name: 'Vale Rear IHub', structure: 'IHub', state: 'Final', status: 'Friendly', region: 'Vale of the Silent' },
  { date: '2026-04-13', time: '10:15', system: 'VFK-IV', name: 'Deklein Sample IHub', structure: 'IHub', state: 'Final', status: 'Friendly', region: 'Deklein' },
  { date: '2026-04-13', time: '10:45', system: 'RQH-MY', name: 'Pure Blind Sample TCU', structure: 'TCU', state: 'Armor', status: 'Hostile', region: 'Pure Blind' },
  { date: '2026-04-13', time: '11:15', system: 'YJ3-UT', name: 'Branch Sample Astrahus', structure: 'Astrahus', state: 'Final', status: 'Friendly', region: 'Branch' },
  { date: '2026-04-13', time: '11:45', system: '0M-103', name: 'Tenal Sample IHub', structure: 'IHub', state: 'Armor', status: 'Hostile', region: 'Tenal' },
  { date: '2026-04-13', time: '12:15', system: 'FIO1-8', name: 'Fade Sample Athanor', structure: 'Athanor', state: 'Final', status: 'Friendly', region: 'Fade' },
  { date: '2026-04-13', time: '12:45', system: 'PF-QHK', name: 'Venal Sample Fortizar', structure: 'Fortizar', state: 'Final', status: 'Hostile', region: 'Venal' },
];
