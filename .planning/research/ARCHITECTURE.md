# Architecture Research: KiCad Symbol Web Renderer

## Core Architecture

```text
.kicad_sym
  ↓
S-expression CST
  ↓
KiCad Symbol AST
  ↓
KiCad Symbol IR
  ↓
├─ SVG Renderer       → 精确预览、导出、KiCad CLI 对照
├─ PixiJS Renderer    → 高性能交互、缩放、平移、选中、编辑辅助
└─ Serializer         → .kicad_sym
```

## Component Boundaries

| Component | Responsibility | Must Not Do |
|-----------|----------------|-------------|
| `sexpr-parser` | 解析和打印 S-expression，保留未知结构 | 不理解渲染，不做 KiCad 业务判断 |
| `kicad-symbol-ast` | 将 S-expression 映射为强类型 KiCad AST | 不依赖 DOM、SVG、PixiJS |
| `symbol-ir` | 表达 Web 编辑、渲染、导出的统一领域模型 | 不存 renderer 专属状态 |
| `svg-renderer` | 把 IR 投影为 SVG | 不修改 IR |
| `pixi-renderer` | 把 IR 投影为 PixiJS 场景图和缓存纹理 | 不成为数据真相 |
| `exporter` | 把 IR 序列化回 `.kicad_sym` | 不静默丢弃不可表达图元 |
| `validator` | 调用 KiCad CLI、做 AST diff 和视觉 diff | 不参与业务编辑 |
| `web-editor` | 用户编辑图元、属性、pin、显示模式 | 所有变更必须写回 IR |

## Data Flow

1. 导入 `.kicad_sym` 后先生成 CST，保留所有未知 token。
2. CST 转 KiCad AST，识别 symbol、property、graphic item、pin、effects、stroke、fill。
3. AST 转 Symbol IR，补齐默认值、单位换算、版本兼容字段和 renderer 友好的派生信息。
4. SVG renderer 和 PixiJS renderer 从同一 IR 渲染。
5. Web editor 只修改 IR。
6. exporter 从 IR 生成 AST/CST，再输出 `.kicad_sym`。
7. validator 使用 KiCad CLI 重新打开/导出，进行结构和视觉验证。

## Build Order

1. Parser/IR/serializer。
2. SVG renderer。
3. KiCad CLI validation harness。
4. PixiJS renderer。
5. Web editor/export guardrails。
6. 性能、安全、批量符号库覆盖。

## Key Architectural Rule

PixiJS 是性能层，不是 EDA 语义层。任何交互对象都必须能追溯到 IR 节点 ID，任何编辑结果都必须经过 IR validator 后才能导出。
