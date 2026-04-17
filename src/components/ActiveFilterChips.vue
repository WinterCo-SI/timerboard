<script setup lang="ts">
import type { FilterState } from '../types/timer';

defineProps<{
  filters: FilterState;
}>();

const emit = defineEmits<{
  clearSide: [];
  clearState: [];
  clearMajor: [];
  clearRegions: [];
  clearStructures: [];
}>();
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
    <span class="active-filter-label">Active filters:</span>
    <button v-if="filters.side.length" class="filter-chip" title="Clear side filter" @click="emit('clearSide')">
      {{ filters.side.join(', ') }}
    </button>
    <button v-if="filters.state.length" class="filter-chip" title="Clear state filter" @click="emit('clearState')">
      {{ filters.state.join(', ') }}
    </button>
    <button v-if="filters.major" class="filter-chip" title="Clear major filter" @click="emit('clearMajor')">Major</button>
    <button v-if="filters.regions.length" class="filter-chip" title="Clear region filter" @click="emit('clearRegions')">
      {{ filters.regions.length }} region{{ filters.regions.length === 1 ? '' : 's' }}
    </button>
    <button
      v-if="filters.hiddenStructures.length"
      class="filter-chip"
      title="Clear structure filter"
      @click="emit('clearStructures')"
    >
      {{ filters.hiddenStructures.length }} hidden structure{{ filters.hiddenStructures.length === 1 ? '' : 's' }}
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
