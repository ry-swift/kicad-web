<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  materializeKicadSymbolLibraryFromIR,
  translateSymbolElementIR,
  updateSymbolElementIR,
  type EditableSymbolElementPatch,
  type EditableSymbolElementRef,
  type GraphicItemIR,
  type KicadGraphicItemAst,
  type SymbolLibraryIR
} from '../kicad/index.js';
import { useKicadSymbolExport } from './composables/use-kicad-symbol-export.js';
import { SymbolCanvas, type SymbolCanvasMode, type SymbolElementTranslateEvent } from './pixi/SymbolCanvas.js';
import { tlp250IR, tlp250Library } from './sample/tlp250.js';

const CANVAS_MODES: readonly { key: SymbolCanvasMode; label: string }[] = [
  { key: 'editor', label: 'KiCad 编辑器' },
  { key: 'kicad-svg', label: 'SVG 导出' }
];

const PIN_ELECTRICAL_TYPES = [
  { value: 'input', label: '输入' },
  { value: 'output', label: '输出' },
  { value: 'bidirectional', label: '双向' },
  { value: 'tri_state', label: '三态' },
  { value: 'passive', label: '无源' },
  { value: 'free', label: '自由' },
  { value: 'unspecified', label: '未指定' },
  { value: 'power_in', label: '电源输入' },
  { value: 'power_out', label: '电源输出' },
  { value: 'open_collector', label: '开集电极' },
  { value: 'open_emitter', label: '开射极' },
  { value: 'no_connect', label: '未连接' }
] as const;

const PIN_GRAPHIC_STYLES = [
  { value: 'line', label: '直线' },
  { value: 'inverted', label: '反相' },
  { value: 'clock', label: '时钟' },
  { value: 'inverted_clock', label: '反相时钟' },
  { value: 'input_low', label: '低有效输入' },
  { value: 'clock_low', label: '低有效时钟' },
  { value: 'output_low', label: '低有效输出' },
  { value: 'edge_clock_high', label: '高沿时钟' },
  { value: 'non_logic', label: '非逻辑' }
] as const;

type TextGraphicIR = GraphicItemIR & {
  readonly kind: 'text';
  readonly ast: Extract<KicadGraphicItemAst, { readonly kind: 'text' }>;
};

const canvasMode = ref<SymbolCanvasMode>('editor');
const editableIR = ref<SymbolLibraryIR>(tlp250IR);
const selectedElement = ref<EditableSymbolElementRef>();
const { exportStatus, exportLibrary } = useKicadSymbolExport();
const symbol = computed(() => editableIR.value.symbols[0]);
const selectedElementId = computed(() => selectedElement.value?.id ?? '');
const unitCount = computed(() => symbol.value?.units.length ?? 0);
const pinCount = computed(() => symbol.value?.units.reduce((total, unit) => total + unit.pins.length, 0) ?? 0);
const graphicCount = computed(() => symbol.value?.units.reduce((total, unit) => total + unit.graphics.length, 0) ?? 0);
const visibleProperties = computed(() => symbol.value?.properties.filter((property) => !property.hidden) ?? []);
const selectedProperty = computed(() => {
  const ref = selectedElement.value;
  return ref?.kind === 'property' ? symbol.value?.properties.find((property) => property.id === ref.id) : undefined;
});
const selectedGraphic = computed(() => {
  const ref = selectedElement.value;
  return ref?.kind === 'graphic' ? symbol.value?.units.flatMap((unit) => unit.graphics).find((graphic) => graphic.id === ref.id) : undefined;
});
const selectedTextGraphic = computed(() => {
  const graphic = selectedGraphic.value;
  return isTextGraphicIR(graphic) ? graphic : undefined;
});
const selectedPin = computed(() => {
  const ref = selectedElement.value;
  return ref?.kind === 'pin' ? symbol.value?.units.flatMap((unit) => unit.pins).find((pin) => pin.id === ref.id) : undefined;
});

function exportCurrentLibrary(): void {
  exportLibrary(materializeKicadSymbolLibraryFromIR(tlp250Library, editableIR.value));
}

function selectElement(ref: EditableSymbolElementRef): void {
  selectedElement.value = ref;
}

function translateElement(event: SymbolElementTranslateEvent): void {
  editableIR.value = translateSymbolElementIR(editableIR.value, event.ref, event.deltaMm);
  selectedElement.value = event.ref;
}

function updateSelectedElement(patch: EditableSymbolElementPatch): void {
  if (!selectedElement.value) {
    return;
  }
  editableIR.value = updateSymbolElementIR(editableIR.value, selectedElement.value, patch);
}

function updateSelectedValue(event: Event): void {
  updateSelectedElement({ value: formValue(event) });
}

function updatePinName(event: Event): void {
  updateSelectedElement({ pinName: formValue(event) });
}

function updatePinNumber(event: Event): void {
  updateSelectedElement({ pinNumber: formValue(event) });
}

function updatePinElectricalType(event: Event): void {
  updateSelectedElement({ electricalType: formValue(event) });
}

function updatePinGraphicStyle(event: Event): void {
  updateSelectedElement({ graphicStyle: formValue(event) });
}

function updatePinLength(event: Event): void {
  const value = Number(formValue(event));
  if (Number.isFinite(value)) {
    updateSelectedElement({ pinLength: value });
  }
}

function updatePinHidden(event: Event): void {
  updateSelectedElement({ hidden: checkedValue(event) });
}

function updateGraphicStrokeWidth(event: Event): void {
  const value = Number(formValue(event));
  if (Number.isFinite(value)) {
    updateSelectedElement({ strokeWidth: value });
  }
}

function formValue(event: Event): string {
  const target = event.target;
  if (target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement) {
    return target.value;
  }
  return '';
}

