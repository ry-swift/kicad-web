# Pitfalls Research: KiCad Symbol Web Renderer

## Pitfall 1: 把渲染结果误认为 KiCad 语义

**Warning signs**
- 代码直接编辑 SVG 或 PixiJS 对象。
- 导出逻辑从画布反推 `.kicad_sym`。
- pin 电气类型、隐藏字段、unit 信息只存在 UI 状态中。

**Prevention**
- 建立 `SymbolIR` 作为唯一可编辑数据源。
- Renderer 只能读 IR，不能写持久化状态。
- 导出前跑 IR schema validation。

**Phase**
- Phase 1, Phase 5

## Pitfall 2: SVG 一比一但 PixiJS 偏离

**Warning signs**
- SVG renderer 和 PixiJS renderer 各自实现坐标、颜色、线宽和字体规则。
- PixiJS 为了性能绕过 KiCad stroke font 或 pin shape 规则。

**Prevention**
- 两个 renderer 共用同一套 geometry resolver。
- SVG 是黄金渲染路径，PixiJS 结果必须和 SVG/KiCad CLI 做抽样像素回归。

**Phase**
- Phase 2, Phase 4

## Pitfall 3: 不支持未知 KiCad 字段导致未来版本不兼容

**Warning signs**
- parser 遇到未知 token 直接报错或丢弃。
- serializer 只输出当前版本认识的字段。

**Prevention**
- CST 层保留未知结构。
- AST 层强类型识别已知字段，未知字段挂载到 extension 区。
- serializer 对未修改节点尽量保留原始顺序和未知内容。

**Phase**
- Phase 1

## Pitfall 4: Web 自定义图元无法导回 KiCad

**Warning signs**
- 编辑器允许任意 SVG path、filter、渐变、图片、复杂文本排版。
- 导出时把不支持内容近似处理且不提示用户。

**Prevention**
- v1 编辑工具只开放 KiCad 可表达的图元集。
- 对不可导出的图元给出阻断错误或显式降级确认。

**Phase**
- Phase 5

## Pitfall 5: 视觉验证只看单个样例

**Warning signs**
- 只用 `tlp250.kicad_sym` 验证成功就认为支持所有符号。
- 没有覆盖 arc、bezier、多 unit、派生 symbol、隐藏字段、不同 pin style。

**Prevention**
- 建立最小覆盖样例集。
- 后续接入 KiCad 官方 symbol library 批量测试。
- 每个 bug 都新增 fixture。

**Phase**
- Phase 3, Phase 6

## Pitfall 6: 大库和大画布性能后补困难

**Warning signs**
- 每次缩放都重建所有图元。
- 每个器件实例都保留独立复杂 Graphics。
- 文本和 stroke font 未缓存。

**Prevention**
- 静态符号 body 生成 PixiJS RenderTexture 缓存。
- 交互层、选择层、编辑控制点与静态渲染层分离。
- 对视口外实例做 culling。

**Phase**
- Phase 4, Phase 6
