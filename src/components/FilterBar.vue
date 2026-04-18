<script setup lang="ts">
import { useTranslation } from 'i18next-vue';

import { ref } from 'vue';
import {
  translateRegion,
  translateState,
  translateStatus,
  translateStructure,
} from '../i18n';
import type { FilterState } from '../types/timer';

const SIDE_OPTIONS = ['Friendly', 'Hostile'] as const;
const STATE_OPTIONS = ['Hull', 'Armor', 'Anchoring'] as const;

defineProps<{
  filters: FilterState;
  hasActiveFilters: boolean;
  regionOptions: string[];
  structureOptions: string[];
}>();

const emit = defineEmits<{
  resetFilters: [];
  toggleMajor: [];
  toggleSide: [value: 'Friendly' | 'Hostile'];
  toggleState: [value: 'Hull' | 'Armor' | 'Anchoring'];
  toggleRegion: [region: string];
  setStructureVisibility: [structure: string, visible: boolean];
}>();

const { t } = useTranslation();

function summarizeSelection(selected: string[], allOptions: readonly string[]) {
  if (!selected.length) return t('common.all');
  if (selected.length === allOptions.length) return t('common.all');
  if (selected.length <= 2)
    return selected.map((item) => translateState(item)).join(', ');
  return t('common.selected', { count: selected.length });
}

function summarizeSide(selected: string[]) {
  if (!selected.length) return t('common.all');
  if (selected.length === SIDE_OPTIONS.length) return t('common.all');
  return selected.map((item) => translateStatus(item)).join(', ');
}
const openGroup = ref<string | null>(null);

function toggleGroup(id: string) {
  openGroup.value = openGroup.value === id ? null : id;
}
</script>

<template>
  <section class="controls">
    <span class="filter-label">{{ t('filters.label') }}</span>
    <button class="tool-btn filter-reset" :class="{ active: !hasActiveFilters }" @click="emit('resetFilters')">{{ t('common.all') }}</button>
    <button class="tool-btn" :class="{ active: filters.major }" @click="emit('toggleMajor')">{{ t('common.major') }}</button>

    <details class="filter-group filter-dropdown" :open="openGroup === 'side'">
      <summary @click.prevent="toggleGroup('side')">
        {{ t('filters.side') }}
        <span class="filter-count">{{ summarizeSide(filters.side) }}</span>
      </summary>
      <div class="filter-group-body region-list">
        <label v-for="side in SIDE_OPTIONS" :key="side" class="check-item">
          <input :checked="filters.side.includes(side)" type="checkbox" @change="emit('toggleSide', side)" />
          <span>{{ translateStatus(side) }}</span>
        </label>
      </div>
    </details>

    <details class="filter-group filter-dropdown" :open="openGroup === 'state'">
      <summary @click.prevent="toggleGroup('state')">
        {{ t('filters.state') }}
        <span class="filter-count">{{ summarizeSelection(filters.state, STATE_OPTIONS) }}</span>
      </summary>
      <div class="filter-group-body region-list">
        <label v-for="state in STATE_OPTIONS" :key="state" class="check-item">
          <input :checked="filters.state.includes(state)" type="checkbox" @change="emit('toggleState', state)" />
          <span>{{ translateState(state) }}</span>
        </label>
      </div>
    </details>

    <details class="filter-group filter-dropdown" :open="openGroup === 'region'">
      <summary @click.prevent="toggleGroup('region')">
        {{ t('filters.region') }} <span class="filter-count">{{ filters.regions.length || t('common.all') }}</span>
      </summary>
      <div class="filter-group-body region-list">
        <label v-for="region in regionOptions" :key="region" class="check-item">
          <input :checked="filters.regions.includes(region)" type="checkbox" @change="emit('toggleRegion', region)" />
          <span>{{ translateRegion(region) }}</span>
        </label>
      </div>
    </details>

    <details class="filter-group filter-dropdown" :open="openGroup === 'structure'">
      <summary @click.prevent="toggleGroup('structure')">
        {{ t('filters.structure') }}
        <span class="filter-count">{{ structureOptions.length - filters.hiddenStructures.length }}/{{ structureOptions.length }}</span>
      </summary>
      <div class="filter-group-body region-list">
        <label v-for="structure in structureOptions" :key="structure" class="check-item">
          <input
            :checked="!filters.hiddenStructures.includes(structure)"
            type="checkbox"
            @change="(event) => emit('setStructureVisibility', structure, (event.target as HTMLInputElement).checked)"
          />
          <span>{{ translateStructure(structure) }}</span>
        </label>
      </div>
    </details>
  </section>
</template>

<style scoped>
.controls {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  flex-wrap: wrap;
  padding: 8px;
  background: rgba(255, 255, 255, 0.015);
  border: 1px solid var(--border);
  border-radius: 6px;
}

.filter-group {
  border: 0;
  position: relative;
}

.filter-group > summary {
  list-style: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  color: var(--text-2);
  font-family: var(--font-sans);
  font-size: 11px;
  font-weight: 500;
  padding: 4px 9px;
  border-radius: 3px;
  text-transform: none;
}

.filter-group > summary::-webkit-details-marker {
  display: none;
}

.filter-group[open] > summary {
  border-color: var(--green);
  color: var(--text-1);
}

.filter-group-body {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-top: 6px;
}

.filter-dropdown .filter-group-body {
  position: absolute;
  z-index: 15;
  top: calc(100% + 6px);
  left: 0;
  min-width: 240px;
  max-width: 320px;
  max-height: 220px;
  overflow: auto;
  background: var(--bg-surface);
  border: 1px solid var(--border-mid);
  border-radius: 6px;
  padding: 8px;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.34);
}

.filter-count {
  color: var(--text-3);
  font-family: var(--font-mono);
  font-size: 10px;
}

.region-list {
  max-height: 130px;
  overflow: auto;
  min-width: 220px;
  padding-right: 6px;
}

.check-item {
  font-size: 11px;
  color: var(--text-2);
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 120px;
  padding: 6px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.1s, color 0.1s;
}

.check-item:hover {
  background: var(--bg-hover);
  color: var(--text-1);
}

.check-item input {
  appearance: none;
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border: 1px solid var(--border-mid);
  background: var(--bg);
  display: inline-grid;
  place-items: center;
  flex: 0 0 auto;
  margin: 0;
  cursor: pointer;
  transition: background 0.12s, border-color 0.12s, box-shadow 0.12s;
}

.check-item input::after {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 2px;
  background: var(--bg-surface);
  transform: scale(0);
  transition: transform 0.12s ease;
}

.check-item input:hover {
  border-color: var(--green);
}

.check-item input:checked {
  background: var(--green);
  border-color: var(--green);
  box-shadow: 0 0 0 2px rgba(61, 158, 106, 0.18);
}

.check-item input:checked::after {
  transform: scale(1);
}

.check-item input:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px rgba(58, 112, 176, 0.28);
}

.check-item span {
  min-width: 0;
}

@media (max-width: 720px) {
  .controls {
    display: grid;
    grid-template-columns: 1fr;
  }
}
</style>
