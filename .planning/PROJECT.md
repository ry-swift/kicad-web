# KiCad Symbol Web Renderer

## What This Is

这是一个面向 Web EDA 的 KiCad 符号互操作项目，目标是把 KiCad `.kicad_sym` 符号库文件在 Web 端一比一渲染，并让 Web 端自定义器件能够导出为 KiCad 可识别的符号文件。系统以 TypeScript 实现的 KiCad Symbol IR 作为唯一真相，SVG 和 PixiJS 都只是同一份 IR 的渲染投影。

第一阶段聚焦符号库本体，不扩展到完整原理图编辑、PCB 编辑或仿真。当前样例输入是 `tlp250.kicad_sym`，本机 KiCad CLI 版本为 `10.0.1`，可用于生成 SVG 黄金基准。

## Core Value

任意受支持的 KiCad 符号都能在 Web 端高保真渲染，并且 Web 创建的符号能无语义丢失地回写成 KiCad 可打开、可校验的 `.kicad_sym`。

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] 建立 `.kicad_sym` S-expression 解析、保真 AST 和 KiCad Symbol IR。
- [ ] 实现 Web SVG 精确渲染器，作为与 KiCad CLI 对齐的基准渲染路径。
- [ ] 实现 PixiJS 高性能交互渲染器，用于大画布缩放、平移、选中、高亮和编辑。
- [ ] 实现 Web 自定义器件到 `.kicad_sym` 的导出能力。
- [ ] 建立 KiCad CLI 驱动的语义、结构和视觉回归验证体系。
- [ ] 建立安全边界，避免 SVG 注入、恶意文件、超大符号库和不兼容图元静默丢失。

### Out of Scope

- 完整 `.kicad_sch` 原理图编辑 — v1 只保证符号库互转，原理图实例、连线、网络和层级页后续再做。
- PCB/封装编辑和 `.kicad_mod` 互转 — 当前任务只处理 schematic symbol，不处理 footprint 几何。
- SPICE 仿真和 ERC 完整实现 — v1 保留相关字段和电气类型，但不承诺完整仿真或规则检查。
- 任意 SVG 到 KiCad 符号的自动无损导入 — KiCad 只能表达有限图元，任意 SVG 需要单独的近似转换策略。
- 用 PixiJS 作为数据源 — PixiJS 只负责高性能投影，不能替代 KiCad Symbol IR。

## Context

- KiCad 6.0+ 使用 `.kicad_sym` S-expression 作为符号库格式，一个库文件可包含多个 `symbol`。
- 官方文件格式要求坐标和尺寸使用毫米，schematic/symbol 内部精度应控制到 `0.0001mm`。
- KiCad CLI 支持 `sym export svg`，可把符号库导出为 SVG；本机 `/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli version` 输出 `10.0.1`。
- PixiJS v8 支持 WebGL/WebGL2 和 WebGPU；当前生产建议优先 WebGL，WebGPU 可作为实验性或可选路径。
- 截图中的网格、十字光标、蓝色电气类型文字、灰色隐藏 NC 等属于编辑器辅助层，不完全来自符号本体图元，Web 端需要分层表达。

## Constraints

- **格式兼容**: `.kicad_sym` 必须按 KiCad S-expression 语义解析和生成 — 否则 KiCad 无法稳定读取。
- **数值精度**: 符号坐标按 `mm` 处理并序列化到最多四位小数 — 与 KiCad schematic/symbol 精度约束一致。
- **数据真相**: KiCad Symbol IR 是唯一 source of truth — SVG、PixiJS、X6 或 DOM 都不能成为业务真相。
- **渲染一致性**: SVG renderer 必须对齐 KiCad CLI 导出结果 — PixiJS renderer 通过同一 IR 追随 SVG 基准。
- **性能**: 批量符号实例应优先使用 PixiJS 缓存和分层渲染 — 避免大型符号库浏览或画布交互卡顿。
- **安全**: 外部符号库、嵌入文本、URL、SVG 输出和大文件都必须经过校验与限制 — 防止注入、DoS 和资源耗尽。

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| IR first，渲染器只是投影 | 互转正确性必须绑定 KiCad 语义模型，不能绑定某个画布框架 | — Pending |
| SVG renderer 作为精确基准 | SVG 更接近 KiCad CLI 导出，便于结构和像素回归 | — Pending |
| PixiJS renderer 用于主交互画布 | 大量符号、缩放平移、选中高亮和编辑控制点更适合 GPU 加速 | — Pending |
| KiCad CLI 作为黄金验证源 | `kicad-cli sym export svg` 能提供真实 KiCad 渲染输出 | — Pending |
| Web 自定义图元必须受 KiCad 图元集约束 | 避免 Web 能画但 KiCad 无法表达，导致导出静默丢失 | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `$gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `$gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-28 after initialization*
