import tlp250Source from '../../../tlp250.kicad_sym?raw';
import { parseKicadSymbolLibraryCst, toSymbolLibraryIR } from '../../kicad/index.js';
import { parseSExprDocument, type SExprList, type SExprNode } from '../../sexpr/index.js';

// 样例转换入口：
// 1. Vite 先把 `.kicad_sym` 作为原始文本读入。
// 2. `parseSExprDocument` 先解析出 CST，用来保留原始括号、atom、raw 文本和 source span。
// 3. `parseKicadSymbolLibraryCst` 再把 CST 映射成 KiCad AST，理解 symbol/property/graphic/pin 语义。
// 4. `toSymbolLibraryIR` 最后把 AST 转成 renderer 无关的 Symbol IR，供 PixiJS/SVG/后续编辑共同消费。
export const tlp250CST = parseSExprDocument(tlp250Source);
export const tlp250Library = parseKicadSymbolLibraryCst(rootList(tlp250CST.expressions[0]));
export const tlp250IR = toSymbolLibraryIR(tlp250Library);

if (import.meta.env.DEV) {
  printSamplePipelineDebug();
}

function rootList(node: SExprNode | undefined): SExprList {
  if (!node || node.kind !== 'list') {
    throw new Error('TLP250 sample must contain one root S-expression list');
  }
  return node;
}

// 仅在开发环境打印样例转换链路：
// 控制台先给出精简摘要，完整对象放在 collapsed group 中，便于按需展开查看。
function printSamplePipelineDebug(): void {
  const symbol = tlp250Library.symbols[0];
  const irSymbol = tlp250IR.symbols[0];

  console.groupCollapsed('[KiCad Symbol Debug] TLP250 CST -> AST -> IR');
  console.table([
    {
      stage: 'CST',
      meaning: '具体语法树：保留原始 S-expression 结构',
      root: cstHead(tlp250CST.expressions[0]),
      detail: `${tlp250CST.expressions.length} root expression`
    },
    {
      stage: 'AST',
      meaning: 'KiCad 语义树：理解 symbol/property/graphic/pin',
      root: symbol?.name ?? '<missing symbol>',
      detail: `${symbol?.properties.length ?? 0} properties, ${symbol?.units.length ?? 0} units`
    },
    {
      stage: 'IR',
      meaning: 'Web 业务模型：稳定 ID + renderer 无关',
      root: irSymbol?.id ?? '<missing symbol ir>',
      detail: `${irSymbol?.units.reduce((total, unit) => total + unit.graphics.length, 0) ?? 0} graphics, ${irSymbol?.units.reduce((total, unit) => total + unit.pins.length, 0) ?? 0} pins`
    }
  ]);

  console.groupCollapsed('CST 原始语法树摘要');
  console.log(summarizeCstNode(tlp250CST.expressions[0]));
  console.log('完整 CST document:', tlp250CST);
  console.groupEnd();

  console.groupCollapsed('AST KiCad 语义树');
  console.log({
    version: tlp250Library.version,
    generator: tlp250Library.generator,
    generatorVersion: tlp250Library.generatorVersion,
    symbol
  });
  console.log('完整 AST library:', tlp250Library);
  console.groupEnd();

  console.groupCollapsed('IR Web 业务真相模型');
  console.log({
    version: tlp250IR.version,
    generator: tlp250IR.generator,
    generatorVersion: tlp250IR.generatorVersion,
    symbol: irSymbol
  });
  console.log('完整 SymbolLibraryIR:', tlp250IR);
  console.groupEnd();

  console.groupEnd();
}

function summarizeCstNode(node: SExprNode | undefined, depth = 0): unknown {
  if (!node) {
    return undefined;
  }

  if (node.kind === 'atom') {
    return {
      kind: node.kind,
      atomType: node.atomType,
      value: node.value,
      raw: node.raw,
      span: node.span
    };
  }

  return {
    kind: node.kind,
    head: cstHead(node),
    span: node.span,
    itemCount: node.items.length,
    items: depth >= 2 ? `... ${node.items.length} items ...` : node.items.slice(0, 8).map((item) => summarizeCstNode(item, depth + 1))
  };
}

function cstHead(node: SExprNode | undefined): string {
  if (!node || node.kind !== 'list') {
    return '<not-list>';
  }

  const head = node.items[0];
  return head?.kind === 'atom' ? head.value : '<empty-list>';
}
