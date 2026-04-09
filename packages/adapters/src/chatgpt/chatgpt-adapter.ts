import { z } from "zod";
import type {
  SourceAdapter,
  RawParseResult,
  NormalizeResult,
  NormalizedSession,
  ParseWarningItem,
  NewMessage,
  NewArtifact,
} from "@foldur/core";
import { hashContent, unixToISO } from "@foldur/core";
import {
  ChatGPTConversationSchema,
  type ChatGPTConversation,
  type ChatGPTMappingNode,
} from "./types.js";

const ADAPTER_VERSION = "1.0.0";

export class ChatGPTAdapter implements SourceAdapter {
  readonly sourceType = "chatgpt" as const;
  readonly adapterVersion = ADAPTER_VERSION;

  async canParse(data: ArrayBuffer, fileName: string): Promise<boolean> {
    if (fileName.endsWith(".zip")) {
      return this.canParseZip(data);
    }
    if (fileName.endsWith(".json")) {
      return this.canParseJson(data);
    }
    return false;
  }

  async parseRaw(
    data: ArrayBuffer,
    fileName: string,
  ): Promise<RawParseResult> {
    const warnings: ParseWarningItem[] = [];
    let jsonData: unknown;

    if (fileName.endsWith(".zip")) {
      jsonData = await this.extractJsonFromZip(data, warnings);
    } else {
      const text = new TextDecoder().decode(data);
      jsonData = JSON.parse(text);
    }

    const conversations = z.array(z.unknown()).parse(jsonData);
    const fileHash = hashContent(new TextDecoder().decode(data));

    return {
      sourceType: "chatgpt",
      rawPayload: conversations,
      fileHash,
      fileName,
      warnings,
    };
  }

  normalize(
    raw: RawParseResult,
    sourceId: string,
    importBatchId: string,
  ): NormalizeResult {
    const warnings: ParseWarningItem[] = [...raw.warnings];
    const sessions: NormalizedSession[] = [];
    const rawConversations = raw.rawPayload as unknown[];

    for (let i = 0; i < rawConversations.length; i++) {
      const parsed = ChatGPTConversationSchema.safeParse(rawConversations[i]);
      if (!parsed.success) {
        warnings.push({
          code: "CHATGPT_CONVERSATION_PARSE_ERROR",
          message: `Failed to parse conversation at index ${i}: ${parsed.error.message}`,
          context: { index: i },
        });
        continue;
      }

      const conv = parsed.data;
      const result = this.normalizeConversation(
        conv,
        sourceId,
        importBatchId,
        i,
        warnings,
      );
      if (result) {
        sessions.push(result);
      }
    }

    return { sessions, warnings };
  }

  private normalizeConversation(
    conv: ChatGPTConversation,
    sourceId: string,
    importBatchId: string,
    index: number,
    warnings: ParseWarningItem[],
  ): NormalizedSession | null {
    const orderedNodes = this.walkTree(conv.mapping, warnings, index);

    if (orderedNodes.length === 0) {
      warnings.push({
        code: "CHATGPT_EMPTY_CONVERSATION",
        message: `Conversation "${conv.title}" at index ${index} has no messages`,
        context: { index, title: conv.title },
      });
      return null;
    }

    const externalId = conv.conversation_id ?? conv.id ?? null;
    const startedAt = conv.create_time ? unixToISO(conv.create_time) : null;
    const endedAt = conv.update_time ? unixToISO(conv.update_time) : null;

    const messages: NewMessage[] = [];
    const artifacts: NewArtifact[] = [];
    const sessionIdPlaceholder = `__session_${index}`;

    for (let order = 0; order < orderedNodes.length; order++) {
      const node = orderedNodes[order]!;
      const msg = node.message;
      if (!msg) continue;

      const contentText = this.extractContentText(msg.content);
      if (!contentText) continue;

      const role = this.mapRole(msg.author.role);
      const timestamp = msg.create_time ? unixToISO(msg.create_time) : null;

      messages.push({
        session_id: sessionIdPlaceholder,
        role,
        author_label: msg.author.name ?? null,
        timestamp,
        content_text: contentText,
        content_hash: hashContent(contentText),
        raw_payload_json: JSON.stringify(msg),
        sort_order: order,
      });

      const codeBlocks = this.extractCodeBlocks(contentText);
      for (const block of codeBlocks) {
        artifacts.push({
          session_id: sessionIdPlaceholder,
          message_id: null,
          artifact_type: "code",
          title: block.language ? `Code (${block.language})` : "Code block",
          content_text: block.code,
          mime_type: block.language ? `text/x-${block.language}` : "text/plain",
          raw_payload_json: null,
        });
      }
    }

    return {
      session: {
        source_id: sourceId,
        import_batch_id: importBatchId,
        external_id: externalId,
        title: conv.title || null,
        started_at: startedAt,
        ended_at: endedAt,
        session_type: "conversation",
        metadata_json: null,
      },
      messages,
      artifacts,
    };
  }

