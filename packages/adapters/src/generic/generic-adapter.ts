import { z } from "zod";
import type {
  SourceAdapter,
  RawParseResult,
  NormalizeResult,
  NormalizedSession,
  ParseWarningItem,
  NewMessage,
} from "@foldur/core";
import { hashContent } from "@foldur/core";

const ADAPTER_VERSION = "1.0.0";

const GenericMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system", "tool"]).default("user"),
  content: z.string(),
  timestamp: z.string().nullable().optional(),
});

const GenericConversationSchema = z.object({
  title: z.string().nullable().optional(),
  messages: z.array(GenericMessageSchema),
});

type ParseMode = "json_array" | "json_wrapped" | "markdown";

export class GenericAdapter implements SourceAdapter {
  readonly sourceType = "generic" as const;
  readonly adapterVersion = ADAPTER_VERSION;

  async canParse(data: ArrayBuffer, fileName: string): Promise<boolean> {
    if (fileName.endsWith(".json")) {
      return this.canParseJson(data);
    }
    if (fileName.endsWith(".md") || fileName.endsWith(".markdown") || fileName.endsWith(".txt")) {
      return this.canParseMarkdown(data);
    }
    return false;
  }

  async parseRaw(
    data: ArrayBuffer,
    fileName: string,
  ): Promise<RawParseResult> {
    const text = new TextDecoder().decode(data);
    const fileHash = hashContent(text);
    const warnings: ParseWarningItem[] = [];

    let rawPayload: unknown;
    let mode: ParseMode;

    if (fileName.endsWith(".md") || fileName.endsWith(".markdown") || fileName.endsWith(".txt")) {
      rawPayload = this.parseMarkdownToMessages(text, warnings);
      mode = "markdown";
    } else {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        const firstItem = parsed[0];
        if (firstItem && typeof firstItem === "object" && "messages" in firstItem) {
          rawPayload = parsed;
          mode = "json_wrapped";
        } else if (firstItem && typeof firstItem === "object" && "content" in firstItem) {
          rawPayload = [{ title: null, messages: parsed }];
          mode = "json_array";
        } else {
          rawPayload = parsed;
          mode = "json_wrapped";
        }
      } else if (typeof parsed === "object" && parsed !== null && "messages" in parsed) {
        rawPayload = [parsed];
        mode = "json_wrapped";
      } else {
        throw new Error("Unsupported JSON format: expected an array of messages or a conversation object with a messages field.");
      }
    }

    return {
      sourceType: "generic",
      rawPayload: { conversations: rawPayload, mode },
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
    const payload = raw.rawPayload as {
      conversations: unknown[];
      mode: ParseMode;
    };

    for (let i = 0; i < payload.conversations.length; i++) {
      const convRaw = payload.conversations[i];
      const parsed = GenericConversationSchema.safeParse(convRaw);

      if (!parsed.success) {
        warnings.push({
          code: "GENERIC_CONVERSATION_PARSE_ERROR",
          message: `Failed to parse conversation at index ${i}: ${parsed.error.message}`,
          context: { index: i },
        });
        continue;
      }

      const conv = parsed.data;
      const messages: NewMessage[] = conv.messages.map((msg, order) => ({
        session_id: `__session_${i}`,
        role: msg.role,
        author_label: null,
        timestamp: msg.timestamp ?? null,
        content_text: msg.content,
        content_hash: hashContent(msg.content),
        raw_payload_json: JSON.stringify(msg),
        sort_order: order,
      }));

      if (messages.length === 0) {
        warnings.push({
          code: "GENERIC_EMPTY_CONVERSATION",
          message: `Conversation at index ${i} has no messages`,
          context: { index: i },
        });
        continue;
      }

      sessions.push({
        session: {
          source_id: sourceId,
          import_batch_id: importBatchId,
          external_id: null,
          title: conv.title ?? `Import conversation ${i + 1}`,
          started_at: messages[0]?.timestamp ?? null,
          ended_at: messages[messages.length - 1]?.timestamp ?? null,
          session_type: "conversation",
          metadata_json: JSON.stringify({ mode: payload.mode }),
        },
        messages,
        artifacts: [],
      });
    }

    return { sessions, warnings };
  }

  private parseMarkdownToMessages(
    text: string,
    warnings: ParseWarningItem[],
  ): unknown[] {
    const rolePattern = /^##\s+(User|Assistant|System|Tool)\s*$/im;
    const lines = text.split("\n");
    const messages: { role: string; content: string }[] = [];

    let currentRole: string | null = null;
    let currentContent: string[] = [];

    for (const line of lines) {
      const match = rolePattern.exec(line);
      if (match) {
        if (currentRole && currentContent.length > 0) {
          messages.push({
            role: currentRole.toLowerCase(),
            content: currentContent.join("\n").trim(),
          });
        }
        currentRole = match[1]!;
        currentContent = [];
      } else {
        currentContent.push(line);
      }
    }

    if (currentRole && currentContent.length > 0) {
      messages.push({
        role: currentRole.toLowerCase(),
        content: currentContent.join("\n").trim(),
      });
    }

    if (messages.length === 0) {
      warnings.push({
        code: "GENERIC_MARKDOWN_NO_MESSAGES",
        message: "No ## User/## Assistant sections found in markdown file",
      });
    }

    return [{ title: null, messages }];
  }

  private canParseJson(data: ArrayBuffer): Promise<boolean> {
    try {
      const text = new TextDecoder().decode(data.slice(0, 2000));
      const trimmed = text.trimStart();
      if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
        return Promise.resolve(true);
      }
      return Promise.resolve(false);
    } catch {
      return Promise.resolve(false);
    }
  }

  private canParseMarkdown(data: ArrayBuffer): Promise<boolean> {
    try {
      const text = new TextDecoder().decode(data.slice(0, 5000));
      const hasRoleHeaders = /^##\s+(User|Assistant)/im.test(text);
      return Promise.resolve(hasRoleHeaders);
    } catch {
      return Promise.resolve(false);
    }
  }
}
