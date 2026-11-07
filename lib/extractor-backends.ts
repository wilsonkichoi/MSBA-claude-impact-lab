/**
 * Which AI extraction backend is active, and how to describe it to the user.
 * Pure and client-safe: no Node imports, no secrets. The server passes in
 * process.env; the browser only ever sees the backend id and its label.
 */

export type ExtractorBackend = "anthropic" | "claude-cli" | "codex-cli";

/** Shown in the consent checkbox so the user knows where their text goes. */
export const BACKEND_CONSENT_TEXT: Record<ExtractorBackend, string> = {
  anthropic: "Send this text to Anthropic (Claude API) to extract the values.",
  "claude-cli": "Send this text to Anthropic via your local Claude Code CLI to extract the values.",
  "codex-cli": "Send this text to OpenAI via your local Codex CLI to extract the values.",
};

type Env = Record<string, string | undefined>;

/** True when local CLI backends may run: a dev server, or an explicit opt-in. */
export function localCliAllowed(env: Env): boolean {
  return env.NODE_ENV !== "production" || env.ALLOW_LOCAL_CLI_EXTRACTOR?.trim() === "1";
}

/**
 * EXTRACTOR selects the backend. Fails closed: unknown values, a missing key,
 * or a CLI backend outside local use all mean "no AI".
 *  - unset/empty → "anthropic" when ANTHROPIC_API_KEY is set, else none
 *  - "anthropic" → needs ANTHROPIC_API_KEY
 *  - "claude-cli" / "codex-cli" → only when set explicitly AND localCliAllowed()
 *  - "none" → none
 */
export function resolveExtractorBackend(env: Env): ExtractorBackend | null {
  const choice = env.EXTRACTOR?.trim().toLowerCase() ?? "";
  const hasKey = Boolean(env.ANTHROPIC_API_KEY?.trim());
  switch (choice) {
    case "":
    case "anthropic":
      return hasKey ? "anthropic" : null;
    case "claude-cli":
    case "codex-cli":
      return localCliAllowed(env) ? choice : null;
    default:
      return null;
  }
}
