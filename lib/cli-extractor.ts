/**
 * SERVER ONLY. Local-development extractor backends that call the Claude Code
 * CLI (`claude -p`) or the Codex CLI (`codex exec`) instead of an API key.
 *
 * Safety rules enforced here:
 *  - spawn() with an argument array and shell: false. Never a shell string.
 *  - The notice text goes to the child on stdin only, never in argv.
 *  - Each run gets a fresh temp directory (empty working dir), deleted afterward.
 *  - Tools are disabled and Codex runs in its read-only sandbox.
 *  - Hard timeout and abort both SIGKILL the child. Stdout is size-capped.
 *  - The child gets a minimal allowlisted environment.
 *  - Nothing here logs the notice, the prompt, or CLI output. Errors carry
 *    only generic reasons (exit code, timeout, size).
 *
 * Both backends return raw JSON; analyzeNotice() runs it through
 * sanitizeModelOutput() exactly like the Anthropic SDK backend.
 */
import { spawn } from "node:child_process";
import { accessSync, constants, statSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { z } from "zod";
import { EXTRACTION_SYSTEM_PROMPT, modelOutputSchema, type ModelExtractor } from "./notice-extraction";

/** Time budget for a CLI extraction (CLIs start slower than a direct API call). */
export const CLI_TIMEOUT_MS = 90_000;
/** Backstop: the child is killed this long after CLI_TIMEOUT_MS even if no abort arrives. */
const HARD_KILL_GRACE_MS = 5_000;
export const MAX_CLI_OUTPUT_BYTES = 1_000_000;

export class CliExtractorError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = "CliExtractorError";
  }
}

/** JSON Schema for the model output, generated from the Zod schema (single source of truth). */
export function modelOutputJsonSchema(): Record<string, unknown> {
  const schema: Record<string, unknown> = { ...z.toJSONSchema(modelOutputSchema) };
  delete schema.$schema;
  return schema;
}

function noticeMessage(text: string): string {
  return `<notice>\n${text}\n</notice>`;
}

/* --------------------------------- process -------------------------------- */

const BASE_ENV_KEYS = [
  "PATH",
  "HOME",
  "USER",
  "LOGNAME",
  "LANG",
  "LC_ALL",
  "LC_CTYPE",
  "TMPDIR",
  "HTTPS_PROXY",
  "HTTP_PROXY",
  "NO_PROXY",
  "https_proxy",
  "http_proxy",
  "no_proxy",
  "NODE_EXTRA_CA_CERTS",
  "SSL_CERT_FILE",
  "SSL_CERT_DIR",
];

/** Minimal environment: OS basics plus the backend's own auth/config variables. */
type Env = Record<string, string | undefined>;

export function childEnv(source: Env, prefixes: readonly string[]): Env {
  const env: Env = {};
  for (const [k, v] of Object.entries(source)) {
    if (v === undefined) continue;
    if (BASE_ENV_KEYS.includes(k) || prefixes.some((p) => k.startsWith(p))) env[k] = v;
  }
  return env;
}

type RunOptions = {
  command: string;
  args: string[];
  input: string;
  cwd: string;
  env: Env;
  timeoutMs: number;
  signal: AbortSignal;
};

