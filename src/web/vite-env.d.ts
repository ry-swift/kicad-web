/// <reference types="vite/client" />

declare module '*.css';

declare module '*.kicad_sym?raw' {
  const source: string;
  export default source;
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<Record<string, never>, Record<string, never>, unknown>;
  export default component;
}
