/// <reference types="@rsbuild/core/types" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue';

  // biome-ignore lint/complexity/noBannedTypes: reason
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

interface ImportMetaEnv {
  readonly VITE_TIMERS_API_URL?: string;
  readonly VITE_TIMERS_SSE_URL?: string;
  readonly VITE_DISABLE_PASTE_TIMERS?: string;
  readonly VITE_TIMERS_POLL_MS?: string;
  readonly VITE_TIMERS_POLL_INTERVAL_MS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
