<script setup lang="ts">
import { useTranslation } from 'i18next-vue';
import type { TimerStats } from '../types/timer';

defineProps<{ stats: TimerStats }>();

const { t } = useTranslation();

void t;
</script>

<template>
  <div class="stats-bar">
    <div class="stat-chip">
      <div class="stat-value">{{ stats.total }}</div>
      <div class="stat-label">{{ t('stats.total') }}</div>
    </div>
    <div class="stat-chip s-ours">
      <div class="stat-value">{{ stats.friendly }}</div>
      <div class="stat-label">{{ t('stats.friendly') }}</div>
    </div>
    <div class="stat-chip s-theirs">
      <div class="stat-value">{{ stats.hostile }}</div>
      <div class="stat-label">{{ t('stats.hostile') }}</div>
    </div>
    <div class="stat-chip s-major">
      <div class="stat-value">{{ stats.major }}</div>
      <div class="stat-label">{{ t('stats.major') }}</div>
    </div>
    <div class="stat-chip s-major">
      <div class="stat-value">{{ stats.armor }}</div>
      <div class="stat-label">{{ t('stats.inArmor') }}</div>
    </div>
  </div>
</template>

<style scoped>
.stats-bar {
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.stat-chip {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  padding: 6px 12px;
  border-radius: 3px;
  min-width: 80px;
}

.stat-value {
  font-family: var(--font-mono);
  font-size: 18px;
  font-weight: 500;
  color: var(--text-1);
  line-height: 1;
  margin-bottom: 2px;
}

.stat-label {
  font-size: 12px;
  color: var(--text-3);
  text-transform: uppercase;
}

.s-ours .stat-value {
  color: var(--green);
}

.s-theirs .stat-value {
  color: var(--red);
}

.s-major .stat-value {
  color: var(--amber);
}
</style>