function checkedValue(event: Event): boolean {
  const target = event.target;
  return target instanceof HTMLInputElement ? target.checked : false;
}

function displayPropertyKey(key: string): string {
  switch (key) {
    case 'Reference':
      return '位号';
    case 'Value':
      return '器件值';
    case 'Footprint':
      return '封装';
    case 'Datasheet':
      return '数据手册';
    case 'Description':
      return '描述';
    case 'ki_keywords':
      return '关键词';
    case 'ki_fp_filters':
      return '封装过滤';
    default:
      return key;
  }
}

function displayGraphicKind(kind: string): string {
  switch (kind) {
    case 'rectangle':
      return '矩形';
    case 'polyline':
      return '折线';
    case 'circle':
      return '圆';
    case 'arc':
      return '圆弧';
    case 'bezier':
      return '贝塞尔曲线';
    case 'text':
      return '文本';
    default:
      return kind;
  }
}

function isTextGraphicIR(graphic: GraphicItemIR | undefined): graphic is TextGraphicIR {
  return graphic?.kind === 'text' && graphic.ast.kind === 'text';
}
</script>

<template>
  <main class="app-shell">
    <section class="workspace">
      <header class="topbar">
        <div class="brand-block">
          <span class="eyebrow">KiCad Symbol Web Renderer</span>
          <h1>{{ symbol?.name ?? '未知符号' }}</h1>
        </div>

        <div class="status-strip">
          <span>KiCad {{ tlp250Library.generatorVersion ?? 'unknown' }}</span>
          <span>IR 符号 {{ editableIR.symbols.length }}</span>
          <span>PixiJS 投影</span>
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

      <SymbolCanvas
        :ir="editableIR"
        :mode="canvasMode"
        :selected-element-id="selectedElementId"
        @select-element="selectElement"
        @translate-element="translateElement"
      />
    </section>

    <aside class="inspector">
      <div class="panel-title">符号数据</div>
      <dl class="metric-grid">
        <dt>单元</dt>
        <dd>{{ unitCount }}</dd>
        <dt>引脚</dt>
        <dd>{{ pinCount }}</dd>
        <dt>图元</dt>
        <dd>{{ graphicCount }}</dd>
        <dt>属性</dt>
        <dd>{{ symbol?.properties.length ?? 0 }}</dd>
      </dl>

      <div class="panel-title">可见属性</div>
      <ul class="property-list">
        <li v-for="property in visibleProperties" :key="property.id">
          <span>{{ displayPropertyKey(property.key) }}</span>
          <strong>{{ property.value }}</strong>
        </li>
      </ul>

      <div class="panel-title">当前选择</div>
      <p class="selected-element">{{ selectedElement?.id ?? '未选中元素' }}</p>

      <div class="panel-title">符号配置</div>
      <form v-if="selectedProperty" class="element-editor" @submit.prevent>
        <label class="editor-field">
          <span>属性键</span>
          <input type="text" :value="displayPropertyKey(selectedProperty.key)" disabled>
        </label>
        <label class="editor-field">
          <span>属性值</span>
          <input type="text" :value="selectedProperty.value" @input="updateSelectedValue">
        </label>
      </form>

      <form v-else-if="selectedTextGraphic" class="element-editor" @submit.prevent>
        <label class="editor-field">
          <span>文本</span>
          <input type="text" :value="selectedTextGraphic.ast.value" @input="updateSelectedValue">
        </label>
      </form>

      <form v-else-if="selectedGraphic" class="element-editor" @submit.prevent>
        <label class="editor-field">
          <span>图元类型</span>
          <input type="text" :value="displayGraphicKind(selectedGraphic.kind)" disabled>
        </label>
        <label class="editor-field">
          <span>线宽 mm</span>
          <input
            type="number"
            min="0"
            step="0.01"
            :value="selectedGraphic.ast.stroke?.width ?? 0"
            @input="updateGraphicStrokeWidth"
          >
        </label>
      </form>

      <form v-else-if="selectedPin" class="element-editor" @submit.prevent>
        <label class="editor-field">
          <span>名称</span>
          <input type="text" :value="selectedPin.name ?? ''" @input="updatePinName">
        </label>
        <label class="editor-field">
          <span>编号</span>
          <input type="text" :value="selectedPin.number ?? ''" @input="updatePinNumber">
        </label>
        <label class="editor-field">
          <span>电气类型</span>
          <select :value="selectedPin.electricalType" @change="updatePinElectricalType">
            <option v-for="type in PIN_ELECTRICAL_TYPES" :key="type.value" :value="type.value">
              {{ type.label }}
            </option>
          </select>
        </label>
        <label class="editor-field">
          <span>图形样式</span>
          <select :value="selectedPin.graphicStyle" @change="updatePinGraphicStyle">
            <option v-for="style in PIN_GRAPHIC_STYLES" :key="style.value" :value="style.value">
              {{ style.label }}
            </option>
          </select>
        </label>
        <label class="editor-field">
          <span>长度 mm</span>
          <input type="number" min="0" step="0.01" :value="selectedPin.length ?? 0" @input="updatePinLength">
        </label>
        <label class="editor-check">
          <input type="checkbox" :checked="selectedPin.hidden === true" @change="updatePinHidden">
          <span>隐藏引脚</span>
        </label>
      </form>

      <p v-else class="editor-empty">未选择可编辑元素</p>

      <div class="panel-title">架构</div>
      <p class="note">
        Vue 3 管理工作台界面，PixiJS 只消费 Symbol IR 进行画布投影。解析、语义和导出仍以 TypeScript IR 为唯一真相。
      </p>
    </aside>
  </main>
</template>
