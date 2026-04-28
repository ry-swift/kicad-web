# Roadmap: KiCad Symbol Web Renderer

## Overview

这条路线按“格式真相先行、精确渲染先行、性能交互后接入”的顺序推进。先完成 KiCad S-expression 与 Symbol IR 的互转闭环，再用 SVG 对齐 KiCad CLI 的黄金输出，随后建立回归验证，最后把 PixiJS 接入为高性能交互层并开放 Web 编辑与导出能力。

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Parser And Symbol IR Foundation** - 建立 `.kicad_sym` 导入、AST/IR 和安全序列化基础。 (completed 2026-04-28)
- [ ] **Phase 2: Accurate SVG Symbol Renderer** - 实现与 KiCad CLI 可对照的 SVG 精确渲染路径。
- [ ] **Phase 3: KiCad CLI Validation Harness** - 建立结构、语义和视觉回归验证体系。
- [ ] **Phase 4: PixiJS Interactive Renderer** - 接入 PixiJS 作为高性能交互画布。
- [ ] **Phase 5: Web Symbol Editing And Export Guardrails** - 开放 Web 编辑并确保导出不丢失 KiCad 语义。
- [ ] **Phase 6: Scale, Security And Library Coverage** - 强化大库性能、安全边界和兼容覆盖。
- [ ] **Phase 7: Documentation And Product Handoff** - 沉淀开发者文档、用户说明和后续路线。

## Phase Details

### Phase 1: Parser And Symbol IR Foundation
**Goal**: `.kicad_sym` 文件可以被解析为保真 AST 和 KiCad Symbol IR，并能在不改动语义的情况下重新序列化。
**Depends on**: Nothing (first phase)
**Requirements**: [KICAD-01, KICAD-02, KICAD-03, KICAD-04]
**Success Criteria** (what must be TRUE):
  1. User can import `tlp250.kicad_sym` and inspect parsed symbols, properties, graphics and pins.
  2. System preserves unknown or future KiCad tokens without silently dropping them.
  3. Exported `.kicad_sym` can be opened or upgraded by KiCad CLI without format errors.
  4. Symbol IR has stable IDs for renderer and editor layers to reference.
**Plans**: 4 plans

Plans:
- [x] 01-01: Implement S-expression CST parser and printer.
- [x] 01-02: Map CST to typed KiCad Symbol AST and Symbol IR.
- [x] 01-03: Implement serializer and round-trip tests for sample symbols.
- [x] 01-04: Add Vue 3 + PixiJS Web preview for the parsed TLP250 symbol.

### Phase 2: Accurate SVG Symbol Renderer
**Goal**: Symbol IR 可以渲染为确定性 SVG，并覆盖 KiCad 符号图元、pin、文本、stroke/fill 和主题语义。
**Depends on**: Phase 1
**Requirements**: [DRAW-01, DRAW-02, DRAW-03, PIN-01, PIN-02, REND-01]
**Success Criteria** (what must be TRUE):
  1. User can render TLP250 as SVG with expected body, pins, text and hidden/visible behavior.
  2. SVG renderer supports all v1 KiCad symbol graphic primitives.
  3. Renderer separates symbol body from editor-only overlays.
  4. SVG output has deterministic ordering and stable viewBox for regression tests.
**Plans**: 3 plans

Plans:
- [ ] 02-01: Implement geometry resolver for KiCad coordinates, transforms and bounding boxes.
- [ ] 02-02: Implement SVG primitives, fill/stroke/theme and text rendering.
- [ ] 02-03: Implement pin rendering, visibility rules and sample fixture snapshots.

### Phase 3: KiCad CLI Validation Harness
**Goal**: 使用 KiCad CLI 建立黄金基准，把导入、导出、SVG 渲染和 PixiJS 后续渲染纳入可重复验证。
**Depends on**: Phase 2
**Requirements**: [VAL-01, VAL-02, VAL-03]
**Success Criteria** (what must be TRUE):
  1. System can call KiCad CLI to export SVG baselines for configured fixtures.
  2. Round-trip export can be compared through AST semantic diff.
  3. Web renderer output can be rasterized and visually compared with tolerance thresholds.
  4. Validation reports identify which symbol, primitive or pixel region failed.
**Plans**: 2 plans

