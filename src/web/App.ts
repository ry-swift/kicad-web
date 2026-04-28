import { computed, defineComponent, h, ref } from 'vue';
import { SymbolCanvas, type SymbolCanvasMode } from './pixi/SymbolCanvas.js';
import { tlp250IR, tlp250Library } from './sample/tlp250.js';

const CANVAS_MODES: readonly { key: SymbolCanvasMode; label: string }[] = [
  { key: 'editor', label: 'KiCad 编辑器' },
  { key: 'kicad-svg', label: 'SVG 导出' }
];

export const App = defineComponent({
  name: 'App',
  setup() {
    const canvasMode = ref<SymbolCanvasMode>('editor');
    const symbol = computed(() => tlp250IR.symbols[0]);
    const unitCount = computed(() => symbol.value?.units.length ?? 0);
    const pinCount = computed(() => symbol.value?.units.reduce((total, unit) => total + unit.pins.length, 0) ?? 0);
    const graphicCount = computed(() => symbol.value?.units.reduce((total, unit) => total + unit.graphics.length, 0) ?? 0);

    return () =>
      h('main', { class: 'app-shell' }, [
        h('section', { class: 'workspace' }, [
          h('header', { class: 'topbar' }, [
            h('div', { class: 'brand-block' }, [
              h('span', { class: 'eyebrow' }, 'KiCad Symbol Web Renderer'),
              h('h1', {}, symbol.value?.name ?? 'Unknown Symbol')
            ]),
            h('div', { class: 'status-strip' }, [
              h('span', {}, `KiCad ${tlp250Library.generatorVersion ?? 'unknown'}`),
              h('span', {}, `IR symbols ${tlp250IR.symbols.length}`),
              h('span', {}, 'PixiJS projection')
            ]),
            h('div', { class: 'mode-switch', role: 'group', 'aria-label': '渲染模式' }, [
              ...CANVAS_MODES.map((mode) =>
                h(
                  'button',
                  {
                    key: mode.key,
                    type: 'button',
                    class: { active: canvasMode.value === mode.key },
                    onClick: () => {
                      canvasMode.value = mode.key;
                    }
                  },
                  mode.label
                )
              )
            ])
          ]),
          h(SymbolCanvas, { ir: tlp250IR, mode: canvasMode.value })
        ]),
        h('aside', { class: 'inspector' }, [
          h('div', { class: 'panel-title' }, 'Symbol IR'),
          h('dl', { class: 'metric-grid' }, [
            metric('Units', String(unitCount.value)),
            metric('Pins', String(pinCount.value)),
            metric('Graphics', String(graphicCount.value)),
            metric('Properties', String(symbol.value?.properties.length ?? 0))
          ]),
          h('div', { class: 'panel-title' }, 'Visible Properties'),
          h(
            'ul',
            { class: 'property-list' },
            symbol.value?.properties
              .filter((property) => !property.hidden)
              .map((property) =>
                h('li', { key: property.id }, [
                  h('span', {}, property.key),
                  h('strong', {}, property.value)
                ])
              ) ?? []
          ),
          h('div', { class: 'panel-title' }, 'Architecture'),
          h('p', { class: 'note' }, 'Vue 3 管理工作台界面，PixiJS 只消费 Symbol IR 进行画布投影。解析、语义和导出仍以 TypeScript IR 为唯一真相。')
        ])
      ]);
  }
});

function metric(label: string, value: string) {
  return [h('dt', { key: `${label}-label` }, label), h('dd', { key: `${label}-value` }, value)];
}
