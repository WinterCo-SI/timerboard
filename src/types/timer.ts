export type TimerState = 'Final' | 'Armor' | 'Anchoring' | 'Hull' | string;
export type TimerStatus = 'Friendly' | 'Hostile';

export interface Timer {
  date: string;
  time: string;
  system: string;
  name: string;
  structure: string;
  state: TimerState;
  status: TimerStatus;
  region: string;
  countdown?: string;
  tag?: string;
}

export type TimerView = 'summary' | 'table' | 'dense' | 'gantt' | 'map';

export interface FilterState {
  side: TimerStatus[];
  state: Array<'Final' | 'Armor' | 'Anchoring'>;
  major: boolean;
  regions: string[];
  hiddenStructures: string[];
}

export interface TimerStats {
  total: number;
  friendly: number;
  hostile: number;
  major: number;
  armor: number;
}
