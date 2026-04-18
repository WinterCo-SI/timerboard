<script setup lang="ts">
import { useTranslation } from 'i18next-vue';
import { formatLocalDayLabel } from '../utils/timer-utils';

defineProps<{
  days: string[];
  today: string;
  nowMs: number;
}>();

const emit = defineEmits<{
  jump: [date: string];
  expandAll: [];
  collapseAll: [];
}>();

const { t } = useTranslation();

void formatLocalDayLabel;
void emit;
void t;
</script>

<template>
  <div class="day-nav">
    <span class="filter-label">{{ t('days.label') }}</span>
    <button
      v-for="day in days"
      :key="day"
      class="day-nav-btn"
      :class="{ 'is-today': day === today }"
      @click="emit('jump', day)"
    >
      {{ formatLocalDayLabel(day, new Date(nowMs), false) }}
    </button>
    <div class="day-nav-sep">
      <button class="tool-btn" @click="emit('expandAll')">{{ t('days.expandAll') }}</button>
      <button class="tool-btn" @click="emit('collapseAll')">{{ t('days.collapseAll') }}</button>
    </div>
  </div>
</template>

<style scoped>
.day-nav {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.day-nav-btn {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  color: var(--text-2);
  font-size: 11px;
  font-weight: 500;
  padding: 3px 9px;
  cursor: pointer;
  border-radius: 3px;
}

.day-nav-btn.is-today {
  border-color: var(--amber);
  color: var(--amber);
}

.day-nav-sep {
  display: flex;
  gap: 4px;
  margin-left: auto;
}

@media (max-width: 720px) {
  .day-nav-sep {
    width: 100%;
    margin-left: 0;
  }
}
</style>
