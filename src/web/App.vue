<script setup lang="ts">
import { computed, ref } from 'vue';
import { useKicadSymbolExport } from './composables/use-kicad-symbol-export.js';
import { SymbolCanvas, type SymbolCanvasMode } from './pixi/SymbolCanvas.js';
import { tlp250IR, tlp250Library } from './sample/tlp250.js';

const CANVAS_MODES: readonly { key: SymbolCanvasMode; label: string }[] = [
  { key: 'editor', label: 'KiCad 编辑器' },
  { key: 'kicad-svg', label: 'SVG 导出' }
];

const canvasMode = ref<SymbolCanvasMode>('editor');
const { exportStatus, exportLibrary } = useKicadSymbolExport();
const symbol = computed(() => tlp250IR.symbols[0]);
const unitCount = computed(() => symbol.value?.units.length ?? 0);
const pinCount = computed(() => symbol.value?.units.reduce((total, unit) => total + unit.pins.length, 0) ?? 0);
const graphicCount = computed(() => symbol.value?.units.reduce((total, unit) => total + unit.graphics.length, 0) ?? 0);
const visibleProperties = computed(() => symbol.value?.properties.filter((property) => !property.hidden) ?? []);

function exportCurrentLibrary(): void {
  exportLibrary(tlp250Library);
}
</script>

<template>
  <main class="app-shell">
    <section class="workspace">
      <header class="topbar">
        <div class="brand-block">
          <span class="eyebrow">KiCad Symbol Web Renderer</span>
          <h1>{{ symbol?.name ?? 'Unknown Symbol' }}</h1>
        </div>

        <div class="status-strip">
          <span>KiCad {{ tlp250Library.generatorVersion ?? 'unknown' }}</span>
          <span>IR symbols {{ tlp250IR.symbols.length }}</span>
          <span>PixiJS projection</span>
        </div>

        <div class="toolbar-actions">
          <div class="mode-switch" role="group" aria-label="渲染模式">
            <button
              v-for="mode in CANVAS_MODES"
              :key="mode.key"
              type="button"
              :class="{ active: canvasMode === mode.key }"
              @click="canvasMode = mode.key"
            >
              {{ mode.label }}
            </button>
          </div>

          <button type="button" class="export-button" @click="exportCurrentLibrary">
            导出 .kicad_sym
          </button>

          <span v-if="exportStatus" class="export-status" aria-live="polite">
            {{ exportStatus }}
          </span>
        </div>
      </header>

      <SymbolCanvas :ir="tlp250IR" :mode="canvasMode" />
    </section>

    <aside class="inspector">
      <div class="panel-title">Symbol IR</div>
      <dl class="metric-grid">
        <dt>Units</dt>
        <dd>{{ unitCount }}</dd>
        <dt>Pins</dt>
        <dd>{{ pinCount }}</dd>
        <dt>Graphics</dt>
        <dd>{{ graphicCount }}</dd>
        <dt>Properties</dt>
        <dd>{{ symbol?.properties.length ?? 0 }}</dd>
      </dl>

      <div class="panel-title">Visible Properties</div>
      <ul class="property-list">
        <li v-for="property in visibleProperties" :key="property.id">
          <span>{{ property.key }}</span>
          <strong>{{ property.value }}</strong>
        </li>
      </ul>

      <div class="panel-title">Architecture</div>
      <p class="note">
        Vue 3 管理工作台界面，PixiJS 只消费 Symbol IR 进行画布投影。解析、语义和导出仍以 TypeScript IR 为唯一真相。
      </p>
    </aside>
  </main>
</template>
