import I18NextVue from 'i18next-vue';
import { createPinia } from 'pinia';
import { createApp } from 'vue';
import App from './App.vue';
import i18next, { i18nReady } from './i18n';
import router from './router';
import './index.css';

i18nReady.then(() => {
  const app = createApp(App);
  app.use(createPinia());
  app.use(router);
  app.use(I18NextVue, { i18next });
  app.mount('#root');
});
