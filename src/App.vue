<script setup lang="ts">
import { useTranslation } from 'i18next-vue';
import { onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ActiveFilterChips from './components/ActiveFilterChips.vue';
import AppHeader from './components/AppHeader.vue';
import AuthNotice from './components/AuthNotice.vue';
import DayNav from './components/DayNav.vue';
import FilterBar from './components/FilterBar.vue';
import ImportModal from './components/modals/ImportModal.vue';
import StatsBar from './components/StatsBar.vue';
import TimelineBar from './components/TimelineBar.vue';
import DenseView from './components/views/DenseView.vue';
import GanttView from './components/views/GanttView.vue';
import MapView from './components/views/MapView.vue';
import SummaryView from './components/views/SummaryView.vue';
import TableView from './components/views/TableView.vue';
import { useTimerboard } from './composables/useTimerboard';
import type { TimerView } from './types/timer';

const store = useTimerboard();
const route = useRoute();
const router = useRouter();
const { t } = useTranslation();

onMounted(() => {
  store.initialize();
  // sync initial route -> store view
  const viewFromRoute = (route.name as TimerView) || 'table';
  store.setView(viewFromRoute);
});

onUnmounted(() => {
  store.teardown();
});

function setView(view: TimerView) {
  store.setView(view);
  // push route for persistent URL
  router.push({ name: view }).catch(() => {});
}

watch(
  () => route.name,
  (name) => {
    if (!name) return;
    const v = name as TimerView;
    if (v !== store.currentView) store.setView(v);
  },
);

function jumpTo(date: string) {
  const element = document.getElementById(`dg-${date}`);
  if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
</script>

<template>
  <div class="app-wrap">
    <AppHeader
      :clock="store.utcClock"
      :current-view="store.currentView"
      @open-import="store.openImport"
      @set-view="setView"
      @toggle-theme="store.toggleTheme"
    />
    <AuthNotice v-if="store.authRequired" />

    <StatsBar :stats="store.stats" />

    <TimelineBar
      :elapsed="store.timeline.elapsed"
      :label="store.timeline.label"
      :markers="store.timeline.markers"
      :progress-percent="store.timeline.progressPercent"
      :total="store.timeline.total"
    />

    <FilterBar
      :filters="store.filters"
      :has-active-filters="store.hasActiveFilters"
      :region-options="store.regionOptions"
      :structure-options="store.structureOptions"
      @reset-filters="store.resetFilters"
      @set-structure-visibility="store.toggleStructureVisibility"
      @toggle-major="store.toggleMajor"
      @toggle-region="store.toggleRegion"
      @toggle-side="store.toggleSide"
      @toggle-state="store.toggleState"
    />

    <ActiveFilterChips
      :filters="store.filters"
      @clear-major="store.clearMajorFilter"
      @clear-regions="store.clearRegionFilters"
      @clear-side="store.clearSideFilters"
      @clear-state="store.clearStateFilters"
      @clear-structures="store.clearStructureFilters"
    />

    <DayNav
      v-if="store.currentView === 'table'"
      :days="store.dayKeys"
      :now-ms="store.nowMs"
      :today="store.today"
      @collapse-all="store.collapseAllDates"
      @expand-all="store.expandAllDates"
      @jump="jumpTo"
    />

    <main id="timerboard">
      <SummaryView v-if="store.currentView === 'summary'" :now-ms="store.nowMs" :timers="store.filteredTimers" />
      <TableView
        v-else-if="store.currentView === 'table'"
        :collapsed-dates="store.collapsedDates"
        :dates="store.dayKeys"
        :groups="store.groupedByDate"
        :now-ms="store.nowMs"
        :today="store.today"
        @toggle-day="store.collapseToggle"
      />
      <DenseView
        v-else-if="store.currentView === 'dense'"
        :dates="store.dayKeys"
        :groups="store.groupedByDate"
        :now-ms="store.nowMs"
        :today="store.today"
      />
      <GanttView
        v-else-if="store.currentView === 'gantt'"
        :dates="store.dayKeys"
        :groups="store.groupedByDate"
        :now-ms="store.nowMs"
        :today="store.today"
      />
      <MapView v-else :now-ms="store.nowMs" :timers="store.filteredTimers" />
    </main>

    <footer class="app-footer">{{ t('app.footer') }}</footer>

    <ImportModal
      :model-value="store.importText"
      :open="store.showImportModal"
      :status="store.importStatus"
      @clear-local-data="store.clearLocalData"
      @clear-timers="store.clearTimers"
      @close="store.closeModals"
      @import="store.importTimers"
      @reset-timers="store.resetTimers"
      @update-model-value="(value) => (store.importText = value)"
    />
  </div>
</template>

<style scoped>
.app-wrap {
  max-width: 1400px;
  margin: 0 auto;
  padding: 16px;
}

.app-footer {
  margin-top: 24px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
  color: var(--text-3);
  font-size: 11px;
  text-align: center;
}

@media (max-width: 720px) {
  .app-wrap {
    padding: 12px;
  }
}
</style>
