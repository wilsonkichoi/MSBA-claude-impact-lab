/**
 * SERVER ONLY. Picks the active ModelExtractor from the environment.
 * See resolveExtractorBackend() for the selection and gating rules.
 */
import { getClaudeExtractor } from "./claude-extractor";
import { CLI_TIMEOUT_MS, createClaudeCliExtractor, createCodexCliExtractor, findOnPath } from "./cli-extractor";
import { resolveExtractorBackend, type ExtractorBackend } from "./extractor-backends";
import type { ModelExtractor } from "./notice-extraction";

export type ActiveExtractor = { backend: ExtractorBackend; extractor: ModelExtractor; timeoutMs: number };

const API_TIMEOUT_MS = 30_000;

export function getActiveExtractor(env: Record<string, string | undefined> = process.env): ActiveExtractor | null {
  const backend = resolveExtractorBackend(env);
  switch (backend) {
    case null:
      return null;
    case "anthropic": {
      const extractor = getClaudeExtractor();
      return extractor ? { backend, extractor, timeoutMs: API_TIMEOUT_MS } : null;
    }
    case "claude-cli": {
      const command = findOnPath("claude", env.PATH);
      if (!command) return null;
      const model = env.CLAUDE_CLI_MODEL?.trim() || undefined;
      return { backend, extractor: createClaudeCliExtractor({ command, model, env }), timeoutMs: CLI_TIMEOUT_MS };
    }
    case "codex-cli": {
      const command = findOnPath("codex", env.PATH);
      if (!command) return null;
      const model = env.CODEX_CLI_MODEL?.trim() || undefined;
      return { backend, extractor: createCodexCliExtractor({ command, model, env }), timeoutMs: CLI_TIMEOUT_MS };
    }
  }
}
