# Requirements: KiCad Symbol Web Renderer

**Defined:** 2026-04-28
**Core Value:** 任意受支持的 KiCad 符号都能在 Web 端高保真渲染，并且 Web 创建的符号能无语义丢失地回写成 KiCad 可打开、可校验的 `.kicad_sym`。

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### KiCad Format Core

- [x] **KICAD-01**: User can import a KiCad 6.0+ `.kicad_sym` file containing one or more symbols.
- [x] **KICAD-02**: System preserves known and unknown S-expression structures needed for safe round-trip serialization.
- [x] **KICAD-03**: System represents symbol properties, mandatory fields, hidden fields, effects, stroke and fill settings in a typed IR.
- [x] **KICAD-04**: System represents multi-unit symbols, common unit graphics, alternate body style identifiers and `extends`-based derived symbols.

### Symbol Graphics

- [ ] **DRAW-01**: User can view KiCad `polyline`, `rectangle`, `circle`, `arc`, `bezier` and `text` primitives in Web SVG output.
- [ ] **DRAW-02**: Renderer applies KiCad stroke width, line style, fill mode, theme color and background semantics consistently.
- [ ] **DRAW-03**: Renderer handles KiCad text effects including size, rotation, justification, bold, italic, hidden state and stroke-font-compatible output.

### Pins

- [ ] **PIN-01**: Renderer supports KiCad pin electrical types, graphical styles, rotations, hidden pins, pin names and pin numbers.
- [ ] **PIN-02**: Renderer supports symbol-level `pin_names` and `pin_numbers` visibility and pin name offset behavior.

### Rendering

- [ ] **REND-01**: User can render an imported symbol through the SVG renderer with deterministic viewBox, units and layer ordering.
- [ ] **REND-02**: User can render the same Symbol IR through PixiJS for zooming, panning, selection, hover and large-canvas interaction.
- [ ] **REND-03**: User can toggle editor-only overlays such as grid, crosshair, hidden pin display and electric-type labels without changing the symbol IR.

### Export

- [ ] **EXP-01**: User can create or edit a Web symbol and export it as a KiCad-readable `.kicad_sym` file.
- [ ] **EXP-02**: System blocks or explicitly reports any Web-side shape, style or metadata that cannot be represented in KiCad `.kicad_sym`.

### Validation

- [ ] **VAL-01**: System can call KiCad CLI to export SVG baselines for fixture symbols.
- [ ] **VAL-02**: System can compare imported-exported symbols using semantic AST diff and round-trip file validation.
- [ ] **VAL-03**: System can compare Web SVG/PixiJS raster output against KiCad CLI output with configurable visual tolerance.

### Performance And Security

- [ ] **PERF-01**: PixiJS renderer can keep interactive pan and zoom smooth when displaying many repeated symbol instances by caching static symbol bodies.
- [ ] **PERF-02**: System can process a large symbol library without blocking the UI thread for unacceptable periods.
- [ ] **SEC-01**: System sanitizes user-provided symbol files, URLs, text payloads and exported SVG to prevent injection and resource exhaustion.

### Productization

- [ ] **DOC-01**: Developer documentation explains parser, IR, renderer, exporter and validation boundaries.
- [ ] **DOC-02**: User documentation explains supported KiCad features, unsupported Web-only features and expected validation workflow.

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Schematic

- **SCH-01**: User can import `.kicad_sch` files and place library symbols as schematic instances.
- **SCH-02**: User can render wires, labels, junctions, no-connect flags and hierarchical sheets.
- **SCH-03**: System can preserve schematic-level symbol instance overrides and annotation data.

### Footprint

- **FP-01**: User can inspect associated KiCad footprint references and footprint filters.
- **FP-02**: User can import and render `.kicad_mod` footprint geometry.

### Collaboration

- **COLLAB-01**: Multiple users can edit the same symbol library with conflict handling.
- **COLLAB-02**: System can track revisions and compare symbol versions across time.

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Full schematic editor | v1 focuses on symbol library interoperability before wires, nets and sheets |
| PCB layout editor | Footprints and board geometry are separate KiCad domains |
| SPICE simulation | v1 preserves metadata but does not run simulations |
| Arbitrary SVG lossless import | KiCad symbol primitives cannot represent all SVG features |
| PixiJS as persistence model | PixiJS is an interaction renderer, not a KiCad-compatible data model |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| KICAD-01 | Phase 1 | Complete |
| KICAD-02 | Phase 1 | Complete |
| KICAD-03 | Phase 1 | Complete |
| KICAD-04 | Phase 1 | Complete |
| DRAW-01 | Phase 2 | Pending |
| DRAW-02 | Phase 2 | Pending |
| DRAW-03 | Phase 2 | Pending |
| PIN-01 | Phase 2 | Pending |
| PIN-02 | Phase 2 | Pending |
| REND-01 | Phase 2 | Pending |
| VAL-01 | Phase 3 | Pending |
| VAL-02 | Phase 3 | Pending |
| VAL-03 | Phase 3 | Pending |
| REND-02 | Phase 4 | Pending |
| PERF-01 | Phase 4 | Pending |
| REND-03 | Phase 5 | Pending |
| EXP-01 | Phase 5 | Pending |
| EXP-02 | Phase 5 | Pending |
| PERF-02 | Phase 6 | Pending |
| SEC-01 | Phase 6 | Pending |
| DOC-01 | Phase 7 | Pending |
| DOC-02 | Phase 7 | Pending |

**Coverage:**
- v1 requirements: 22 total
- Mapped to phases: 22
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-28*
*Last updated: 2026-04-28 after initial definition*
