import { existsSync, writeFileSync } from "node:fs";
import path from "node:path";
import { EventEmitter } from "node:events";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { spawnMock } = vi.hoisted(() => ({ spawnMock: vi.fn() }));
vi.mock("node:child_process", () => ({ spawn: spawnMock }));

import { createClaudeCliExtractor, createCodexCliExtractor } from "@/lib/cli-extractor";
import { resolveExtractorBackend } from "@/lib/extractor-backends";
import { analyzeNotice, type ModelOutput } from "@/lib/notice-extraction";

// Fictional notice variant (different amounts from the demo fixture).
const NOTICE = `SAMPLE DOCUMENT — FICTIONAL / NOT A REAL INSURANCE NOTICE
Pacific Community Home Insurance (fictional)
Renewal effective date: January 1, 2027
Prior annual homeowners insurance premium: $2,000.00
Renewal annual homeowners insurance premium: $2,600.00
Premium is paid directly by the policyholder, not through mortgage escrow.
`;

const modelOutput: ModelOutput = {
  documentType: "insurance_renewal",
  issuerName: "Pacific Community Home Insurance (fictional)",
  noticeDate: null,
  effectiveDate: "2027-01-01",
  previousAmount: 2000,
  newAmount: 2600,
  period: "annual",
  paymentMethod: "direct",
  evidence: [
    { field: "newAmount", quote: "Renewal annual homeowners insurance premium: $2,600.00", confidence: "high" },
    { field: "previousAmount", quote: "Your old premium was $2,000", confidence: "high" }, // invented
  ],
  uncertainties: [],
};

type Spawned = { command: string; args: string[]; opts: { cwd: string; shell?: boolean; env: NodeJS.ProcessEnv }; stdin: string; kill: ReturnType<typeof vi.fn> };

/** Scripted fake child process. `hang` never exits until killed. */
function scriptSpawn(script: { stdout?: string; code?: number; hang?: boolean; codexOutput?: string }): Spawned[] {
  const calls: Spawned[] = [];
  spawnMock.mockImplementation((command: string, args: string[], opts: Spawned["opts"]) => {
    const child = new EventEmitter() as EventEmitter & Record<string, unknown>;
    const stdout = new EventEmitter();
    const kill = vi.fn(() => {
      setImmediate(() => child.emit("close", null, "SIGKILL"));
      return true;
    });
    const call: Spawned = { command, args, opts, stdin: "", kill };
    calls.push(call);
    child.stdout = stdout;
    child.kill = kill;
    child.stdin = {
      on: () => undefined,
      end: (input: string) => {
        call.stdin = input;
        if (script.hang) return;
        setImmediate(() => {
          if (script.codexOutput !== undefined) writeFileSync(args[args.indexOf("-o") + 1]!, script.codexOutput);
          if (script.stdout) stdout.emit("data", Buffer.from(script.stdout));
          child.emit("close", script.code ?? 0, null);
        });
      },
    };
    return child;
  });
  return calls;
}

const claudeResult = (structured: unknown) =>
  JSON.stringify({ type: "result", subtype: "success", is_error: false, result: "", structured_output: structured });

const claude = createClaudeCliExtractor({ command: "/usr/local/bin/claude", model: "sonnet", env: { PATH: "/usr/bin", SECRET_TOKEN: "x" } });
const codex = createCodexCliExtractor({ command: "/usr/local/bin/codex", model: "gpt-test", env: { PATH: "/usr/bin" } });

beforeEach(() => spawnMock.mockReset());