/** Runs a CLI with stdin input and returns its stdout. Rejects on non-zero exit, timeout, abort, or oversize output. */
export function runCli(o: RunOptions): Promise<string> {
  return new Promise((resolve, reject) => {
    if (o.signal.aborted) return reject(new CliExtractorError("aborted before start"));

    const child = spawn(o.command, o.args, {
      cwd: o.cwd,
      env: o.env as NodeJS.ProcessEnv,
      shell: false,
      windowsHide: true,
      // stderr is discarded rather than buffered: it may echo the prompt.
      stdio: ["pipe", "pipe", "ignore"],
    });

    const chunks: Buffer[] = [];
    let size = 0;
    let settled = false;

    const finish = (err: Error | null, out?: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      o.signal.removeEventListener("abort", onAbort);
      if (err) reject(err);
      else resolve(out ?? "");
    };
    const killWith = (reason: string) => {
      try {
        child.kill("SIGKILL");
      } catch {
        // already exited
      }
      finish(new CliExtractorError(reason));
    };
    const onAbort = () => killWith("aborted");
    const timer = setTimeout(() => killWith("timed out"), o.timeoutMs);
    o.signal.addEventListener("abort", onAbort, { once: true });

    child.on("error", () => finish(new CliExtractorError("could not start the CLI")));
    child.stdout?.on("data", (b: Buffer) => {
      size += b.length;
      if (size > MAX_CLI_OUTPUT_BYTES) return killWith("output too large");
      chunks.push(b);
    });
    child.on("close", (code, sig) => {
      if (code === 0) finish(null, Buffer.concat(chunks).toString("utf8"));
      else finish(new CliExtractorError(`CLI exited with ${code !== null ? `code ${code}` : `signal ${sig ?? "unknown"}`}`));
    });

    child.stdin?.on("error", () => {
      // EPIPE if the child exits early; the close handler reports the failure.
    });
    child.stdin?.end(o.input, "utf8");
  });
}