  private walkTree(
    mapping: Record<string, ChatGPTMappingNode>,
    warnings: ParseWarningItem[],
    convIndex: number,
  ): ChatGPTMappingNode[] {
    const nodes = Object.values(mapping);
    const rootCandidates = nodes.filter(
      (n) => !n.parent || !mapping[n.parent],
    );

    if (rootCandidates.length === 0) {
      warnings.push({
        code: "CHATGPT_NO_ROOT_NODE",
        message: `No root node found in conversation at index ${convIndex}`,
        context: { index: convIndex },
      });
      return [];
    }

    const ordered: ChatGPTMappingNode[] = [];
    const visited = new Set<string>();

    const walk = (nodeId: string): void => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      const node = mapping[nodeId];
      if (!node) return;

      if (node.message?.content) {
        ordered.push(node);
      }

      const children = node.children ?? [];
      for (const childId of children) {
        walk(childId);
      }
    };

    for (const root of rootCandidates) {
      walk(root.id);
    }

    return ordered;
  }

  private extractContentText(
    content: { content_type: string; parts?: unknown[] | null } | null | undefined,
  ): string {
    if (!content?.parts) return "";

    const textParts = content.parts
      .filter((p): p is string => typeof p === "string")
      .join("\n");

    return textParts.trim();
  }

  private extractCodeBlocks(
    text: string,
  ): { language: string | null; code: string }[] {
    const blocks: { language: string | null; code: string }[] = [];
    const regex = /```(\w*)\n([\s\S]*?)```/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
      blocks.push({
        language: match[1] || null,
        code: match[2]?.trim() ?? "",
      });
    }

    return blocks;
  }

  private mapRole(role: string): "user" | "assistant" | "system" | "tool" | "unknown" {
    switch (role) {
      case "user":
        return "user";
      case "assistant":
        return "assistant";
      case "system":
        return "system";
      case "tool":
        return "tool";
      default:
        return "unknown";
    }
  }

  private async canParseZip(data: ArrayBuffer): Promise<boolean> {
    const header = new Uint8Array(data.slice(0, 4));
    return header[0] === 0x50 && header[1] === 0x4b && header[2] === 0x03 && header[3] === 0x04;
  }

  private canParseJson(data: ArrayBuffer): Promise<boolean> {
    try {
      const text = new TextDecoder().decode(data);
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed) || parsed.length === 0) return Promise.resolve(false);
      const first = parsed[0];
      return Promise.resolve(
        typeof first === "object" &&
        first !== null &&
        "mapping" in first,
      );
    } catch {
      return Promise.resolve(false);
    }
  }

  private async extractJsonFromZip(
    data: ArrayBuffer,
    warnings: ParseWarningItem[],
  ): Promise<unknown> {
    // In the browser/Tauri context, we use the DecompressionStream API
    // For V1, we look for conversations.json in the zip using a minimal approach
    // Since proper zip parsing in pure browser JS is complex, we'll use a fallback:
    // try to find the conversations.json payload within the zip binary
    const textDecoder = new TextDecoder();
    const fullText = textDecoder.decode(data);

    const jsonStart = fullText.indexOf("[{");
    if (jsonStart === -1) {
      throw new Error(
        "Could not locate conversation JSON array in zip file. Please extract conversations.json and import it directly.",
      );
    }

    const jsonEnd = fullText.lastIndexOf("}]");
    if (jsonEnd === -1) {
      throw new Error("Could not find end of conversation JSON array in zip file.");
    }

    const jsonStr = fullText.slice(jsonStart, jsonEnd + 2);

    warnings.push({
      code: "CHATGPT_ZIP_HEURISTIC_EXTRACTION",
      message:
        "Used heuristic extraction from zip. For best results, extract conversations.json manually.",
    });

    return JSON.parse(jsonStr);
  }
}
