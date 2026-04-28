# Research Summary: KiCad Symbol Web Renderer

## Key Findings

**Stack:** TypeScript + 自研 KiCad S-expression parser + KiCad Symbol IR + SVG renderer + PixiJS v8 WebGL renderer。KiCad CLI 作为黄金验证源。

**Table Stakes:** `.kicad_sym` 导入、AST/IR 保真、SVG 精确渲染、pin/属性完整支持、`.kicad_sym` 导出、KiCad CLI 回归验证。

**Watch Out For:** 不要把 SVG 或 PixiJS 对象当数据源；不要静默丢弃 KiCad 未知字段；不要让 Web 编辑器画出 KiCad 无法表达的图元。

## Recommended Product Mode

`schematic-symbol-first`。先把 KiCad 符号库互转、渲染和验证打透，再进入完整原理图、网络和 PCB 层。

## Recommended Architecture

```text
KiCad file format → Parser/CST → AST → Symbol IR → SVG/PixiJS renderers → Exporter → KiCad CLI validation
```

## Maturity Assessment

| Area | Maturity | Notes |
|------|----------|-------|
| KiCad file format docs | High | 官方文档覆盖 `.kicad_sym`、S-expression、pin、graphic items |
| KiCad CLI SVG export | High | 可作为外部黄金输出 |
| PixiJS interactive rendering | High | 适合大画布交互，但不是格式兼容层 |
| Full one-to-one compatibility | Medium | 需要大量 fixture 和视觉回归才能证明 |

## Roadmap Guidance

1. Parser/IR/serializer 是第一优先级。
2. SVG renderer 是精确基准，先于 PixiJS。
3. KiCad CLI validation 必须尽早接入。
4. PixiJS 用于主交互画布和大规模性能优化。
5. Web editor 必须被 KiCad 可表达图元集约束。

## Ready for Roadmap

Yes.
