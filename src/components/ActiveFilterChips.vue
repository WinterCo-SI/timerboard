<script setup lang="ts">
import { useTranslation } from 'i18next-vue';
import { translateState, translateStatus } from '../i18n';
import type { FilterState } from '../types/timer';

defineProps<{
  filters: FilterState;
}>();

const { t } = useTranslation();

const emit = defineEmits<{
  clearSide: [];
  clearState: [];
  clearMajor: [];
  clearRegions: [];
  clearStructures: [];
}>();

void t;
void translateState;
void translateStatus;
void emit;
</script>

<template>
  <div
    class="active-filters"
    :class="{
      'has-filters':
        filters.side.length > 0 ||
        filters.state.length > 0 ||
        filters.major ||
        filters.regions.length > 0 ||
        filters.hiddenStructures.length > 0,
    }"
  >
    <span class="active-filter-label">{{ t('filters.active') }}</span>
    <button v-if="filters.side.length" class="filter-chip" :title="t('filters.clearSide')" @click="emit('clearSide')">
      {{ filters.side.map((side) => translateStatus(side)).join(', ') }}
    </button>
    <button v-if="filters.state.length" class="filter-chip" :title="t('filters.clearState')" @click="emit('clearState')">
      {{ filters.state.map((state) => translateState(state)).join(', ') }}
    </button>
    <button v-if="filters.major" class="filter-chip" :title="t('filters.clearMajor')" @click="emit('clearMajor')">
      {{ t('common.major') }}
    </button>
    <button v-if="filters.regions.length" class="filter-chip" :title="t('filters.clearRegion')" @click="emit('clearRegions')">
      {{ t('filters.regionCount', { count: filters.regions.length }) }}
    </button>
    <button
      v-if="filters.hiddenStructures.length"
      class="filter-chip"
      :title="t('filters.clearStructure')"
      @click="emit('clearStructures')"
    >
      {{ t('filters.hiddenStructureCount', { count: filters.hiddenStructures.length }) }}
    </button>
  </div>
</template>

<style scoped>
.active-filters {
  display: none;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin: 0 0 10px;
  padding: 6px 8px;
  background: rgba(61, 158, 106, 0.06);
  border: 1px solid rgba(61, 158, 106, 0.26);
  border-radius: 4px;
}

.active-filters.has-filters {
  display: flex;
}

.active-filter-label {
  font-size: 10px;
  color: var(--green);
  text-transform: uppercase;
  font-weight: 700;
}

.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  color: var(--text-2);
  font-size: 11px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 3px;
  cursor: pointer;
}

.filter-chip:hover {
  border-color: var(--border-mid);
  color: var(--text-1);
}

.filter-chip::after {
  content: 'x';
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-3);
}
</style>
