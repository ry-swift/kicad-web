# Stack Research: KiCad Symbol Web Renderer

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
