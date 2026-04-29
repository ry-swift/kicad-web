import { readonly, ref, type DeepReadonly, type Ref } from 'vue';
import type { KicadSymbolLibrary } from '../../kicad/index.js';
import {
  downloadKicadSymbolLibrary,
  type KicadSymbolExportOptions,
  type KicadSymbolExportPayload
} from '../export/kicad-symbol-export.js';

export interface UseKicadSymbolExportResult {
  readonly exportStatus: DeepReadonly<Ref<string>>;
  readonly exportLibrary: (
    library: KicadSymbolLibrary,
    options?: KicadSymbolExportOptions
  ) => KicadSymbolExportPayload | undefined;
}

// 组合式导出状态管理：组件只消费状态和动作，具体 Blob 下载与错误收敛放在 composable 中。
export function useKicadSymbolExport(): UseKicadSymbolExportResult {
  const exportStatus = ref('');

  const exportLibrary = (
    library: KicadSymbolLibrary,
    options: KicadSymbolExportOptions = {}
  ): KicadSymbolExportPayload | undefined => {
    try {
      const payload = downloadKicadSymbolLibrary(library, options);
      exportStatus.value = `${payload.filename} 已生成`;
      return payload;
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误';
      exportStatus.value = `导出失败：${message}`;
      console.error('[KiCad Symbol Export] failed', error);
      return undefined;
    }
  };

  return {
    exportStatus: readonly(exportStatus),
    exportLibrary
  };
}