describe("CLI extractor backends (child_process mocked)", () => {
  it("claude-cli: success goes through sanitizeModelOutput, and an invented evidence quote is dropped", async () => {
    const calls = scriptSpawn({ stdout: claudeResult(modelOutput) });
    const r = await analyzeNotice(NOTICE, { extractor: claude });
    expect(r.status).toBe("ok");
    if (r.status !== "ok") return;
    expect(r.extraction.extractionMode).toBe("ai");
    expect(r.extraction.newAmount).toBe(2600);
    expect(r.extraction.evidence.map((e) => e.field)).toEqual(["newAmount"]);
    expect(r.extraction.uncertainties.some((u) => u.includes("previousAmount") && u.includes("removed"))).toBe(true);

    const [call] = calls;
    expect(call!.command).toBe("/usr/local/bin/claude");
    expect(call!.args).toEqual(expect.arrayContaining(["-p", "--output-format", "json", "--json-schema", "--model", "sonnet"]));
    expect(call!.args[call!.args.indexOf("--tools") + 1]).toBe("");
    expect(call!.opts.shell).toBe(false);
    expect(call!.opts.env).toEqual({ PATH: "/usr/bin" }); // unrelated secrets are not passed through
  });

  it("codex-cli: reads the -o file, validates it, and uses the read-only sandbox", async () => {
    const calls = scriptSpawn({ codexOutput: JSON.stringify(modelOutput) });
    const r = await analyzeNotice(NOTICE, { extractor: codex });
    expect(r).toMatchObject({ status: "ok", extraction: { extractionMode: "ai", previousAmount: 2000, newAmount: 2600 } });
    const args = calls[0]!.args;
    expect(args[0]).toBe("exec");
    expect(args).toEqual(expect.arrayContaining(["--ephemeral", "--skip-git-repo-check", "--output-schema", "-o", "-m", "gpt-test"]));
    expect(args[args.indexOf("-s") + 1]).toBe("read-only");
    expect(args).toEqual(expect.arrayContaining(["--disable", "shell_tool"]));
    expect(args.at(-1)).toBe("-");
  });

  it.each([
    ["claude-cli", claude, { stdout: claudeResult(modelOutput) }],
    ["codex-cli", codex, { codexOutput: JSON.stringify(modelOutput) }],
  ] as const)("%s: notice text goes on stdin, never in argv, and the temp dir is deleted", async (_name, extractor, script) => {
    const calls = scriptSpawn(script);
    await analyzeNotice(NOTICE, { extractor });
    const { args, stdin, opts } = calls[0]!;
    const argv = args.join("\n");
    for (const line of NOTICE.trim().split("\n")) expect(argv).not.toContain(line);
    expect(argv).not.toContain("$2,600.00");
    expect(stdin).toContain("Renewal annual homeowners insurance premium: $2,600.00");
    expect(path.basename(path.dirname(opts.cwd))).toMatch(/^homestay-extract-/);
    expect(existsSync(path.dirname(opts.cwd))).toBe(false);
  });

  it("non-zero exit becomes a retryable error", async () => {
    scriptSpawn({ stdout: claudeResult(modelOutput), code: 1 });
    const r = await analyzeNotice(NOTICE, { extractor: claude });
    expect(r).toMatchObject({ status: "error" });
    if (r.status === "error") expect(r.reason).toMatch(/failed/);
  });

  it("timeout kills the process with SIGKILL and cleans up", async () => {
    const calls = scriptSpawn({ hang: true });
    const r = await analyzeNotice(NOTICE, { extractor: codex, timeoutMs: 20 });
    expect(r).toMatchObject({ status: "error" });
    if (r.status === "error") expect(r.reason).toMatch(/timed out/);
    expect(calls[0]!.kill).toHaveBeenCalledWith("SIGKILL");
    expect(existsSync(path.dirname(calls[0]!.opts.cwd))).toBe(false);
  });

  it("the extractor's own hard timeout kills the process even without an abort", async () => {
    const calls = scriptSpawn({ hang: true });
    const fast = createClaudeCliExtractor({ command: "claude", timeoutMs: 20, env: {} });
    await expect(fast(NOTICE, new AbortController().signal)).rejects.toThrow(/timed out/);
    expect(calls[0]!.kill).toHaveBeenCalledWith("SIGKILL");
  });

  it.each([
    ["claude-cli stdout", claude, { stdout: "not json {" }],
    ["claude-cli schema", claude, { stdout: claudeResult({ documentType: "pizza" }) }],
    ["codex-cli output file", codex, { codexOutput: "{oops" }],
  ] as const)("malformed JSON (%s) becomes an error, not a crash", async (_name, extractor, script) => {
    scriptSpawn(script);
    expect(await analyzeNotice(NOTICE, { extractor })).toMatchObject({ status: "error" });
  });
});

describe("backend selection", () => {
  it("defaults to anthropic only when a key is set", () => {
    expect(resolveExtractorBackend({ ANTHROPIC_API_KEY: "k" })).toBe("anthropic");
    expect(resolveExtractorBackend({})).toBeNull();
    expect(resolveExtractorBackend({ EXTRACTOR: "none", ANTHROPIC_API_KEY: "k" })).toBeNull();
    expect(resolveExtractorBackend({ EXTRACTOR: "bogus", ANTHROPIC_API_KEY: "k" })).toBeNull();
  });

  it("CLI backends need an explicit EXTRACTOR and a local server", () => {
    expect(resolveExtractorBackend({ EXTRACTOR: "claude-cli", NODE_ENV: "development" })).toBe("claude-cli");
    expect(resolveExtractorBackend({ EXTRACTOR: "codex-cli", NODE_ENV: "production" })).toBeNull();
    expect(resolveExtractorBackend({ EXTRACTOR: "codex-cli", NODE_ENV: "production", ALLOW_LOCAL_CLI_EXTRACTOR: "1" })).toBe("codex-cli");
  });
});
