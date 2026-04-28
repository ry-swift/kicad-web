<!-- GSD:project-start source:PROJECT.md -->
## Project

**KiCad Symbol Web Renderer**

这是一个面向 Web EDA 的 KiCad 符号互操作项目，目标是把 KiCad `.kicad_sym` 符号库文件在 Web 端一比一渲染，并让 Web 端自定义器件能够导出为 KiCad 可识别的符号文件。系统以 TypeScript 实现的 KiCad Symbol IR 作为唯一真相，SVG 和 PixiJS 都只是同一份 IR 的渲染投影。

第一阶段聚焦符号库本体，不扩展到完整原理图编辑、PCB 编辑或仿真。当前样例输入是 `tlp250.kicad_sym`，本机 KiCad CLI 版本为 `10.0.1`，可用于生成 SVG 黄金基准。

**Core Value:** 任意受支持的 KiCad 符号都能在 Web 端高保真渲染，并且 Web 创建的符号能无语义丢失地回写成 KiCad 可打开、可校验的 `.kicad_sym`。

### Constraints

- **格式兼容**: `.kicad_sym` 必须按 KiCad S-expression 语义解析和生成 — 否则 KiCad 无法稳定读取。
- **数值精度**: 符号坐标按 `mm` 处理并序列化到最多四位小数 — 与 KiCad schematic/symbol 精度约束一致。
- **数据真相**: KiCad Symbol IR 是唯一 source of truth — SVG、PixiJS、X6 或 DOM 都不能成为业务真相。
- **渲染一致性**: SVG renderer 必须对齐 KiCad CLI 导出结果 — PixiJS renderer 通过同一 IR 追随 SVG 基准。
- **性能**: 批量符号实例应优先使用 PixiJS 缓存和分层渲染 — 避免大型符号库浏览或画布交互卡顿。
- **安全**: 外部符号库、嵌入文本、URL、SVG 输出和大文件都必须经过校验与限制 — 防止注入、DoS 和资源耗尽。
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Recommended Stack
| Area | Recommendation | Rationale | Confidence |
|------|----------------|-----------|------------|
| Language | TypeScript | KiCad Symbol IR、解析器、序列化器和渲染器都需要强类型约束，TypeScript 适合表达 discriminated union、版本化 schema 和 exhaustive check | High |
| Parser | 自研 S-expression CST/AST parser | `.kicad_sym` 需要保留顺序、未知 token、注释/格式策略和字符串转义；通用 Lisp parser 通常不理解 KiCad 领域语义 | High |
| Domain Model | KiCad Symbol IR | 作为 `.kicad_sym`、SVG、PixiJS、Web editor 的统一 source of truth | High |
| Accurate Renderer | SVG | 与 KiCad CLI `sym export svg` 天然可比对，适合做静态高保真渲染和回归基准 | High |
| Interactive Renderer | PixiJS v8 WebGLRenderer | PixiJS 官方生产建议仍优先 WebGL；适合大画布、缓存、事件、缩放和平移 | High |
| Optional Renderer | PixiJS WebGPURenderer | WebGPU 有潜在性能优势，但浏览器实现差异仍需灰度启用 | Medium |
| Test Runner | Vitest + Playwright | Vitest 做 parser/serializer/IR 单测；Playwright 做浏览器截图和像素回归 | High |
| Golden Oracle | KiCad CLI 10.x | 使用 `kicad-cli sym export svg` 生成真实 KiCad 基准输出 | High |
| Visual Diff | SVG structural diff + raster pixel diff | 单纯 SVG 字符串 diff 太脆弱，必须结合语义结构和像素级结果 | High |
## What Not To Use
- 不把 PixiJS DisplayObject 作为符号模型，因为它丢失 KiCad 文件语义。
- 不把 KiCad CLI 导出的 SVG 当作唯一存储格式，因为 SVG 无法完整表达 pin 电气类型、属性、单位和 KiCad 元数据。
- 不用正则解析 `.kicad_sym`，因为 S-expression 嵌套、字符串转义、未知字段和版本差异都会导致错误。
- 不在 v1 引入完整协同 CRDT，符号互转和渲染正确性先于多人协同。
## Version Notes
- 当前本机 KiCad CLI: `10.0.1`。
- 样例文件 `tlp250.kicad_sym` 由 KiCad 10.0 生成，文件版本为 `20251024`。
- PixiJS 资料窗口：2026-04-28 官方文档显示 WebGLRenderer 为推荐生产路径，WebGPURenderer 仍需谨慎。
## References
- KiCad Symbol Library File Format: https://dev-docs.kicad.org/en/file-formats/sexpr-symbol-lib/index.html
- KiCad S-expression Format: https://dev-docs.kicad.org/en/file-formats/sexpr-intro/
- KiCad CLI: https://docs.kicad.org/master/en/cli/cli.html
- PixiJS Renderers: https://pixijs.com/8.x/guides/components/renderers
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, or `.github/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
