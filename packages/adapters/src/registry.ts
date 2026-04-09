import type { SourceAdapter } from "@foldur/core";
import { ChatGPTAdapter } from "./chatgpt/chatgpt-adapter.js";
import { GenericAdapter } from "./generic/generic-adapter.js";

const adapters: SourceAdapter[] = [
  new ChatGPTAdapter(),
  new GenericAdapter(),
];

export async function detectAdapter(
  data: ArrayBuffer,
  fileName: string,
): Promise<SourceAdapter | null> {
  for (const adapter of adapters) {
    if (await adapter.canParse(data, fileName)) {
      return adapter;
    }
  }
  return null;
}

export function getAdapters(): readonly SourceAdapter[] {
  return adapters;
}