/** Fresh private temp dir with an empty `work/` (child cwd) and an `io/` dir for schema/output files. Always deleted. */
async function withTempWorkspace<T>(fn: (dirs: { work: string; io: string }) => Promise<T>): Promise<T> {
  const root = await mkdtemp(path.join(os.tmpdir(), "homestay-extract-"));
  try {
    const work = path.join(root, "work");
    const io = path.join(root, "io");
    await mkdir(work, { mode: 0o700 });
    await mkdir(io, { mode: 0o700 });
    return await fn({ work, io });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

/** Absolute path of an executable on PATH, or null. No process is spawned. */
export function findOnPath(name: string, pathVar: string | undefined): string | null {
  for (const dir of (pathVar ?? "").split(path.delimiter)) {
    if (!dir) continue;
    const candidate = path.join(dir, name);
    try {
      accessSync(candidate, constants.X_OK);
      if (statSync(candidate).isFile()) return candidate;
    } catch {
      // not here
    }
  }
  return null;
}

/**
 * Optional override so another feature (Pencil's program re-check) can reuse these
 * backends with its own prompt and output schema. Omitted → HomeStay's notice task.
 */
export type ExtractionTask = {
  systemPrompt: string;
  jsonSchema: Record<string, unknown>;
  /** Wraps the untrusted text in tags for the model. */
  wrap: (text: string) => string;
};

function noticeTask(): ExtractionTask {
  return { systemPrompt: EXTRACTION_SYSTEM_PROMPT, jsonSchema: modelOutputJsonSchema(), wrap: noticeMessage };
}

type CliExtractorOptions = {
  /** Prompt and schema; defaults to HomeStay's notice extraction. */
  task?: ExtractionTask;
  /** Executable path (resolved from PATH by the caller). */
  command: string;
  model?: string;
  /** Hard kill deadline. Defaults to CLI_TIMEOUT_MS plus a short grace period. */
  timeoutMs?: number;
  env?: Env;
};

/* ------------------------------- Claude Code ------------------------------ */

const claudeResultSchema = z.object({
  type: z.literal("result"),
  is_error: z.boolean().optional(),
  subtype: z.string().optional(),
  structured_output: z.unknown().optional(),
});

/** `claude -p --output-format json` prints one result object; --json-schema output is in `structured_output`. */
export function parseClaudeCliOutput(stdout: string): unknown {
  const parsed: unknown = JSON.parse(stdout);
  const candidate = Array.isArray(parsed) ? parsed.findLast((m) => (m as { type?: unknown })?.type === "result") : parsed;
  const result = claudeResultSchema.parse(candidate);
  if (result.is_error || (result.subtype && result.subtype !== "success")) throw new CliExtractorError("Claude CLI reported an error");
  if (result.structured_output === undefined || result.structured_output === null) {
    throw new CliExtractorError("Claude CLI returned no structured output");
  }
  return result.structured_output;
}

export function claudeCliArgs(model?: string, task: ExtractionTask = noticeTask()): string[] {
  const args = [
    "-p",
    "--output-format",
    "json",
    "--json-schema",
    JSON.stringify(task.jsonSchema),
    "--system-prompt",
    task.systemPrompt,
    // No built-in tools, no MCP servers, no user customizations (CLAUDE.md, hooks, plugins, skills).
    "--tools",
    "",
    "--strict-mcp-config",
    "--safe-mode",
    "--disable-slash-commands",
    "--permission-mode",
    "dontAsk",
    "--no-session-persistence",
  ];
  if (model) args.push("--model", model);
  return args;
}

export function createClaudeCliExtractor(opts: CliExtractorOptions): ModelExtractor {
  const task = opts.task ?? noticeTask();
  const args = claudeCliArgs(opts.model, task);
  return (text, signal) =>
    withTempWorkspace(async ({ work }) => {
      const stdout = await runCli({
        command: opts.command,
        args,
        input: task.wrap(text),
        cwd: work,
        env: childEnv(opts.env ?? process.env, ["ANTHROPIC_", "CLAUDE_"]),
        timeoutMs: opts.timeoutMs ?? CLI_TIMEOUT_MS + HARD_KILL_GRACE_MS,
        signal,
      });
      return parseClaudeCliOutput(stdout);
    });
}

/* ---------------------------------- Codex --------------------------------- */

/** Codex features that expose tools; all disabled for extraction. */
const CODEX_DISABLED_FEATURES = [
  "shell_tool",
  "unified_exec",
  "apps",
  "plugins",
  "multi_agent",
  "image_generation",
  "browser_use",
  "computer_use",
  "view_image",
  "hooks",
];

export function codexCliArgs(dirs: { work: string; schemaPath: string; outputPath: string }, model?: string): string[] {
  const args = [
    "exec",
    "--skip-git-repo-check",
    "--ephemeral",
    // Skip ~/.codex/config.toml (MCP servers, profiles) and execpolicy rules; auth still comes from CODEX_HOME.
    "--ignore-user-config",
    "--ignore-rules",
    "-s",
    "read-only",
    "-C",
    dirs.work,
    "-c",
    'approval_policy="never"',
    "-c",
    'web_search="disabled"',
    ...CODEX_DISABLED_FEATURES.flatMap((f) => ["--disable", f]),
    "--color",
    "never",
    "--output-schema",
    dirs.schemaPath,
    "-o",
    dirs.outputPath,
  ];
  if (model) args.push("-m", model);
  args.push("-"); // read the prompt from stdin
  return args;
}

export function createCodexCliExtractor(opts: CliExtractorOptions): ModelExtractor {
  const task = opts.task ?? noticeTask();
  return (text, signal) =>
    withTempWorkspace(async ({ work, io }) => {
      const schemaPath = path.join(io, "output-schema.json");
      const outputPath = path.join(io, "last-message.json");
      await writeFile(schemaPath, JSON.stringify(task.jsonSchema), { mode: 0o600 });

      await runCli({
        command: opts.command,
        args: codexCliArgs({ work, schemaPath, outputPath }, opts.model),
        // Codex has no separate system prompt flag, so instructions and the notice both go on stdin.
        input: `${task.systemPrompt}\n\n${task.wrap(text)}`,
        cwd: work,
        env: childEnv(opts.env ?? process.env, ["OPENAI_", "CODEX_"]),
        timeoutMs: opts.timeoutMs ?? CLI_TIMEOUT_MS + HARD_KILL_GRACE_MS,
        signal,
      });

      const info = await stat(outputPath).catch(() => null);
      if (!info) throw new CliExtractorError("Codex CLI wrote no output");
      if (info.size > MAX_CLI_OUTPUT_BYTES) throw new CliExtractorError("output too large");
      return JSON.parse(await readFile(outputPath, "utf8")) as unknown;
    });
}