Plans:
- [ ] 03-01: Build KiCad CLI fixture runner and semantic diff pipeline.
- [ ] 03-02: Build SVG/raster visual diff reports and CI-ready validation command.

### Phase 4: PixiJS Interactive Renderer
**Goal**: 同一 Symbol IR 可以通过 PixiJS 在 Web 主画布中高性能渲染，并支持缩放、平移、选中、hover 和静态缓存。
**Depends on**: Phase 3
**Requirements**: [REND-02, PERF-01]
**Success Criteria** (what must be TRUE):
  1. User can view the same imported symbol through PixiJS and SVG paths.
  2. Repeated symbol instances can use cached static bodies without losing selection or hit testing.
  3. Pan, zoom and hover remain smooth on representative large-canvas scenarios.
  4. PixiJS renderer does not write persistence state outside Symbol IR.
**Plans**: 3 plans

Plans:
- [ ] 04-01: Implement PixiJS scene graph projection from Symbol IR.
- [ ] 04-02: Add RenderTexture/static body caching, culling and hit-testing IDs.
- [ ] 04-03: Add pan/zoom/selection/hover interactions and performance benchmarks.

### Phase 5: Web Symbol Editing And Export Guardrails
**Goal**: 用户可以在 Web 端创建或编辑 KiCad 可表达的符号，并安全导出为 KiCad 可识别 `.kicad_sym`。
**Depends on**: Phase 4
**Requirements**: [REND-03, EXP-01, EXP-02]
**Success Criteria** (what must be TRUE):
  1. User can edit supported symbol primitives, properties and pins through Web controls.
  2. Editor-only overlays such as grid, crosshair and electric-type labels can be toggled without changing IR.
  3. Exporter writes valid `.kicad_sym` for Web-created symbols.
  4. Unsupported Web-side constructs are blocked or explicitly reported before export.
**Plans**: 3 plans

Plans:
- [ ] 05-01: Build IR-backed editing commands for primitives, properties and pins.
- [ ] 05-02: Build overlay/display-mode controls for KiCad-like editor aids.
- [ ] 05-03: Build export guardrails and KiCad-readable output flow.

### Phase 6: Scale, Security And Library Coverage
**Goal**: 系统能处理大型符号库和不可信输入，并通过更广的 fixture 集证明兼容性边界。
**Depends on**: Phase 5
**Requirements**: [PERF-02, SEC-01]
**Success Criteria** (what must be TRUE):
  1. Large symbol library import does not freeze the UI beyond defined limits.
  2. Malformed, oversized or malicious inputs produce safe errors.
  3. Exported SVG and rendered text are sanitized against injection.
  4. Fixture suite covers multi-unit, derived symbols, arcs, bezier, hidden fields and diverse pin styles.
**Plans**: 2 plans

Plans:
- [ ] 06-01: Add worker-based parsing, import limits, sanitization and safe error handling.
- [ ] 06-02: Expand fixture coverage and performance regression suite.

### Phase 7: Documentation And Product Handoff
**Goal**: 开发者和用户都能理解系统边界、支持矩阵、验证流程和后续扩展路径。
**Depends on**: Phase 6
**Requirements**: [DOC-01, DOC-02]
**Success Criteria** (what must be TRUE):
  1. Developer can understand parser, IR, renderer, exporter and validation module boundaries.
  2. User can understand supported KiCad features and unsupported Web-only features.
  3. Documentation includes KiCad CLI validation workflow and troubleshooting guidance.
  4. Roadmap identifies v2 entry points for `.kicad_sch`, footprint and collaboration work.
**Plans**: 2 plans

Plans:
- [ ] 07-01: Write developer architecture and extension documentation.
- [ ] 07-02: Write user support matrix, validation workflow and v2 handoff notes.

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Parser And Symbol IR Foundation | 4/4 | Complete    | 2026-04-28 |
| 2. Accurate SVG Symbol Renderer | 0/3 | Not started | - |
| 3. KiCad CLI Validation Harness | 0/2 | Not started | - |
| 4. PixiJS Interactive Renderer | 0/3 | Not started | - |
| 5. Web Symbol Editing And Export Guardrails | 0/3 | Not started | - |
| 6. Scale, Security And Library Coverage | 0/2 | Not started | - |
| 7. Documentation And Product Handoff | 0/2 | Not started | - |
