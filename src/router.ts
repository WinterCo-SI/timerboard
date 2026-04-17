import { createRouter, createWebHistory } from 'vue-router';
import SummaryView from './components/views/SummaryView.vue';
import TableView from './components/views/TableView.vue';
import DenseView from './components/views/DenseView.vue';
import GanttView from './components/views/GanttView.vue';
import MapView from './components/views/MapView.vue';

const routes = [
  { path: '/', redirect: '/table' },
  { path: '/summary', component: SummaryView, name: 'summary' },
  { path: '/table', component: TableView, name: 'table' },
  { path: '/dense', component: DenseView, name: 'dense' },
  { path: '/gantt', component: GanttView, name: 'gantt' },
  { path: '/map', component: MapView, name: 'map' },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
