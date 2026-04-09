import type {
  IntelligenceProvider,
  SessionExtractionInput,
  ProjectExtractionCandidate,
} from "@foldur/core";

export interface OllamaHealthResult {
  available: boolean;
  models: string[];
  error?: string;
}

export interface OllamaChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OllamaChatResponse {
  message?: { content?: string };
}

interface OllamaTagsResponse {
  models?: Array<{ name?: string }>;
}

const DEFAULT_TIMEOUT_MS = 180_000;

export async function checkOllamaHealth(
  baseUrl: string,
): Promise<OllamaHealthResult> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    const res = await fetch(`${baseUrl}/api/tags`, {
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      return { available: false, models: [], error: `HTTP ${res.status}` };
    }

    const data = (await res.json()) as OllamaTagsResponse;
    const models = (data.models ?? [])
      .map((m) => m.name ?? "")
      .filter((n) => n.length > 0);
    return { available: true, models };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { available: false, models: [], error: msg };
  }
}

export class OllamaProvider implements IntelligenceProvider {
  readonly id = "ollama";
  readonly isLocal = true;
  readonly tier = "local-model" as const;
  readonly requiresNetwork = false;
  readonly privacyDisclosure =
    "All data is processed locally by the Ollama model running on your machine. No data leaves your device.";

  readonly modelName: string;
  private readonly baseUrl: string;

  constructor(baseUrl = "http://localhost:11434", model = "llama3.2") {
    this.baseUrl = baseUrl;
    this.modelName = model;
  }

  async chatCompletion(
    messages: OllamaChatMessage[],
    options?: { json?: boolean; timeout?: number },
  ): Promise<string> {
    const controller = new AbortController();
    const timeout = options?.timeout ?? DEFAULT_TIMEOUT_MS;
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const body: Record<string, unknown> = {
        model: this.modelName,
        messages,
        stream: false,
      };
      if (options?.json) {
        body.format = "json";
      }

      const res = await fetch(`${this.baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new OllamaError(
          `Ollama returned HTTP ${res.status}: ${text.slice(0, 200)}`,
          res.status === 404 ? "model_not_found" : "http_error",
        );
      }

      const data = (await res.json()) as OllamaChatResponse;
      const content = data.message?.content;
      if (typeof content !== "string" || content.length === 0) {
        throw new OllamaError("Empty response from Ollama", "empty_response");
      }
      return content;
    } catch (err) {
      if (err instanceof OllamaError) throw err;
      if (err instanceof DOMException && err.name === "AbortError") {
        throw new OllamaError(
          `Ollama request timed out after ${Math.round(timeout / 1000)}s`,
          "timeout",
        );
      }
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("fetch") || msg.includes("connect") || msg.includes("ECONNREFUSED")) {
        throw new OllamaError(
          `Cannot connect to Ollama at ${this.baseUrl}. Is Ollama running?`,
          "connection_refused",
        );
      }
      throw new OllamaError(msg, "unknown");
    } finally {
      clearTimeout(timer);
    }
  }

  async extractSession(
    _input: SessionExtractionInput,
  ): Promise<ProjectExtractionCandidate[]> {
    return [];
  }

  async summarizeSession(
    input: SessionExtractionInput,
  ): Promise<string | null> {
    const title = input.session.title ?? "Untitled session";
    const messageSnippets = input.messages
      .filter((m) => m.role === "user")
      .slice(0, 10)
      .map((m) => (m.content_text ?? "").slice(0, 200))
      .join("\n");

    const result = await this.chatCompletion([
      {
        role: "system",
        content:
          "Summarize the following AI conversation in 2-3 sentences. Focus on the user's goals and key decisions.",
      },
      {
        role: "user",
        content: `Title: ${title}\n\nUser messages:\n${messageSnippets}`,
      },
    ]);
    return result.trim() || null;
  }

  async extractTopics(
    input: SessionExtractionInput,
  ): Promise<string[]> {
    const title = input.session.title ?? "Untitled session";
    const messageSnippets = input.messages
      .filter((m) => m.role === "user")
      .slice(0, 10)
      .map((m) => (m.content_text ?? "").slice(0, 200))
      .join("\n");

    const result = await this.chatCompletion(
      [
        {
          role: "system",
          content:
            'Extract 3-8 topic keywords from this conversation. Return a JSON array of strings, e.g. ["topic1", "topic2"].',
        },
        {
          role: "user",
          content: `Title: ${title}\n\nUser messages:\n${messageSnippets}`,
        },
      ],
      { json: true },
    );

    try {
      const parsed = JSON.parse(result);
      if (Array.isArray(parsed)) {
        return parsed.filter((v): v is string => typeof v === "string").slice(0, 10);
      }
      if (parsed.topics && Array.isArray(parsed.topics)) {
        return parsed.topics
          .filter((v: unknown): v is string => typeof v === "string")
          .slice(0, 10);
      }
      return [];
    } catch {
      return [];
    }
  }

  async generateDescription(
    title: string,
    sessionTitles: string[],
  ): Promise<string | null> {
    const result = await this.chatCompletion([
      {
        role: "system",
        content:
          "Generate a one-sentence description for this project based on its title and related session titles.",
      },
      {
        role: "user",
        content: `Project: ${title}\nSessions: ${sessionTitles.slice(0, 20).join(", ")}`,
      },
    ]);
    return result.trim() || null;
  }
}

export type OllamaErrorCode =
  | "connection_refused"
  | "model_not_found"
  | "timeout"
  | "empty_response"
  | "http_error"
  | "parse_error"
  | "unknown";

export class OllamaError extends Error {
  readonly code: OllamaErrorCode;

  constructor(message: string, code: OllamaErrorCode) {
    super(message);
    this.name = "OllamaError";
    this.code = code;
  }
}
