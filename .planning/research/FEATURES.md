# Feature Research: KiCad Symbol Web Renderer

## Table Stakes

| Feature | Why It Matters | Complexity |
|---------|----------------|------------|
| `.kicad_sym` 导入 | 没有导入就无法复用 KiCad 生态符号库 | High |
| AST/IR 保真转换 | 互转正确性依赖结构化模型，不是截图级复刻 | High |
| SVG 精确渲染 | 需要一条能和 KiCad CLI 对齐的基准渲染路径 | High |
| Pin 和属性完整支持 | KiCad 符号不只是图形，还包含电气类型、编号、隐藏规则和字段 | High |
| `.kicad_sym` 导出 | Web 自定义器件必须能回到 KiCad | High |
| CLI 回归验证 | 只有靠 KiCad 自己导出的结果做对照，才能避免伪兼容 | Medium |

## Differentiators

| Feature | Value | Complexity |
|---------|-------|------------|
| PixiJS 高性能交互画布 | 大量器件实例和编辑操作更流畅 | Medium |
| KiCad 差异报告 | 告诉用户哪个字段、图元或像素区域发生偏差 | Medium |
| 不兼容图元导出前阻断 | 防止 Web 画布能画、KiCad 文件无法表达的问题 | Medium |
| 官方库批量兼容测试 | 更快建立对“所有符号”的实际覆盖信心 | High |

## Anti-Features

| Feature | Reason |
|---------|--------|
| 任意 SVG 无损转 KiCad | KiCad 图元集有限，任意 SVG 不可保证无损 |
| 一开始就做完整原理图编辑器 | 会把问题扩大到 wires、nets、hierarchy、annotation，影响符号互转主线 |
| 一开始就做多人协同 | 协同会引入 OT/CRDT 和权限问题，当前核心风险是格式和渲染正确性 |
| 用图片缓存替代真实符号模型 | 图片不能导出成可编辑、可校验的 KiCad symbol |

## Roadmap Implications

- Phase 1 必须先打通 parser、AST、IR 和 serializer。
- Phase 2 再做 SVG renderer，因为它是后续 PixiJS 和视觉验证的精度基准。
- Phase 3 尽早接入 KiCad CLI 回归，避免后续 PixiJS 交互实现偏离 KiCad。
- Phase 4 才进入 PixiJS 大画布优化。
- Phase 5 之后再开放 Web 编辑和导出 guardrail。
