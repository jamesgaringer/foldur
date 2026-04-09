import { useCallback, useEffect, useState } from "react";
import { getSetting, setSetting } from "@foldur/db";
import { checkOllamaHealth, type OllamaHealthResult } from "@foldur/pipeline";
import { useDbStore } from "../stores/db-store.ts";

type ProviderTier = "local-heuristic" | "local-model" | "remote-model";

export function SettingsPage() {
  const db = useDbStore((s) => s.db);
  const isReady = useDbStore((s) => s.isReady);

  const [tier, setTier] = useState<ProviderTier>("local-heuristic");
  const [ollamaUrl, setOllamaUrl] = useState("http://localhost:11434");
  const [ollamaModel, setOllamaModel] = useState("llama3.2");
  const [remoteProvider, setRemoteProvider] = useState<"openai" | "anthropic">("openai");
  const [apiKey, setApiKey] = useState("");
  const [loaded, setLoaded] = useState(false);

  const [healthResult, setHealthResult] = useState<OllamaHealthResult | null>(null);
  const [testing, setTesting] = useState(false);

  const loadSettings = useCallback(async () => {
    if (!db) return;
    const [savedTier, savedUrl, savedModel, savedRemote, savedKey] =
      await Promise.all([
        getSetting(db, "intelligence_tier"),
        getSetting(db, "ollama_url"),
        getSetting(db, "ollama_model"),
        getSetting(db, "remote_provider"),
        getSetting(db, "remote_api_key"),
      ]);
    if (savedTier) setTier(savedTier as ProviderTier);
    if (savedUrl) setOllamaUrl(savedUrl);
    if (savedModel) setOllamaModel(savedModel);
    if (savedRemote) setRemoteProvider(savedRemote as "openai" | "anthropic");
    if (savedKey) setApiKey(savedKey);
    setLoaded(true);
  }, [db]);

  useEffect(() => {
    if (isReady && db) void loadSettings();
  }, [isReady, db, loadSettings]);

  const persist = useCallback(
    async (key: string, value: string) => {
      if (!db) return;
      try {
        await setSetting(db, key, value);
      } catch (err) {
        console.error(`Failed to save setting ${key}:`, err);
      }
    },
    [db],
  );

  const onTierChange = (newTier: ProviderTier) => {
    setTier(newTier);
    void persist("intelligence_tier", newTier);
  };

  const onOllamaUrlChange = (url: string) => {
    setOllamaUrl(url);
    void persist("ollama_url", url);
    setHealthResult(null);
  };

  const onOllamaModelChange = (model: string) => {
    setOllamaModel(model);
    void persist("ollama_model", model);
  };

  const onRemoteProviderChange = (prov: "openai" | "anthropic") => {
    setRemoteProvider(prov);
    void persist("remote_provider", prov);
  };

  const onApiKeyChange = (key: string) => {
    setApiKey(key);
    void persist("remote_api_key", key);
  };

  const testConnection = async () => {
    setTesting(true);
    setHealthResult(null);
    try {
      const result = await checkOllamaHealth(ollamaUrl);
      setHealthResult(result);
    } catch {
      setHealthResult({ available: false, models: [], error: "Unexpected error" });
    } finally {
      setTesting(false);
    }
  };

  if (!loaded) {
    return (
      <div className="mx-auto max-w-3xl py-12 text-center text-sm text-[var(--color-text-muted)]">
        Loading settings...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="mb-2 text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Configure how Foldur analyzes your conversations. All settings are stored locally.
        </p>
      </div>

      {/* Intelligence provider */}
      <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <h2 className="mb-1 text-lg font-semibold text-[var(--color-text-primary)]">
          Intelligence Provider
        </h2>
        <p className="mb-4 text-sm text-[var(--color-text-secondary)]">
          Choose how session analysis is performed. Higher tiers produce richer insights but may
          involve sending data to external services.
        </p>

        <div className="space-y-3">
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-[var(--color-border)] p-3 transition-colors hover:bg-[var(--color-surface-raised)]">
            <input
              type="radio"
              name="provider-tier"
              value="local-heuristic"
              checked={tier === "local-heuristic"}
              onChange={() => onTierChange("local-heuristic")}
              className="mt-1"
            />
            <div>
              <p className="font-medium text-[var(--color-text-primary)]">
                Local Heuristics
                <span className="ml-2 rounded-full bg-green-500/20 px-2 py-0.5 text-[10px] font-semibold text-green-400">
                  Default
                </span>
              </p>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                Keyword extraction, computed statistics, and rule-based analysis. Fully on-device,
                no network calls. Fast and private.
              </p>
            </div>
          </label>

          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-[var(--color-border)] p-3 transition-colors hover:bg-[var(--color-surface-raised)]">
            <input
              type="radio"
              name="provider-tier"
              value="local-model"
              checked={tier === "local-model"}
              onChange={() => onTierChange("local-model")}
              className="mt-1"
            />
            <div>
              <p className="font-medium text-[var(--color-text-primary)]">
                Local Model (Ollama)
              </p>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                Uses a local LLM via Ollama for deep behavioral profiling, summarization, and
                pattern recognition. Data stays on your device. Requires Ollama running locally.
              </p>
            </div>
          </label>

          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-[var(--color-border)] p-3 transition-colors hover:bg-[var(--color-surface-raised)]">
            <input
              type="radio"
              name="provider-tier"
              value="remote-model"
              checked={tier === "remote-model"}
              onChange={() => onTierChange("remote-model")}
              className="mt-1"
            />
            <div>
              <p className="font-medium text-[var(--color-text-primary)]">
                Remote Model (API)
                <span className="ml-2 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
                  Coming Soon
                </span>
              </p>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                Uses OpenAI or Anthropic APIs for highest-quality analysis. Requires an API key.
              </p>
            </div>
          </label>
        </div>
      </section>

      {/* Local model config */}
      {tier === "local-model" && (
        <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <h2 className="mb-3 text-lg font-semibold text-[var(--color-text-primary)]">
            Local Model Configuration
          </h2>

          <div className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-[var(--color-text-secondary)]">
                Ollama endpoint URL
              </span>
              <input
                type="url"
                value={ollamaUrl}
                onChange={(e) => onOllamaUrlChange(e.target.value)}
                placeholder="http://localhost:11434"
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-[var(--color-text-secondary)]">
                Model name
              </span>
              <input
                type="text"
                value={ollamaModel}
                onChange={(e) => onOllamaModelChange(e.target.value)}
                placeholder="llama3.2"
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none"
              />
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                The Ollama model to use for analysis. Must be pulled locally first via{" "}
                <code className="rounded bg-[var(--color-surface-raised)] px-1 py-0.5">
                  ollama pull {ollamaModel}
                </code>
              </p>
            </label>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={() => void testConnection()}
              disabled={testing}
              className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
            >
              {testing ? "Testing..." : "Test Connection"}
            </button>

            {healthResult && (
              <div className="text-sm">
                {healthResult.available ? (
                  <span className="text-green-400">
                    Connected — {healthResult.models.length} model(s):{" "}
                    {healthResult.models.slice(0, 5).join(", ")}
                  </span>
                ) : (
                  <span className="text-red-400">
                    Not reachable{healthResult.error ? `: ${healthResult.error}` : ""}
                  </span>
                )}
              </div>
            )}
          </div>

          <p className="mt-3 text-xs text-[var(--color-text-muted)]">
            All data is processed locally by the model running on your machine. No data leaves your device.
          </p>
        </section>
      )}

      {/* Remote model config */}
      {tier === "remote-model" && (
        <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <h2 className="mb-3 text-lg font-semibold text-[var(--color-text-primary)]">
            Remote Model Configuration
          </h2>

          <div className="mb-4 rounded-md border border-amber-500/40 bg-amber-950/30 px-4 py-3">
            <p className="text-sm font-semibold text-amber-400">
              Privacy Notice
            </p>
            <p className="mt-1 text-sm text-amber-300/80">
              When using a remote provider, your conversation content will be sent to third-party
              servers for analysis. This includes message text, session titles, and extracted
              artifacts. Only enable this if you are comfortable sharing your data with the
              selected provider.
            </p>
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-[var(--color-text-secondary)]">Provider</span>
              <select
                value={remoteProvider}
                onChange={(e) => onRemoteProviderChange(e.target.value as "openai" | "anthropic")}
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)]"
              >
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-[var(--color-text-secondary)]">API Key</span>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => onApiKeyChange(e.target.value)}
                placeholder={remoteProvider === "openai" ? "sk-..." : "sk-ant-..."}
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus:outline-none"
              />
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                Your API key is stored locally and never sent anywhere except to the selected provider's API.
              </p>
            </label>
          </div>

          <div className="mt-3 rounded-md border border-amber-500/30 bg-amber-950/20 px-3 py-2">
            <p className="text-sm text-amber-400">
              Remote model integration is not yet available. This configuration will be saved for when it is implemented.
            </p>
          </div>
        </section>
      )}

      {/* Data storage info */}
      <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <h2 className="mb-3 text-lg font-semibold text-[var(--color-text-primary)]">
          Data Storage
        </h2>
        <p className="text-sm text-[var(--color-text-secondary)]">
          All your imported data, derived intelligence, and settings are stored locally in an
          SQLite database on your device. Foldur does not collect telemetry or send data
          anywhere unless you explicitly configure a remote provider above.
        </p>
        <p className="mt-2 text-xs text-[var(--color-text-muted)]">
          Database location: managed by Tauri (platform app data directory).
        </p>
      </section>
    </div>
  );
}
